/**
 * La lógica de la Vista de cliente (ficha M1-05), sin base de datos.
 *
 * Vive separado de `lib/clientes.ts` por la misma razón que `lib/validacion-de-cliente.ts`:
 * ahí se importa `lib/prisma.ts`, que exige DATABASE_URL al importarse, y la verificación 1
 * (unitarias + linter) tiene que poder correr sin base. Acá no hay red ni I/O: solo cómo se
 * ordena y se parte lo que ya se trajo.
 */

/** Lo mínimo que la pantalla necesita de un feature del catálogo para pintar la fila. */
export type FeatureVisible = {
  id: string;
  name: string;
  code: string | null;
};

/** Lo mínimo que la pantalla necesita de una fila del historial. */
export type FilaDeHistorialVisible = {
  id: string;
  version: string;
  recordedAt: Date;
};

export type GruposDeFeatures<T> = {
  habilitados: T[];
  noHabilitados: T[];
};

/**
 * Parte el catálogo de la organización en habilitados y no habilitados para este cliente
 * (criterio #4 de la ficha).
 *
 * Se recorre **el catálogo**, no la lista de habilitados: así la pantalla puede decir "no lo
 * tiene todavía" de cada feature que existe, que es justo la ambigüedad que la ficha prohíbe
 * ("nunca entre 'no lo tiene' y 'no se cargó'"). Un id habilitado que no esté en el catálogo
 * —un feature de otra organización, que la regla #1 ya impide traer— no inventa una fila.
 *
 * El orden del catálogo se conserva dentro de cada grupo: `listarFeaturesDeOrganizacion` ya
 * lo devuelve por nombre, que es como se lee.
 */
export function agruparFeaturesDelCliente<T extends { id: string }>(
  catalogo: readonly T[],
  idsHabilitados: readonly string[],
): GruposDeFeatures<T> {
  const habilitado = new Set(idsHabilitados);
  const grupos: GruposDeFeatures<T> = { habilitados: [], noHabilitados: [] };

  for (const feature of catalogo) {
    (habilitado.has(feature.id) ? grupos.habilitados : grupos.noHabilitados).push(feature);
  }

  return grupos;
}

/**
 * El historial como se lee en pantalla: más reciente primero (criterio #5).
 *
 * `listarHistorialDeVersiones` lo devuelve en orden cronológico a propósito (es la secuencia
 * que se audita) y ya resuelve el desempate entre dos cambios del mismo milisegundo, así que
 * acá alcanza con invertir — no se vuelve a ordenar por fecha. Devuelve una copia: la lista
 * que llega no se toca.
 */
export function historialMasRecientePrimero<T>(filas: readonly T[]): T[] {
  return [...filas].reverse();
}

/**
 * La zona horaria con la que se escriben las fechas del historial.
 *
 * Fija a propósito: en local el servidor corre en la zona del owner, pero en producción
 * (Vercel) corre en UTC, y un cambio de versión hecho a las 21:00 se leería como del día
 * siguiente. El historial es registro: la fecha tiene que ser la misma en los dos lados.
 */
export const ZONA_HORARIA_DEL_HISTORIAL = "America/Argentina/Buenos_Aires";

const FORMATO_DE_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: ZONA_HORARIA_DEL_HISTORIAL,
});

/**
 * La fecha de una fila del historial, como `05/10/2026 20:30`.
 *
 * Lleva hora y no solo día porque dos cambios de versión del mismo día son normales (el día
 * de release se corrige y se vuelve a cargar): sin la hora, dos filas distintas se leerían
 * como una repetida.
 */
export function fechaDeHistorial(fecha: Date): string {
  return FORMATO_DE_FECHA.format(fecha).replace(",", "");
}
