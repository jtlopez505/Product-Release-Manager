import type { FilaDeListaDeClientes } from "@/lib/clientes";
import {
  MENSAJES_DE_LISTA_DE_RELEASE,
  mensajeDeClientesQueYaEstan,
  tituloDeListaDeRelease,
} from "@/lib/lista-de-release";

import { TablaDeClientes } from "../tabla-de-clientes";

/**
 * La vista previa de la lista de release (ficha M3-01, criterios #5 y #6; `user-flow.md` §5:
 * "antes de exportar, se ve una vista previa de la lista completa").
 *
 * Vive separada de `app/lista-de-release/page.tsx` a propósito: es la parte que M3-02 (por
 * feature) y M3-03 (exportar) van a reusar tal cual — reciben ya traen la partición hecha
 * (`reciben`/`yaEstan`), y a esta pieza no le importa si el criterio de corte fue versión o
 * feature, solo pintarlo.
 *
 * Reusa `TablaDeClientes` para la lista (nombre-como-link y versión en monoespaciada, ya
 * resueltos): no se duplica nada de eso acá.
 *
 * Si nadie recibe la versión (`reciben` vacío), el título cambia al texto de estado vacío de
 * `user-flow.md` §5 ("Ningún cliente corresponde a este filtro todavía.") en vez de "Clientes
 * que reciben la X (0)" — es la fila 8 de la ficha. La segunda línea ("N ya están en X") solo
 * aparece si quedó alguien afuera (criterio #5): con todos recibiendo la versión, no hay nada
 * que decir ahí.
 */
export function VistaPreviaDeListaDeRelease({
  version,
  reciben,
  yaEstan,
}: {
  version: string;
  reciben: FilaDeListaDeClientes[];
  yaEstan: FilaDeListaDeClientes[];
}): React.ReactElement {
  const mensajeYaEstan = mensajeDeClientesQueYaEstan(version, yaEstan.length);
  const hayQueRecibenLaVersion = reciben.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">
          {hayQueRecibenLaVersion
            ? tituloDeListaDeRelease(version, reciben.length)
            : MENSAJES_DE_LISTA_DE_RELEASE.ningunoCorresponde}
        </h2>
        {mensajeYaEstan ? (
          <p className="text-sm text-texto-secundario">{mensajeYaEstan}</p>
        ) : null}
      </div>

      {hayQueRecibenLaVersion ? (
        <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
          <TablaDeClientes clientes={reciben} />
        </div>
      ) : null}
    </div>
  );
}
