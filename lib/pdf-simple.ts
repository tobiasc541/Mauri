/** PDF A4 autocontenido, sin dependencias, para exportar listados comerciales. */
export type FilaPdf = { numero: number; nombre: string; telefono: string; tipo: string; fecha: string };

const ANCHO = 595;
const ALTO = 842;
const FILAS_POR_PAGINA = 40;

function normalizar(texto: string) {
  return String(texto).replace(/[\r\n\t]/g, " ").replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e\xa1-\xff]/g, "?");
}
function literal(texto: string) {
  return `(${normalizar(texto).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}
function escribir(x: number, y: number, texto: string, tamano = 9, negrita = false) {
  return `BT /${negrita ? "F2" : "F1"} ${tamano} Tf 1 0 0 1 ${x} ${y} Tm ${literal(texto)} Tj ET\n`;
}
function acortar(v: string, longitud: number) {
  const s = String(v).replace(/\s+/g, " ").trim();
  return s.length > longitud ? s.slice(0, longitud - 1) + "..." : s;
}

export function generarPdfContactos(registros: FilaPdf[], filtro: string) {
  const paginas = Math.max(1, Math.ceil(registros.length / FILAS_POR_PAGINA));
  const objetos: string[] = [];
  const idFuente = 3 + paginas * 2;
  const idNegrita = idFuente + 1;
  objetos.push("<< /Type /Catalog /Pages 2 0 R >>");
  objetos.push(`<< /Type /Pages /Kids [${Array.from({ length: paginas }, (_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${paginas} >>`);

  for (let n = 0; n < paginas; n++) {
    const inicial = n * FILAS_POR_PAGINA;
    const subset = registros.slice(inicial, inicial + FILAS_POR_PAGINA);
    const idPagina = 3 + n * 2;
    let stream = "";
    stream += "0.07 0.14 0.25 rg\n";
    stream += escribir(40, 801, "MAURI  /  SISTEMA DE VENDEDORES", 16, true);
    stream += "0.35 0.43 0.52 rg\n";
    stream += escribir(40, 780, acortar(filtro, 85), 9);
    stream += escribir(40, 764, `Total de contactos exportados: ${registros.length}`, 9);
    stream += escribir(486, 764, `Página ${n + 1} / ${paginas}`, 9);
    stream += "0.93 0.95 0.97 rg 38 731 519 26 re f\n";
    stream += "0.10 0.20 0.31 rg\n";
    stream += escribir(44, 741, "#", 9, true);
    stream += escribir(69, 741, "NOMBRE", 9, true);
    stream += escribir(255, 741, "TELÉFONO", 9, true);
    stream += escribir(366, 741, "TIPO", 9, true);
    stream += escribir(438, 741, "FECHA (ARG)", 9, true);
    subset.forEach((r, i) => {
      const y = 714 - i * 16;
      if (i % 2 === 1) stream += `0.97 0.98 0.99 rg 38 ${y - 5} 519 16 re f\n`;
      stream += "0.10 0.20 0.31 rg\n";
      stream += escribir(44, y, String(r.numero), 8);
      stream += escribir(69, y, acortar(r.nombre, 33), 8);
      stream += escribir(255, y, acortar(r.telefono, 21), 8);
      stream += escribir(366, y, r.tipo === "dueno" ? "Dueño" : "Vendedor", 8);
      stream += escribir(438, y, r.fecha, 8);
    });
    stream += "0.50 0.57 0.64 rg\n" + escribir(40, 33, "Documento interno · Seguimiento comercial · Datos personales de uso autorizado", 8);
    const longitud = Buffer.byteLength(stream, "latin1");
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] /Resources << /Font << /F1 ${idFuente} 0 R /F2 ${idNegrita} 0 R >> >> /Contents ${idPagina + 1} 0 R >>`);
    objetos.push(`<< /Length ${longitud} >>\nstream\n${stream}endstream`);
  }
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const pedazos: Buffer[] = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  const offsets = [0];
  let offset = pedazos[0].length;
  objetos.forEach((obj, i) => {
    offsets.push(offset);
    const b = Buffer.from(`${i + 1} 0 obj\n${obj}\nendobj\n`, "latin1");
    pedazos.push(b);
    offset += b.length;
  });
  const inicioXref = offset;
  let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  xref += offsets.slice(1).map(x => `${String(x).padStart(10, "0")} 00000 n \n`).join("");
  xref += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
  pedazos.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(pedazos);
}
