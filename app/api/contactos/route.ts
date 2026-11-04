import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function respuesta(body: { ok: boolean; error?: string }, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  // Evita que sitios de terceros envíen el formulario desde otros orígenes.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return respuesta({ ok: false, error: "Solicitud no autorizada." }, 403);
      }
    } catch {
      return respuesta({ ok: false, error: "Solicitud no autorizada." }, 403);
    }
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return respuesta({ ok: false, error: "Formato de solicitud inválido." }, 415);
  }
  if (Number(request.headers.get("content-length") || 0) > 2048) {
    return respuesta({ ok: false, error: "La solicitud es demasiado grande." }, 413);
  }

  let payload: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return respuesta({ ok: false, error: "La solicitud es demasiado grande." }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid payload");
    payload = parsed as Record<string, unknown>;
  } catch {
    return respuesta({ ok: false, error: "Completá el formulario nuevamente." }, 400);
  }

  // Campo trampa: aceptamos sin registrar para no ayudar al bot a adaptarse.
  if (typeof payload.sitio === "string" && payload.sitio.trim()) {
    return respuesta({ ok: true }, 200);
  }

  const nombre = typeof payload.nombre === "string" ? payload.nombre.trim().replace(/\s+/g, " ") : "";
  const telefono = typeof payload.telefono === "string" ? payload.telefono.replace(/\D/g, "") : "";
  const tipo = payload.tipo;
  if (nombre.length < 2 || nombre.length > 100 || !/^[0-9]{7,15}$/.test(telefono) || (tipo !== "dueno" && tipo !== "vendedor")) {
    return respuesta({ ok: false, error: "Revisá el teléfono, el nombre y el tipo de contacto." }, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const salt = process.env.IP_HASH_SECRET;
  if (!supabaseUrl || !secretKey || !salt || salt.length < 24) {
    console.error("Faltan variables de entorno seguras para registrar contactos.");
    return respuesta({ ok: false, error: "Sistema pendiente de configurar. Avisá al administrador." }, 503);
  }

  try {
    // Vercel entrega la IP del solicitante vía proxy. No se persiste la IP original.
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip";
    const fingerprint = createHmac("sha256", salt).update(ip).digest("hex");
    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await admin.rpc("registrar_contacto", {
      p_nombre: nombre,
      p_telefono: telefono,
      p_tipo: tipo,
      p_fingerprint: fingerprint,
    });
    if (error) {
      if (error.message.includes("LIMIT_CONTACTOS")) {
        return respuesta({ ok: false, error: "Demasiados registros seguidos. Probá en un minuto." }, 429);
      }
      console.error("Error al guardar en Supabase:", error.code, error.message);
      return respuesta({ ok: false, error: "No se pudo guardar. Intentá nuevamente." }, 500);
    }
    return respuesta({ ok: true }, 200);
  } catch (error) {
    console.error("Error inesperado en /api/contactos:", error instanceof Error ? error.message : error);
    return respuesta({ ok: false, error: "Error de conexión. Intentá nuevamente." }, 500);
  }
}
