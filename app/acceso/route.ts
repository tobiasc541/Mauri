import { NextRequest, NextResponse } from "next/server";
import { activarSesion, enlaceAdminValido } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!enlaceAdminValido(token)) {
    return new NextResponse("Enlace privado inválido o no configurado.", {
      status: 403,
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  // Canjea el enlace por cookie HttpOnly y elimina el token de la URL visible.
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  activarSesion(res);
  return res;
}
