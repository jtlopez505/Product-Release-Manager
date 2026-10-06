import type { FilaDeListaDeClientes } from "@/lib/clientes";
import { MENSAJES_DE_CONSULTA_POR_FEATURE } from "@/lib/consulta-por-feature";

import { TablaDeClientes } from "../tabla-de-clientes";

/**
 * Las dos listas de la consulta (ficha M2-01, criterios #3, #5 y #8): "Clientes que lo
 * tienen" y "Clientes que no lo tienen todavía", lado a lado en pantalla ancha —el contexto
 * de uso de `marca.md`— y una debajo de la otra en pantalla angosta (`user-flow.md` §4,
 * paso 4).
 *
 * Cada columna reusa `TablaDeClientes` (`app/tabla-de-clientes.tsx`) tal cual: no se duplica
 * el nombre-como-link ni la versión en monoespaciada. Una lista vacía lo dice con palabras en
 * vez de quedar en blanco (criterio #8).
 *
 * **Pregunta abierta para el Diseñador:** `marca.md` no define el tamaño del título de una
 * lista secundaria como esta (solo el de un `h1`/`h2` de pantalla y el de un `h3` de grupo
 * dentro de un panel, como en `features-del-cliente.tsx`). Se usa el valor ya declarado más
 * cercano — el mismo que "Features"/"Historial de versiones" en la Vista de cliente
 * (`text-base font-semibold tracking-tight`) — en vez de inventar uno nuevo.
 */
function Columna({
  titulo,
  clientes,
  mensajeVacio,
}: {
  titulo: string;
  clientes: FilaDeListaDeClientes[];
  mensajeVacio: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      {/* Un solo string, no varios hijos de JSX: React separa expresiones adyacentes con
          comentarios de hidratación (`<!-- -->`) en el HTML servido, que partirían el texto
          "Clientes que lo tienen (N)" que la ficha pide ver como una sola frase. */}
      <h2 className="text-base font-semibold tracking-tight">{`${titulo} (${clientes.length})`}</h2>

      {clientes.length === 0 ? (
        <p className="rounded-lg border border-borde-marcado bg-superficie p-5 text-sm">
          {mensajeVacio}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
          <TablaDeClientes clientes={clientes} />
        </div>
      )}
    </div>
  );
}

export function ListasDeClientesPorFeature({
  loTienen,
  noLoTienenTodavia,
}: {
  loTienen: FilaDeListaDeClientes[];
  noLoTienenTodavia: FilaDeListaDeClientes[];
}): React.ReactElement {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Columna
        titulo="Clientes que lo tienen"
        clientes={loTienen}
        mensajeVacio={MENSAJES_DE_CONSULTA_POR_FEATURE.ningunoLoTiene}
      />
      <Columna
        titulo="Clientes que no lo tienen todavía"
        clientes={noLoTienenTodavia}
        mensajeVacio={MENSAJES_DE_CONSULTA_POR_FEATURE.todosLoTienen}
      />
    </div>
  );
}
