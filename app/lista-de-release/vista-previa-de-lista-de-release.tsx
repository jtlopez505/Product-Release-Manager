import type { FilaDeListaDeClientes } from "@/lib/clientes";
import { MENSAJES_DE_LISTA_DE_RELEASE } from "@/lib/lista-de-release";

import { TablaDeClientes } from "../tabla-de-clientes";

/**
 * La vista previa de la lista de release (ficha M3-01, criterios #5 y #6; `user-flow.md` §5:
 * "antes de exportar, se ve una vista previa de la lista completa").
 *
 * Vive separada de `app/lista-de-release/page.tsx` a propósito, y desde M3-02 se reusa **tal
 * cual** para los dos criterios (fila 5 de esa ficha): quien llama ya hizo la partición
 * (`particionarClientesPorVersion` o `particionarClientesPorFeature`, según corresponda) y ya
 * compuso el título y el mensaje secundario con las palabras de su propio criterio
 * (`tituloDeListaDeRelease`/`mensajeDeClientesQueYaEstan` para versión,
 * `tituloDeListaDeReleasePorFeature`/`mensajeDeClientesQueYaTienenFeature` para feature, las
 * cuatro en `lib/lista-de-release.ts`) — a este componente no le importa cuál de los dos fue.
 *
 * Reusa `TablaDeClientes` para la lista (nombre-como-link y versión en monoespaciada, ya
 * resueltos): no se duplica nada de eso acá.
 *
 * Si nadie corresponde al filtro (`reciben` vacío), el título cambia al texto de estado vacío
 * de `user-flow.md` §5 ("Ningún cliente corresponde a este filtro todavía.") en vez del título
 * que mandó quien llama — es la fila 8 de la ficha M3-01 (y la fila 7 de M3-02). La segunda
 * línea solo aparece si quedó alguien afuera: con todos recibiendo, no hay nada que decir ahí.
 */
export function VistaPreviaDeListaDeRelease({
  titulo,
  mensajeSecundario,
  reciben,
}: {
  /** Ya compuesto por quien llama; solo se pinta si `reciben` no está vacío. */
  titulo: string;
  /** La segunda línea ("N ya están en X" / "N ya tienen este feature"), o `null` si no quedó
   * nadie afuera. */
  mensajeSecundario: string | null;
  reciben: FilaDeListaDeClientes[];
}): React.ReactElement {
  const hayClientesQueCorresponden = reciben.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">
          {hayClientesQueCorresponden ? titulo : MENSAJES_DE_LISTA_DE_RELEASE.ningunoCorresponde}
        </h2>
        {mensajeSecundario ? (
          <p className="text-sm text-texto-secundario">{mensajeSecundario}</p>
        ) : null}
      </div>

      {hayClientesQueCorresponden ? (
        <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
          <TablaDeClientes clientes={reciben} />
        </div>
      ) : null}
    </div>
  );
}
