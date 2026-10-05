/**
 * Lo que se acepta como feature, antes de tocar la base.
 *
 * Vive separado de `lib/features.ts` a propósito: ahí se importa `lib/prisma.ts`, que exige
 * DATABASE_URL al importarse, y la verificación 1 (unitarias + linter) tiene que poder correr
 * sin base de datos. Acá no hay red ni I/O: entra lo que tipeó la persona, sale o los datos
 * listos para guardar o los errores por campo.
 *
 * Los campos y los enums son los de docs/arquitectura/modelo-de-datos.md (model Feature) —
 * no se inventa ninguno. Los textos siguen la voz de docs/arquitectura/marca.md: directos,
 * sin relleno, sin signos de exclamación.
 */
import { EstadoFeature, Prioridad } from "../prisma/generated/client/enums";

/** Mensajes de validación y de guardado, en un solo lugar para no escribirlos dos veces. */
export const MENSAJES_DE_FEATURE = {
  nombreVacio: "El nombre es obligatorio.",
  nombreDuplicado: "Ya existe un feature con ese nombre.",
  codigoDuplicado: "Ya existe un feature con ese código.",
  prioridadInvalida: "Elegí una prioridad de la lista.",
  estadoInvalido: "Elegí un estado de la lista.",
  noExiste: "Ese feature ya no existe.",
  guardadoFallido: "No se pudo guardar el feature. Probá de nuevo.",
  cargaFallida: "No se pudo cargar la lista de features.",
} as const;

/** Los campos de texto del catálogo (`code` y `producto` cortos, el resto largos). */
export const CAMPOS_DE_TEXTO = [
  "code",
  "producto",
  "queHace",
  "queProblemaResuelve",
  "aQuienBeneficia",
  "metricaExito",
  "observaciones",
] as const;

export type CampoDeTexto = (typeof CAMPOS_DE_TEXTO)[number];

/** Lo que se le pasa a Prisma para crear o editar: ya validado y recortado. */
export type EntradaDeFeature = {
  name: string;
  prioridad: Prioridad | null;
  /** `null` = no se eligió: el default DISPONIBLE lo pone el esquema, no este módulo. */
  estado: EstadoFeature | null;
} & { [Campo in CampoDeTexto]: string | null };

/** Errores por campo (más `general` para lo que no es de un campo puntual). */
export type ErroresDeFeature = Partial<
  Record<"name" | "prioridad" | "estado" | CampoDeTexto | "general", string>
>;

export type ResultadoDeParseo =
  | { ok: true; datos: EntradaDeFeature }
  | { ok: false; errores: ErroresDeFeature };

/** Etiquetas visibles de cada campo, tal como las nombra el catálogo del owner. */
export const ETIQUETAS_DE_FEATURE = {
  name: "Nombre",
  code: "Código",
  producto: "Producto",
  queHace: "Qué hace",
  queProblemaResuelve: "Qué problema resuelve",
  aQuienBeneficia: "A quién beneficia",
  prioridad: "Prioridad",
  estado: "Estado",
  metricaExito: "Métrica de éxito",
  observaciones: "Observaciones",
} as const;

/** Cómo se lee cada prioridad y cada estado en pantalla (el enum es de la base, no del ojo). */
export const ETIQUETAS_DE_PRIORIDAD: Record<Prioridad, string> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

export const ETIQUETAS_DE_ESTADO: Record<EstadoFeature, string> = {
  DISPONIBLE: "Disponible",
  EN_DESARROLLO: "En desarrollo",
  PROXIMAMENTE: "Próximamente",
};

/**
 * La forma canónica de un nombre para decidir si dos features son "el mismo" dentro de una
 * organización (ficha M1-03 §3 fila 5): sin espacios al borde y sin distinguir
 * mayúsculas/minúsculas. Los espacios internos NO se colapsan: "Login  SSO" y "Login SSO"
 * son nombres distintos, y adivinar la intención del usuario ahí sería de más.
 */
export function normalizarNombreDeFeature(nombre: string): string {
  return nombre.trim().toLocaleLowerCase("es");
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function textoOpcional(valor: unknown): string | null {
  const limpio = texto(valor);
  // Cadena vacía → null: así un código en blanco no choca con el `@@unique([organizationId,
  // code])` del esquema (en Postgres dos NULL no son iguales, dos "" sí).
  return limpio.length > 0 ? limpio : null;
}

function valorDeEnum<T extends string>(
  valor: unknown,
  permitidos: Readonly<Record<string, T>>,
): T | null | undefined {
  const crudo = texto(valor);
  if (crudo.length === 0) {
    return null;
  }
  // `undefined` = vino algo que el esquema no conoce: es un error, no un "sin elegir".
  return Object.values(permitidos).includes(crudo as T) ? (crudo as T) : undefined;
}

/**
 * Valida lo que llegó del formulario y devuelve o los datos listos para guardar o TODOS los
 * errores juntos (no de a uno: que la persona corrija en un solo viaje).
 */
export function parsearEntradaDeFeature(crudo: Record<string, unknown>): ResultadoDeParseo {
  const errores: ErroresDeFeature = {};

  const name = texto(crudo.name);
  if (name.length === 0) {
    errores.name = MENSAJES_DE_FEATURE.nombreVacio;
  }

  const prioridad = valorDeEnum(crudo.prioridad, Prioridad);
  if (prioridad === undefined) {
    errores.prioridad = MENSAJES_DE_FEATURE.prioridadInvalida;
  }

  const estado = valorDeEnum(crudo.estado, EstadoFeature);
  if (estado === undefined) {
    errores.estado = MENSAJES_DE_FEATURE.estadoInvalido;
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  const textos = Object.fromEntries(
    CAMPOS_DE_TEXTO.map((campo) => [campo, textoOpcional(crudo[campo])]),
  ) as { [Campo in CampoDeTexto]: string | null };

  return {
    ok: true,
    datos: {
      ...textos,
      name,
      prioridad: prioridad ?? null,
      estado: estado ?? null,
    },
  };
}
