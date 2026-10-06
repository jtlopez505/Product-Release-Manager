/**
 * Lo que se acepta como cliente, antes de tocar la base — y la regla del historial.
 *
 * Vive separado de `lib/clientes.ts` por la misma razón que su par de M1-03: ahí se importa
 * `lib/prisma.ts`, que exige DATABASE_URL al importarse, y la verificación 1 (unitarias +
 * linter) tiene que poder correr sin base de datos. Acá no hay red ni I/O.
 *
 * Los campos son los de docs/arquitectura/modelo-de-datos.md (model Client) — nombre, versión
 * activa y notas — más la lista de features elegidos, que se guarda en `ClientFeature`. Los
 * textos siguen la voz de docs/arquitectura/marca.md: directos, sin signos de exclamación.
 */

/** Mensajes de validación, de guardado y de estado, en un solo lugar. */
export const MENSAJES_DE_CLIENTE = {
  nombreVacio: "El nombre es obligatorio.",
  versionVacia: "La versión activa es obligatoria.",
  featureInexistente: "Alguno de los features elegidos ya no existe.",
  noExiste: "Ese cliente ya no existe.",
  guardadoFallido: "No se pudo guardar el cliente. Probá de nuevo.",
  cargaFallida: "No se pudo cargar el cliente.",
  listaFallida: "No se pudo cargar la lista de clientes.",
  sinFeatures: "Todavía no hay features cargados.",
  sinClientes: "Todavía no cargaste ningún cliente.",
  sinFeaturesDelCliente: "Este cliente todavía no tiene features cargados.",
  guardado: "Cliente guardado.",
  descartarCambios: "Hay cambios sin guardar. Si salís ahora se descartan.",
} as const;

/** Los dos grupos de features de la Vista de cliente (ficha M1-05, criterio #4). */
export const ETIQUETAS_DE_HABILITACION = {
  habilitados: "Habilitados",
  noHabilitados: "No habilitados todavía",
} as const;

/** Etiquetas visibles, con el vocabulario del ICP (marca.md § Voz y tono, punto 2). */
export const ETIQUETAS_DE_CLIENTE = {
  name: "Nombre del cliente",
  currentVersion: "Versión activa",
  notes: "Notas",
  features: "Features habilitados",
  nuevoFeature: "Nombre del feature nuevo",
} as const;

/** Lo que se le pasa a Prisma para crear o editar: ya validado y recortado. */
export type EntradaDeCliente = {
  name: string;
  currentVersion: string;
  notes: string | null;
  /** Los features que quedan habilitados (`ClientFeature.enabled`), sin repetidos. */
  featureIds: string[];
};

export type CampoDeCliente = "name" | "currentVersion" | "notes" | "featureIds";

/** Errores por campo (`nuevoFeature` es el del alta inline; `general`, lo que no es de un campo). */
export type ErroresDeCliente = Partial<
  Record<CampoDeCliente | "nuevoFeature" | "general", string>
>;

export type ResultadoDeParseoDeCliente =
  | { ok: true; datos: EntradaDeCliente }
  | { ok: false; errores: ErroresDeCliente };

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function textoOpcional(valor: unknown): string | null {
  const limpio = texto(valor);
  return limpio.length > 0 ? limpio : null;
}

/**
 * **La regla del historial** (PRD M1 · `modelo-de-datos.md` § Historial de versión).
 *
 * Decide si este guardado tiene que dejar una fila nueva en `ClientVersionHistory`:
 *   - `anterior === null` → es la primera carga, y el PRD la cuenta como cambio ("incluida la
 *     primera carga"): un cliente nuevo nace con su primera fila de historial.
 *   - misma versión → NO suma fila. Cambiar solo el nombre, las notas o los features no tiene
 *     que ensuciar el historial con una entrada repetida (ficha §3 fila 3).
 *
 * Los espacios al borde no cuentan (`2.4.0` y ` 2.4.0 ` son la misma versión), pero las
 * mayúsculas sí: una versión es un identificador que se copia tal cual del release
 * (`1.0.0-RC1` ≠ `1.0.0-rc1`), y normalizar el case esconderia un cambio real.
 */
export function laVersionCambio(anterior: string | null, nueva: string): boolean {
  if (anterior === null) {
    return true;
  }
  return anterior.trim() !== nueva.trim();
}

/**
 * Normaliza la lista de features tildados: sin vacíos y sin repetidos, en el orden en que
 * llegaron. Tolera que el checklist mande un solo valor en vez de una lista.
 */
function idsDeFeatures(valor: unknown): string[] {
  const crudos = Array.isArray(valor) ? valor : valor === undefined ? [] : [valor];
  const limpios = crudos.map(texto).filter((id) => id.length > 0);
  return [...new Set(limpios)];
}

/**
 * Valida lo que llegó del formulario y devuelve o los datos listos para guardar o TODOS los
 * errores juntos (no de a uno: que la persona corrija en un solo viaje).
 */
export function parsearEntradaDeCliente(
  crudo: Record<string, unknown>,
): ResultadoDeParseoDeCliente {
  const errores: ErroresDeCliente = {};

  const name = texto(crudo.name);
  if (name.length === 0) {
    errores.name = MENSAJES_DE_CLIENTE.nombreVacio;
  }

  const currentVersion = texto(crudo.currentVersion);
  if (currentVersion.length === 0) {
    errores.currentVersion = MENSAJES_DE_CLIENTE.versionVacia;
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    datos: {
      name,
      currentVersion,
      notes: textoOpcional(crudo.notes),
      featureIds: idsDeFeatures(crudo.featureIds),
    },
  };
}
