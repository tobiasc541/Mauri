"use client";

import { useEffect, useMemo, useState } from "react";

type Contacto = {
  id: string;
  nombre: string;
  telefono: string;
  tipo: "dueno" | "vendedor";
  creado_en: string;
  actualizado_en: string;
  veces_registrado: number;
};
type Datos = {
  registros: Contacto[];
  pagina: number;
  porPagina: number;
  cantidadPeriodo: number;
  totalHistorico: number;
  duenos: number;
  vendedores: number;
};
type Periodo = "hoy" | "ayer" | "semana" | "mes" | "todo" | "personalizado";

const zona = "America/Argentina/Buenos_Aires";
const fmtFecha = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: zona });
function fechaLocal(date = new Date()) {
  const parts = fmtFecha.formatToParts(date);
  const y = parts.find(x => x.type === "year")?.value || "";
  const m = parts.find(x => x.type === "month")?.value || "";
  const d = parts.find(x => x.type === "day")?.value || "";
  return `${y}-${m}-${d}`;
}
function fechaVisible(iso: string) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short", timeStyle: "short", timeZone: zona,
  }).format(date) : "Sin fecha";
}
function restarDias(date: string, dias: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - dias)).toISOString().slice(0, 10);
}

export default function PanelAdmin() {
  const [hoy] = useState(() => fechaLocal());
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState<"pdf" | "csv" | null>(null);
  const [errorExportacion, setErrorExportacion] = useState("");

  const rangoInvalido = !!desde && !!hasta && desde > hasta;
  const filtros = useMemo(() => {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    return params;
  }, [desde, hasta]);

  useEffect(() => {
    if (rangoInvalido) { setError("La fecha inicial no puede ser posterior a la final."); setCargando(false); return; }
    const controller = new AbortController();
    setCargando(true);
    setError("");
    const params = new URLSearchParams(filtros);
    params.set("pagina", String(pagina));
    fetch(`/api/admin/contactos?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Error consultando contactos.");
        return body as Datos;
      })
      .then(body => { if (!controller.signal.aborted) setDatos(body); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Error de conexión."); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [filtros, pagina, rangoInvalido]);

  function aplicarPeriodo(p: Periodo) {
    setPeriodo(p);
    setPagina(1);
    setErrorExportacion("");
    if (p === "hoy") { setDesde(hoy); setHasta(hoy); }
    if (p === "ayer") { const dia = restarDias(hoy, 1); setDesde(dia); setHasta(dia); }
    if (p === "semana") { setDesde(restarDias(hoy, 6)); setHasta(hoy); }
    if (p === "mes") { setDesde(hoy.slice(0, 7) + "-01"); setHasta(hoy); }
    if (p === "todo") { setDesde(""); setHasta(""); }
  }

  async function descargar(formato: "csv" | "pdf") {
    if (rangoInvalido) return;
    setExportando(formato);
    setErrorExportacion("");
    try {
      const params = new URLSearchParams(filtros);
      params.set("formato", formato);
      const respuesta = await fetch(`/api/admin/export?${params.toString()}`, { cache: "no-store" });
      if (!respuesta.ok) {
        const content = await respuesta.json().catch(() => ({}));
        throw new Error(content.error || "No se pudo generar el archivo.");
      }
      const archivo = await respuesta.blob();
      const link = document.createElement("a");
      const url = URL.createObjectURL(archivo);
      const disposition = respuesta.headers.get("content-disposition") || "";
      const nombreArchivo = disposition.match(/filename="([^"]+)"/)?.[1] || `mauri_contactos.${formato}`;
      link.href = url;
      link.download = nombreArchivo;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (err) {
      setErrorExportacion(err instanceof Error ? err.message : "Error exportando los contactos.");
    } finally {
      setExportando(null);
    }
  }

  const paginas = Math.max(1, Math.ceil((datos?.cantidadPeriodo || 0) / (datos?.porPagina || 50)));
  return (
    <main className="admin-main">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand"><span className="admin-brand-icon">M</span><span><strong>MAURI</strong><small>Sistema de vendedores</small></span></div>
          <div className="admin-header-right"><span className="admin-private"><i /> Área privada</span><a href="/" className="admin-link">Ir al formulario ↗</a></div>
        </div>
      </header>
      <div className="admin-container">
        <div className="admin-headline">
          <div><span className="admin-overline">CENTRAL DE CONTACTOS</span><h1>Panel de <em>administración</em></h1><p>Consultá quiénes fueron registrados, filtrá por fecha y descargá los números que necesitás contactar.</p></div>
          <div className="admin-head-icon" aria-hidden="true">▦</div>
        </div>

        <section className="admin-filters" aria-label="Filtros por fecha">
          <div className="admin-filter-heading"><strong>Filtrar contactos</strong><span>Horario de Argentina (UTC−3)</span></div>
          <div className="admin-presets">
            {([ ["hoy", "Hoy"], ["ayer", "Ayer"], ["semana", "Últimos 7 días"], ["mes", "Este mes"], ["todo", "Todos"], ["personalizado", "Personalizado"] ] as const).map(([value, title]) => (
              <button type="button" className={`admin-pill ${periodo === value ? "active" : ""}`} key={value} onClick={() => aplicarPeriodo(value)}>{title}</button>
            ))}
          </div>
          <div className="admin-dates"><label>Desde<input aria-label="Fecha desde" type="date" value={desde} onChange={e => { setDesde(e.target.value); setPeriodo("personalizado"); setPagina(1); }} /></label><label>Hasta<input aria-label="Fecha hasta" type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPeriodo("personalizado"); setPagina(1); }} /></label></div>
          <p className="admin-filter-tip">El filtro usa la primera fecha en que se registró cada número. Si se vuelve a cargar, se actualiza el contacto sin duplicarlo.</p>
        </section>

        <section className="admin-metrics" aria-label="Estadísticas">
          <article className="admin-metric primary"><span>Contactos en el período</span><strong>{cargando ? "· · ·" : (datos?.cantidadPeriodo ?? 0).toLocaleString("es-AR")}</strong><small>Coinciden con el filtro seleccionado</small></article>
          <article className="admin-metric"><span>En toda la base</span><strong>{cargando ? "· · ·" : (datos?.totalHistorico ?? 0).toLocaleString("es-AR")}</strong><small>Teléfonos únicos registrados</small></article>
          <article className="admin-metric"><span>Dueños</span><strong>{cargando ? "· · ·" : (datos?.duenos ?? 0).toLocaleString("es-AR")}</strong><small>Del período seleccionado</small></article>
          <article className="admin-metric"><span>Vendedores</span><strong>{cargando ? "· · ·" : (datos?.vendedores ?? 0).toLocaleString("es-AR")}</strong><small>Del período seleccionado</small></article>
        </section>

        <section className="admin-list">
          <div className="admin-list-head">
            <div><h2>Contactos registrados</h2><p>Los archivos exportados respetan el período seleccionado y contienen todos los resultados, no solo esta página.</p></div>
            <div className="admin-export-actions">
              <button onClick={() => descargar("csv")} disabled={!!exportando || cargando || rangoInvalido} className="admin-export primary">{exportando === "csv" ? "Preparando..." : "↓ Exportar CSV"}</button>
              <button onClick={() => descargar("pdf")} disabled={!!exportando || cargando || rangoInvalido} className="admin-export">{exportando === "pdf" ? "Preparando..." : "↓ Descargar PDF"}</button>
            </div>
          </div>
          {error && <p className="admin-message error" role="alert">{error}</p>}
          {errorExportacion && <p className="admin-message error" role="alert">{errorExportacion}</p>}
          {cargando ? <div className="admin-empty">Consultando los contactos...</div> : datos?.registros.length ? (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nombre</th><th>Teléfono</th><th>Tipo</th><th>Fecha de carga</th><th>Veces registrado</th></tr></thead><tbody>{datos.registros.map(r => <tr key={r.id}><td><strong>{r.nombre}</strong></td><td><a className="admin-phone" href={`tel:${r.telefono}`}>{r.telefono}</a></td><td><span className={`admin-tag ${r.tipo}`}>{r.tipo === "dueno" ? "Dueño" : "Vendedor"}</span></td><td>{fechaVisible(r.creado_en)}</td><td>{r.veces_registrado}</td></tr>)}</tbody></table></div>
          ) : !error ? <div className="admin-empty"><span>◻</span><strong>No hay contactos en este período</strong><p>Seleccioná otra fecha o comenzá a cargar personas desde el formulario público.</p></div> : null}
          {!!datos && !cargando && datos.cantidadPeriodo > 0 && <div className="admin-pagination"><span>Mostrando {Math.min((pagina - 1) * 50 + 1, datos.cantidadPeriodo)}–{Math.min(pagina * 50, datos.cantidadPeriodo)} de {datos.cantidadPeriodo.toLocaleString("es-AR")}</span><div><button disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>← Anterior</button><span>Página {pagina} de {paginas}</span><button disabled={pagina >= paginas} onClick={() => setPagina(p => p + 1)}>Siguiente →</button></div></div>}
        </section>
        <p className="admin-bottom">Acceso exclusivo del administrador. No compartas tu enlace privado. CSV admite listas grandes; PDF hasta 15.000 contactos por exportación.</p>
      </div>
    </main>
  );
}
