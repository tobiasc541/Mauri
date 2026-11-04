import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "mauri_admin_sesion";
const SESION_SEGUNDOS = 60 * 60 * 24 * 7;

function secreto() {
  const value = process.env.ADMIN_ACCESS_TOKEN;
  return value && value.length >= 40 ? value : null;
}

function mismoValor(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function enlaceAdminValido(token: string) {
  const key = secreto();
  return !!key && mismoValor(token, key);
}

function firma(vencimiento: string, key: string) {
  return createHmac("sha256", key).update(`mauri-admin-v1:${vencimiento}`).digest("hex");
}

export function activarSesion(respuesta: NextResponse) {
  const key = secreto();
  if (!key) throw new Error("Falta ADMIN_ACCESS_TOKEN");
  const vencimiento = String(Math.floor(Date.now() / 1000) + SESION_SEGUNDOS);
  respuesta.cookies.set(COOKIE_NAME, `${vencimiento}.${firma(vencimiento, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESION_SEGUNDOS,
  });
}

export async function esAdmin() {
  const key = secreto();
  if (!key) return false;
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const partes = raw.split(".");
  if (partes.length !== 2 || !/^\d{10}$/.test(partes[0]) || !/^[a-f0-9]{64}$/.test(partes[1])) return false;
  const vencimiento = Number(partes[0]);
  const ahora = Math.floor(Date.now() / 1000);
  if (vencimiento < ahora || vencimiento > ahora + SESION_SEGUNDOS) return false;
  return mismoValor(partes[1], firma(partes[0], key));
}

export function desactivarSesion(respuesta: NextResponse) {
  respuesta.cookies.delete(COOKIE_NAME);
}
