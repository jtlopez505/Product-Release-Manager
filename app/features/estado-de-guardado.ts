/**
 * El estado que viaja entre la acción de servidor y el formulario (`useActionState`).
 *
 * Vive en su propio módulo porque `acciones.ts` lleva `"use server"` y ese archivo exporta
 * solo funciones async; los tipos y las constantes que comparten los dos lados van acá.
 *
 * `valores` es lo que la persona tipeó, devuelto tal cual: React resetea los campos no
 * controlados cuando el form se envía con una acción, así que el camino de error los repone
 * desde acá. Es la regla de la ficha §4: "el formulario conserva lo tipeado".
 *
 * No hay fase "guardado": cuando el guardado sale bien, la acción redirige a la lista
 * (`/features`), que es lo que la ficha pide — "vuelve a la lista con el feature nuevo
 * visible". El único estado que vuelve al formulario es el de error.
 */
import type { ErroresDeFeature } from "@/lib/validacion-de-feature";

/** Los nombres de los campos del formulario = los campos del catálogo (modelo-de-datos.md). */
export const CAMPOS_DEL_FORMULARIO = [
  "name",
  "code",
  "producto",
  "queHace",
  "queProblemaResuelve",
  "aQuienBeneficia",
  "prioridad",
  "estado",
  "metricaExito",
  "observaciones",
] as const;

export type CampoDelFormulario = (typeof CAMPOS_DEL_FORMULARIO)[number];

export type ValoresDelFormulario = Record<CampoDelFormulario, string>;

export type EstadoDeGuardado =
  | { fase: "inicial" }
  | { fase: "error"; errores: ErroresDeFeature; valores: ValoresDelFormulario };

export const ESTADO_INICIAL: EstadoDeGuardado = { fase: "inicial" };

export const VALORES_VACIOS: ValoresDelFormulario = Object.fromEntries(
  CAMPOS_DEL_FORMULARIO.map((campo) => [campo, ""]),
) as ValoresDelFormulario;

/**
 * Lo que vino en el FormData, como strings, para poder devolverlo intacto si falla.
 *
 * Tolera que el formulario se envíe sin JavaScript: en ese camino React invoca la acción con
 * el FormData como primer argumento y sin estado previo, así que `datos` puede no ser el
 * segundo parámetro. Mejor eso que un 500 (el portón de M1-02 funciona igual sin JS y esta
 * pantalla mantiene el mismo estándar).
 */
export function valoresDeFormData(datos: unknown): ValoresDelFormulario {
  if (!(datos instanceof FormData)) {
    return VALORES_VACIOS;
  }
  return Object.fromEntries(
    CAMPOS_DEL_FORMULARIO.map((campo) => {
      const valor = datos.get(campo);
      return [campo, typeof valor === "string" ? valor : ""];
    }),
  ) as ValoresDelFormulario;
}
