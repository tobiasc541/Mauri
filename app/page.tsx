"use client";

import { FormEvent, useRef, useState } from "react";

type TipoContacto = "dueno" | "vendedor" | "";

type ApiResult = { ok?: boolean; error?: string };

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L8.3 11a16 16 0 0 0 4.7 4.7l1.5-1.7a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z"/></svg>;
}
function UserIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>;
}
function ArrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;
}

export default function Home() {
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoContacto>("");
  const [sitio, setSitio] = useState(""); // Campo trampa invisible para bots.
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<"exito" | "error" | null>(null);
  const [detalleError, setDetalleError] = useState("");
  const [registradosSesion, setRegistradosSesion] = useState(0);
  const telefonoRef = useRef<HTMLInputElement>(null);

  async function guardarContacto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guardando) return;
    setMensaje(null);
    setDetalleError("");

    const telefonoLimpio = telefono.replace(/\D/g, "");
    if (telefonoLimpio.length < 7 || telefonoLimpio.length > 15) {
      setMensaje("error");
      setDetalleError("Ingresá un teléfono válido con código de área (entre 7 y 15 dígitos).");
      telefonoRef.current?.focus();
      return;
    }
    if (nombre.trim().length < 2 || !tipo) {
      setMensaje("error");
      setDetalleError("Completá el nombre y elegí si es dueño o vendedor.");
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch("/api/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, nombre, tipo, sitio }),
      });
      const body: ApiResult = await response.json().catch(() => ({}));
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "No se pudo guardar el contacto. Probá nuevamente.");
      }
      setTelefono("");
      setNombre("");
      setTipo("");
      setSitio("");
      setRegistradosSesion((count) => count + 1);
      setMensaje("exito");
      telefonoRef.current?.focus();
    } catch (error) {
      setMensaje("error");
      setDetalleError(error instanceof Error ? error.message : "Error inesperado. Intentá nuevamente.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="page">
      <div className="ambient ambient-left" aria-hidden="true"/>
      <div className="ambient ambient-right" aria-hidden="true"/>
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-logo" aria-hidden="true">SV<span>.</span></div>
            <div className="brand-text"><strong>Sistema de Vendedores</strong><span>Gestión de contactos</span></div>
          </div>
          <div className="top-status"><span className="status-dot"/> Registro de contactos</div>
        </header>
        <div className="ticker" aria-hidden="true"><div>{Array.from({ length: 2 }).flatMap((_, n) => ["Registro de contactos", "Mauri", "Dueños y vendedores", "Seguimiento comercial", "Cada contacto cuenta"].map((t, i) => <b key={`${n}-${i}`} className={i % 2 ? "g" : ""}>✦ {t}</b>))}</div></div>

        <div className="layout">
          <section className="intro" aria-labelledby="intro-title">
            <div className="eyebrow"><span className="eyebrow-line"/> ORGANIZACIÓN COMERCIAL</div>
            <h1 id="intro-title">Cada contacto<br/>es una nueva <span>oportunidad.</span></h1>
            <p className="intro-description">Una forma simple de registrar a las personas que atendiste y construir una base organizada para el seguimiento comercial.</p>
            <div className="intro-feature"><span className="feature-icon"><CheckIcon/></span><div><strong>Rápido y sin complicaciones</strong><p>Solo tres datos para guardar un contacto.</p></div></div>
            <div className="intro-feature"><span className="feature-icon"><CheckIcon/></span><div><strong>Todo en un solo lugar</strong><p>Se guarda de manera segura en Supabase.</p></div></div>
            <div className="session-counter"><span className="counter-number">{registradosSesion.toString().padStart(2, "0")}</span><div><strong>Contactos guardados</strong><span>Durante esta sesión en este dispositivo</span></div></div>
          </section>

          <section className="form-card" aria-labelledby="form-title">
            <div className="card-top"><span className="card-kicker">NUEVO REGISTRO</span><span className="card-number">01 / 01</span></div>
            <h2 id="form-title">Agregar contacto</h2>
            <p className="card-description">Completá los datos de la persona que atendió.</p>

            {mensaje === "exito" && <div className="alert success" role="status"><span><CheckIcon/></span><div><strong>¡Contacto guardado!</strong><p>Ya quedó registrado. Podés cargar otro.</p></div></div>}
            {mensaje === "error" && <div className="alert error" role="alert"><span>!</span><div><strong>No se pudo guardar</strong><p>{detalleError}</p></div></div>}

            <form onSubmit={guardarContacto} className="form" noValidate>
              <div className="field"><label htmlFor="telefono">Número de teléfono <span>*</span></label><div className="input-wrap"><span className="input-icon"><PhoneIcon/></span><input ref={telefonoRef} id="telefono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="Ej. 11 2345-6789" maxLength={26} value={telefono} onChange={(event) => setTelefono(event.target.value)} required disabled={guardando}/></div><p className="hint">Ingresá el número con código de área.</p></div>
              <div className="field"><label htmlFor="nombre">Nombre de quien atendió <span>*</span></label><div className="input-wrap"><span className="input-icon"><UserIcon/></span><input id="nombre" name="nombre" autoComplete="name" type="text" placeholder="Ej. Juan Pérez" maxLength={110} value={nombre} onChange={(event) => setNombre(event.target.value)} required disabled={guardando}/></div></div>
              <fieldset className="role-group" disabled={guardando}><legend>¿Es dueño o vendedor? <span>*</span></legend><div className="role-options"><label className={`role-option ${tipo === "dueno" ? "selected" : ""}`}><input type="radio" name="tipo" value="dueno" checked={tipo === "dueno"} onChange={() => setTipo("dueno")} required/><span className="role-symbol">D</span><span className="role-label">Dueño</span><span className="role-radio"/></label><label className={`role-option ${tipo === "vendedor" ? "selected" : ""}`}><input type="radio" name="tipo" value="vendedor" checked={tipo === "vendedor"} onChange={() => setTipo("vendedor")} required/><span className="role-symbol">V</span><span className="role-label">Vendedor</span><span className="role-radio"/></label></div></fieldset>
              <div className="honeypot" aria-hidden="true"><label htmlFor="sitio">Dejá este campo vacío</label><input type="text" name="sitio" id="sitio" autoComplete="off" tabIndex={-1} value={sitio} onChange={(event) => setSitio(event.target.value)}/></div>
              <button className="submit-button" type="submit" disabled={guardando}>{guardando ? "Guardando contacto…" : "Guardar contacto"}<span>{guardando ? <span className="spinner"/> : <ArrowIcon/>}</span></button>
            </form>
            <div className="card-footer"><span className="footer-secure">●</span> Registro privado: la lista completa no se muestra aquí.</div>
          </section>
        </div>
        <footer className="page-footer"><span>© {new Date().getFullYear()} · Sistema de Vendedores</span><span>Registrá únicamente contactos obtenidos de forma legítima.</span></footer>
      </div>
    </main>
  );
}
