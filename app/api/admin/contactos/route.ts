import { NextRequest, NextResponse } from "next/server";
import { esAdmin } from "@/lib/admin-auth";
import { leerFiltros, type Filtros } from "@/lib/filtros";
import { supabaseServidor } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status: number) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
}

export async function GET(req: NextRequest) {
  if (!(await esAdmin())) return json({ error: "Acceso privado." }, 401);
  const db = supabaseServidor();
  if (!db) return json({ error: "Falta conectar Supabase en Vercel." }, 503);

  let filtros: Filtros;
  try { filtros = leerFiltros(req.nextUrl.searchParams); }
  catch (e) { return json({ error: (e as Error).message }, 400); }

  const paginaParam = Number(req.nextUrl.searchParams.get("pagina") || "1");
  if (!Number.isSafeInteger(paginaParam) || paginaParam < 1 || paginaParam > 1000000) {
    return json({ error: "Página inválida." }, 400);
  }
  const tamano = 50;
  const desdeFila = (paginaParam - 1) * tamano;
  const hastaFila = desdeFila + tamano - 1;

  let listado = db.from("contactos_vendedores")
    .select("id,nombre,telefono,tipo,creado_en,actualizado_en,veces_registrado", { count: "exact" })
    .order("creado_en", { ascending: false })
    .order("id", { ascending: false })
    .range(desdeFila, hastaFila);
  let totalFiltrado = db.from("contactos_vendedores").select("id", { count: "exact", head: true });
  let duenos = db.from("contactos_vendedores").select("id", { count: "exact", head: true }).eq("tipo", "dueno");
  let vendedores = db.from("contactos_vendedores").select("id", { count: "exact", head: true }).eq("tipo", "vendedor");

  if (filtros.utcDesde) {
    listado = listado.gte("creado_en", filtros.utcDesde);
    totalFiltrado = totalFiltrado.gte("creado_en", filtros.utcDesde);
    duenos = duenos.gte("creado_en", filtros.utcDesde);
    vendedores = vendedores.gte("creado_en", filtros.utcDesde);
  }
  if (filtros.utcHastaExclusiva) {
    listado = listado.lt("creado_en", filtros.utcHastaExclusiva);
    totalFiltrado = totalFiltrado.lt("creado_en", filtros.utcHastaExclusiva);
    duenos = duenos.lt("creado_en", filtros.utcHastaExclusiva);
    vendedores = vendedores.lt("creado_en", filtros.utcHastaExclusiva);
  }

  try {
    const [registros, total, due, ven, historico] = await Promise.all([
      listado,
      totalFiltrado,
      duenos,
      vendedores,
      db.from("contactos_vendedores").select("id", { count: "exact", head: true }),
    ]);
    const error = registros.error || total.error || due.error || ven.error || historico.error;
    if (error) {
      console.error("Error leyendo panel Mauri:", error.message);
      return json({ error: "No se pudieron consultar los contactos." }, 500);
    }
    return json({
      registros: registros.data || [],
      pagina: paginaParam,
      porPagina: tamano,
      cantidadPeriodo: total.count ?? 0,
      totalHistorico: historico.count ?? 0,
      duenos: due.count ?? 0,
      vendedores: ven.count ?? 0,
    }, 200);
  } catch (err) {
    console.error("Error consultando registros Mauri:", err);
    return json({ error: "Error de conexión." }, 500);
  }
}
