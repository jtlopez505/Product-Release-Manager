/**
 * El archivo CSV de "Exportar CSV" (ficha M3-03), sin base ni navegador.
 *
 * Es donde vive todo el riesgo de la pieza (anexo técnico de la ficha): el BOM de UTF-8, el
 * separador `;` que necesita Excel en español, el escapado de `;`/comillas/saltos de línea
 * dentro de un valor (fila 6), la neutralización de fórmulas (fila 7) y el nombre de archivo
 * válido en Windows (fila 8). Nada de esto toca `Blob` ni el DOM: por eso se prueba entero en
 * la verificación 1, sin levantar un navegador.
 *
 * Dado el criterio (versión o feature) y las filas que la pantalla ya tiene en memoria
 * (nombre, versión actual), devuelve el contenido del archivo y su nombre — el componente de
 * cliente (`app/lista-de-release/boton-exportar-csv.tsx`) solo lo envuelve en un `Blob` y lo
 * descarga; no hay ningún cálculo de formato fuera de este archivo.
 */

/** Una fila exportable: lo mismo que ya pinta `TablaDeClientes` (nombre + versión actual). */
export type FilaParaExportar = {
  name: string;
  currentVersion: string;
};

/**
 * Qué se exportó, para componer el nombre del archivo (fila 8 de la ficha): por versión
 * destino, o por feature — con su código si lo tiene, o su nombre si no (`code` es opcional
 * en el modelo de datos, `modelo-de-datos.md`).
 */
export type IdentificadorDeExportacion =
  | { tipo: "version"; version: string }
  | { tipo: "feature"; feature: { code: string | null; name: string } };

export type ArchivoDeExportacion = {
  /** Nombre de archivo válido en Windows, listo para `link.download`. */
  nombre: string;
  /** El contenido completo, BOM incluido como el primer carácter (`﻿`): al pasarlo a
   * `Blob` con charset UTF-8, el navegador lo codifica como los 3 bytes `EF BB BF`. */
  contenido: string;
};

const SEPARADOR = ";";
const SALTO_DE_LINEA = "\r\n";
const BOM_UTF8 = "﻿";

/**
 * Fila 7 de la ficha: un valor que Excel interpretaría como fórmula (empieza con `=`, `+`,
 * `-`, `@`, tabulador o retorno de carro) se antepone con un apóstrofo, así Excel lo muestra
 * como texto en vez de ejecutarlo. Se aplica ANTES de escapar comillas, sobre el valor
 * original: el apóstrofo agregado nunca necesita su propio escapado.
 */
function neutralizarFormula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

/**
 * Fila 6 de la ficha: un valor con `;`, comillas o salto de línea rompería las columnas si
 * saliera tal cual. Se envuelve en comillas y cada comilla interna se duplica — la regla
 * estándar de CSV, la misma que usa Excel al exportar.
 */
function escaparCampo(valor: string): string {
  if (!/[;"\n\r]/.test(valor)) {
    return valor;
  }
  return `"${valor.replace(/"/g, '""')}"`;
}

function campoCsv(valor: string): string {
  return escaparCampo(neutralizarFormula(valor));
}

function filaCsv(campos: readonly string[]): string {
  return campos.map(campoCsv).join(SEPARADOR);
}

/**
 * El contenido completo del archivo: BOM + encabezado (`Cliente;Versión actual`, criterio #3)
 * + una línea por cliente, en el mismo orden que llegó (criterio #2) — ni se reordena ni se
 * filtra nada acá, eso ya lo hizo la pantalla.
 */
export function contenidoCsv(filas: readonly FilaParaExportar[]): string {
  const encabezado = filaCsv(["Cliente", "Versión actual"]);
  const cuerpo = filas.map((fila) => filaCsv([fila.name, fila.currentVersion]));
  return BOM_UTF8 + [encabezado, ...cuerpo].join(SALTO_DE_LINEA) + SALTO_DE_LINEA;
}

/** Los caracteres que Windows no acepta en un nombre de archivo (fila 8 de la ficha). */
const CARACTERES_INVALIDOS_EN_WINDOWS = /[\\/:*?"<>|]/g;

function sanitizarParaNombreDeArchivo(valor: string): string {
  return valor.replace(CARACTERES_INVALIDOS_EN_WINDOWS, "-");
}

/** `AAAA-MM-DD` de la fecha LOCAL del navegador — nunca UTC, por eso no se usa `toISOString`. */
function fechaLocalISO(fecha: Date): string {
  const anio = String(fecha.getFullYear()).padStart(4, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * `release-version-<version>-<fecha>.csv` o `release-feature-<código o nombre>-<fecha>.csv`
 * (fila 8). La versión y el nombre/código del feature son texto libre cargado a mano, así que
 * se sanitizan igual que el resto del nombre — no solo las partes fijas.
 */
export function nombreDeArchivo(identificador: IdentificadorDeExportacion, fecha: Date): string {
  const fechaTexto = fechaLocalISO(fecha);
  const base =
    identificador.tipo === "version"
      ? `release-version-${identificador.version}-${fechaTexto}`
      : `release-feature-${identificador.feature.code ?? identificador.feature.name}-${fechaTexto}`;
  return `${sanitizarParaNombreDeArchivo(base)}.csv`;
}

/**
 * La función que usa el botón: dado qué se está exportando, las filas que ya están en
 * pantalla y la fecha (la del navegador de quien exporta), devuelve el archivo completo.
 */
export function exportarListaDeRelease(
  identificador: IdentificadorDeExportacion,
  filas: readonly FilaParaExportar[],
  fecha: Date,
): ArchivoDeExportacion {
  return {
    nombre: nombreDeArchivo(identificador, fecha),
    contenido: contenidoCsv(filas),
  };
}
