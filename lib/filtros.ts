/** Fechas expresadas por el usuario en horario de Buenos Aires (UTC-03). */
export type Filtros = {
  desde: string;
  hasta: string;
  utcDesde?: string;
  utcHastaExclusiva?: string;
};

function esFechaValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [y, m, d] = valor.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d));
  return x.getUTCFullYear() === y && x.getUTCMonth() === m - 1 && x.getUTCDate() === d;
}

function inicioArgentina(valor: string, siguiente: boolean) {
  const [y, m, d] = valor.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + (siguiente ? 1 : 0), 3)).toISOString();
}

export function leerFiltros(params: URLSearchParams): Filtros {
  const desde = params.get("desde") || "";
  const hasta = params.get("hasta") || "";
  if ((desde && !esFechaValida(desde)) || (hasta && !esFechaValida(hasta))) {
    throw new Error("Fecha inválida. Usá AAAA-MM-DD.");
  }
  if (desde && hasta && desde > hasta) throw new Error("La fecha de inicio debe ser anterior a la fecha final.");
  return {
    desde,
    hasta,
    utcDesde: desde ? inicioArgentina(desde, false) : undefined,
    utcHastaExclusiva: hasta ? inicioArgentina(hasta, true) : undefined,
  };
}

export function rangoDescripcion(filtros: Filtros) {
  if (!filtros.desde && !filtros.hasta) return "Todos los registros";
  if (filtros.desde && filtros.desde === filtros.hasta) return `Día ${filtros.desde}`;
  return `Desde ${filtros.desde || "el inicio"} hasta ${filtros.hasta || "hoy"}`;
}
