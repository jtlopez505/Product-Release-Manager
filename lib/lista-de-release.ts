/**
 * La lógica de la lista de release por versión destino (ficha M3-01), sin base de datos.
 *
 * Vive separada de `lib/clientes.ts` por la misma razón que `lib/consulta-por-feature.ts`: ese
 * módulo importa `lib/prisma.ts`, que exige DATABASE_URL al importarse, y la verificación 1
 * (unitarias + linter) tiene que poder correr sin base. Acá no hay red ni I/O.
 *
 * Es el mismo problema que `particionarClientesPorFeature`, con otro criterio de corte: se
 * recorre **la lista completa de clientes de la organización**, nunca una lista parcial, así
 * que un cliente de otra organización —que `listarClientesDeOrganizacion` ya filtró afuera
 * (regla #1)— no tiene por dónde aparecer acá.
 *
 * **La comparación de versiones no se reescribe:** es `laVersionCambio`
 * (`lib/validacion-de-cliente.ts`), la misma que usa el historial de M1-04 (ficha §3 fila 4).
 * Reusarla tal cual es lo que garantiza que la lista de release y el historial nunca discrepen
 * sobre si un cliente ya está en una versión dada.
 */
import { laVersionCambio } from "./validacion-de-cliente";

/** Mensajes de la lista de release, en un solo lugar (mismo molde que M2-01). */
export const MENSAJES_DE_LISTA_DE_RELEASE = {
  sinVersionPedida: "Escribí la versión que vas a desplegar para ver qué clientes la reciben.",
  // Texto literal de docs/arquitectura/user-flow.md §5 (criterio #8 de la ficha).
  ningunoCorresponde: "Ningún cliente corresponde a este filtro todavía.",
  cargaFallida: "No se pudo cargar la lista de release.",
} as const;

export type ParticionDeListaDeRelease<T> = {
  /** Clientes cuya versión activa es distinta de la destino: a estos llega el release. */
  reciben: T[];
  /** Clientes que ya están en la versión destino: quedan afuera, y se cuentan aparte. */
  yaEstan: T[];
};

/**
 * Parte la lista de clientes de la organización en los que reciben la versión destino y los
 * que ya están en ella (criterio #3 de la ficha).
 *
 * La comparación **es** `laVersionCambio(cliente.currentVersion, destino)`: si la versión
 * "cambia" (son distintas), el cliente recibe el release; si no cambia (son la misma, según
 * la misma regla de espacios y mayúsculas del historial), ya está. Un cliente más adelantado
 * que la destino cae igual en "reciben" — interpretar números de versión queda afuera de esta
 * pieza (ficha §5) — y se reconoce por su propia versión en la lista.
 *
 * El orden se conserva dentro de cada grupo: `listarClientesDeOrganizacion` ya trae la lista
 * por nombre.
 */
export function particionarClientesPorVersion<T extends { currentVersion: string }>(
  clientes: readonly T[],
  versionDestino: string,
): ParticionDeListaDeRelease<T> {
  const particion: ParticionDeListaDeRelease<T> = { reciben: [], yaEstan: [] };

  for (const cliente of clientes) {
    (laVersionCambio(cliente.currentVersion, versionDestino) ? particion.reciben : (
      particion.yaEstan
    )).push(cliente);
  }

  return particion;
}

/**
 * Normaliza lo que llegó en `?version=`: `undefined`, vacío o solo espacios son todos "sin
 * versión pedida" (criterio #7). Lo que sí hay, se recorta en los bordes pero se conserva tal
 * cual en el resto —incluidos caracteres raros (criterio #11): esta función no interpreta ni
 * sanitiza nada, React ya escapa lo que se pinta como texto.
 */
export function versionPedida(crudo: string | undefined): string | null {
  const recortada = (crudo ?? "").trim();
  return recortada.length > 0 ? recortada : null;
}

/** "Clientes que reciben la 2.5.0 (N)" (criterio #5). */
export function tituloDeListaDeRelease(version: string, cantidad: number): string {
  return `Clientes que reciben la ${version} (${cantidad})`;
}

/**
 * "1 cliente ya está en 2.5.0" / "N clientes ya están en 2.5.0" — o nada (`null`) si no quedó
 * ninguno afuera: la ficha pide que esa segunda línea no aparezca cuando no hace falta
 * (criterio #5).
 */
export function mensajeDeClientesQueYaEstan(version: string, cantidad: number): string | null {
  if (cantidad === 0) {
    return null;
  }
  return cantidad === 1
    ? `1 cliente ya está en ${version}`
    : `${cantidad} clientes ya están en ${version}`;
}
