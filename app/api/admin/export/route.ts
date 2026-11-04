import { NextRequest } from "next/server";
import { esAdmin } from "@/lib/admin-auth";
import { leerFiltros, rangoDescripcion } from "@/lib/filtros";
import { generarPdfContactos, type FilaPdf } from "@/lib/pdf-simple";
import { supabaseServidor } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contacto = { nombre: string; telefono: string; tipo: string; creado_en: string };
const BLOQUE = 700;

function error(mensaje: string, status: number) {
  return new Response(JSON.stringify({ error: mensaje }), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}
function celdaCSV(value: string) {
  let s = String(value).replace(/[\r\n\t]/g, " ").trim();
  // Evitar inyección de fórmulas en hojas de cálculo.
  if (/^[=+@\-]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
function fechaArgentina(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(d) : "Sin fecha";
}

export async function GET(req: NextRequest) {
  if (!(await esAdmin())) return error("No autorizado.", 401);
  const db = supabaseServidor();
  if (!db) return error("Conectá Supabase primero.", 503);
  const formato = req.nextUrl.searchParams.get("formato") || "csv";
  if (formato !== "csv" && formato !== "pdf") return error("Formato inválido.", 400);
  let filtros;
  try { filtros = leerFiltros(req.nextUrl.searchParams); }
  catch (e) { return error((e as Error).message, 400); }

  const etiqueta = rangoDescripcion(filtros);
  const archivo = `mauri_contactos_${(filtros.desde || "todos")}${filtros.hasta && filtros.hasta !== filtros.desde ? `_a_${filtros.hasta}` : ""}`;
  async function cargar(limiteInicial: number): Promise<Contacto[]> {
    let consulta = db!.from("contactos_vendedores")
      .select("nombre,telefono,tipo,creado_en")
      .order("creado_en", { ascending: false })
      .order("telefono", { ascending: true })
      .range(limiteInicial, limiteInicial + BLOQUE - 1);
    if (filtros.utcDesde) consulta = consulta.gte("creado_en", filtros.utcDesde);
    if (filtros.utcHastaExclusiva) consulta = consulta.lt("creado_en", filtros.utcHastaExclusiva);
    const { data, error: fallo } = await consulta;
    if (fallo) throw new Error(fallo.message);
    return (data || []) as Contacto[];
  }

  if (formato === "csv") {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode("\uFEFFNombre;Teléfono;Tipo;Fecha de carga (Argentina)\r\n"));
        try {
          let cursor = 0;
          while (true) {
            const rows = await cargar(cursor);
            const trozo = rows.map(x => [x.nombre, x.telefono, x.tipo === "dueno" ? "Dueño" : "Vendedor", fechaArgentina(x.creado_en)].map(celdaCSV).join(";")).join("\r\n");
            if (trozo) controller.enqueue(encoder.encode(trozo + "\r\n"));
            if (rows.length < BLOQUE) break;
            cursor += rows.length;
          }
          controller.close();
        } catch (e) {
          console.error("Error generando CSV:", e);
          controller.error(new Error("No se pudo exportar el CSV."));
        }
      },
    });
    return new Response(stream, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${archivo}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  }

  // PDF con varias páginas. Los rangos enormes deben exportarse a CSV para
  // evitar agotar la memoria y el tiempo de ejecución de funciones serverless.
  try {
    const registros: FilaPdf[] = [];
    let cursor = 0;
    while (true) {
      const rows = await cargar(cursor);
      if (registros.length + rows.length > 15000) {
        return error("Este período supera 15.000 registros. Usá CSV para descargar la lista completa.", 413);
      }
      for (const r of rows) registros.push({ numero: registros.length + 1, ...r, fecha: fechaArgentina(r.creado_en) });
      if (rows.length < BLOQUE) break;
      cursor += rows.length;
    }
    const buffer = generarPdfContactos(registros, etiqueta);
    return new Response(new Uint8Array(buffer), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${archivo}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (e) {
    console.error("Error generando PDF:", e);
    return error("No se pudo generar el PDF.", 500);
  }
}
