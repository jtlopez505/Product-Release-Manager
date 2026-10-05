/**
 * El estado que viaja entre la acción de servidor y el formulario de cliente
 * (`useActionState`), más lo que comparten los dos lados.
 *
 * Vive en su propio módulo porque `acciones.ts` lleva `"use server"` y ese archivo solo puede
 * exportar funciones async; los tipos y las constantes van acá. Mismo reparto que M1-03.
 *
 * `valores` es lo que la persona tipeó, devuelto tal cual: React resetea los campos no
 * controlados cuando el form se envía con una acción, así que los caminos de error y de
 * "feature creado" los reponen desde acá. Es la regla de la ficha §4 ("el formulario conserva
 * todo lo tipeado") y lo que hace que crear un feature inline no cueste la carga ya hecha.
 */
import type { ErroresDeCliente } from "@/lib/validacion-de-cliente";

/** Los dos botones que envían este formulario: guardar el cliente o crear un feature. */
export const INTENCIONES = ["guardar", "crear-feature"] as const;

export type Intencion = (typeof INTENCIONES)[number];

/** Lo mínimo del feature que el checklist necesita mostrar (nombre y, si tiene, código). */
export type OpcionDeFeature = {
  id: string;
  name: string;
  code: string | null;
};

export type ValoresDeCliente = {
  name: string;
  currentVersion: string;
  notes: string;
  /** Los features tildados. */
  featureIds: string[];
  /** El campo del alta inline de feature (no es un dato del cliente). */
  nuevoFeature: string;
};

export const VALORES_VACIOS_DE_CLIENTE: ValoresDeCliente = {
  name: "",
  currentVersion: "",
  notes: "",
  featureIds: [],
  nuevoFeature: "",
};

export type EstadoDeClienteGuardado =
  | { fase: "inicial" }
  | {
      fase: "error";
      errores: ErroresDeCliente;
      valores: ValoresDeCliente;
      /** La lista al día: si recién se creó un feature inline, tiene que seguir estando. */
      features?: OpcionDeFeature[];
    }
  | {
      fase: "feature-creado";
      valores: ValoresDeCliente;
      features: OpcionDeFeature[];
      /** El nombre del feature recién creado, para confirmarlo en pantalla. */
      creado: string;
    };

export const ESTADO_INICIAL_DE_CLIENTE: EstadoDeClienteGuardado = { fase: "inicial" };

/** Deja un feature de la base en lo que el checklist necesita (y nada más). */
export function opcionDeFeature(feature: {
  id: string;
  name: string;
  code: string | null;
}): OpcionDeFeature {
  return { id: feature.id, name: feature.name, code: feature.code };
}

function campo(datos: FormData, nombre: string): string {
  const valor = datos.get(nombre);
  return typeof valor === "string" ? valor : "";
}

/**
 * Lo que vino en el FormData, para poder devolverlo intacto.
 *
 * Tolera que el formulario se envíe sin JavaScript: en ese camino React invoca la acción con
 * el FormData como primer argumento y sin estado previo, así que puede no ser el segundo
 * parámetro. Mejor eso que un 500 — el portón de M1-02 y la pantalla de M1-03 funcionan sin
 * JS y esta mantiene el mismo estándar.
 */
export function valoresDeClienteDeFormData(datos: unknown): ValoresDeCliente {
  if (!(datos instanceof FormData)) {
    return VALORES_VACIOS_DE_CLIENTE;
  }
  return {
    name: campo(datos, "name"),
    currentVersion: campo(datos, "currentVersion"),
    notes: campo(datos, "notes"),
    // El checklist manda un valor por casilla tildada: `getAll`, no `get`.
    featureIds: datos.getAll("featureIds").filter((valor): valor is string => typeof valor === "string"),
    nuevoFeature: campo(datos, "nuevoFeature"),
  };
}

/** Qué botón se apretó. Cualquier cosa que no sea una intención conocida se trata como guardar. */
export function intencionDeFormData(datos: unknown): Intencion {
  if (!(datos instanceof FormData)) {
    return "guardar";
  }
  const enviada = datos.get("intencion");
  return INTENCIONES.find((intencion) => intencion === enviada) ?? "guardar";
}
