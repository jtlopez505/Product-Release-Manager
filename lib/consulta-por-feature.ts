/**
 * La lógica de la consulta por feature (ficha M2-01), sin base de datos.
 *
 * Vive separada de `lib/clientes.ts` y `lib/features.ts` por la misma razón que
 * `lib/vista-de-cliente.ts`: esos módulos importan `lib/prisma.ts`, que exige DATABASE_URL al
 * importarse, y la verificación 1 (unitarias + linter) tiene que poder correr sin base. Acá no
 * hay red ni I/O: solo cómo se parte lo que ya se trajo.
 *
 * Es el mismo problema que `agruparFeaturesDelCliente`, al revés: ahí se parte el catálogo de
 * features según un cliente; acá se parte la lista de clientes según un feature. La misma
 * razón de fondo aplica: se recorre **la lista completa de clientes de la organización**, no
 * la de los que tienen el feature, así el cliente sin ninguna fila de `ClientFeature` y el que
 * tiene la fila con `enabled: false` caen los dos, solos, en "no lo tiene todavía" — y un id
 * de otra organización nunca puede inventar una fila.
 */

/** Mensajes de la consulta, en un solo lugar (criterio §6 de la ficha: textos juntos). */
export const MENSAJES_DE_CONSULTA_POR_FEATURE = {
  sinFeatureElegido: "Elegí un feature para ver qué clientes lo tienen.",
  sinFeaturesEnCatalogo: "Todavía no cargaste ningún feature.",
  ningunoLoTiene: "Ningún cliente tiene este feature todavía.",
  todosLoTienen: "Todos los clientes tienen este feature.",
  cargaFallida: "No se pudo cargar la consulta por feature.",
} as const;

export type ParticionDeClientes<T> = {
  loTienen: T[];
  noLoTienenTodavia: T[];
};

/**
 * Parte la lista de clientes de la organización en los que tienen el feature habilitado y los
 * que todavía no (criterios #3 y #4 de la ficha).
 *
 * Se recorre **la lista de clientes**, no la de ids habilitados: así el cliente sin fila o con
 * la fila deshabilitada cae solo en "no lo tienen todavía", que es justo la ambigüedad que la
 * ficha prohíbe disolver. Un id habilitado que no esté en la lista de clientes —uno de otra
 * organización, que la regla #1 ya impide traer— no inventa una fila ni suma al conteo.
 *
 * El orden de la lista se conserva dentro de cada grupo: `listarClientesDeOrganizacion` ya la
 * trae por nombre, que es como se lee.
 */
export function particionarClientesPorFeature<T extends { id: string }>(
  clientes: readonly T[],
  idsConFeatureHabilitado: readonly string[],
): ParticionDeClientes<T> {
  const habilitado = new Set(idsConFeatureHabilitado);
  const particion: ParticionDeClientes<T> = { loTienen: [], noLoTienenTodavia: [] };

  for (const cliente of clientes) {
    (habilitado.has(cliente.id) ? particion.loTienen : particion.noLoTienenTodavia).push(
      cliente,
    );
  }

  return particion;
}
