/**
 * El campo de versión destino de la lista de release (ficha M3-01, criterio #2): un
 * `<form method="get">` nativo, mismo criterio que `SelectorDeFeature`
 * (`app/por-feature/selector-de-feature.tsx`) — el navegador arma `?version=<texto>` solo,
 * sin que haga falta JS (criterio #14).
 *
 * Con una versión ya pedida, `defaultValue` deja el campo con ese texto escrito (criterio
 * #2); es un componente de servidor a propósito, no hace falta estado de cliente para eso.
 *
 * `action="/lista-de-release"` sin tocar `?por=`: hoy el único criterio es por versión, y
 * cuando M3-02 sume el selector de "por feature" en la misma pantalla, este formulario sigue
 * mandando a la misma URL con `?version=`, que sigue siendo el criterio por defecto.
 */
const CLASES_DE_ACCION_PRINCIPAL =
  "rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active";

const CLASES_DE_CONTROL =
  "rounded-md border border-borde-control bg-superficie px-3 py-2 text-sm focus:border-primario";

export function FormularioDeVersion({
  version,
}: {
  /** La versión ya pedida (de `?version=`), para que el campo no vuelva a quedar vacío. */
  version: string | null;
}): React.ReactElement {
  return (
    <form method="get" action="/lista-de-release" className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none sm:w-80">
        <label htmlFor="campo-de-version" className="text-sm font-medium">
          Versión destino
        </label>
        {/* Monoespaciada (marca.md § Tipografía): una versión se compara de un vistazo. */}
        <input
          id="campo-de-version"
          name="version"
          type="text"
          defaultValue={version ?? ""}
          placeholder="2.5.0"
          className={`${CLASES_DE_CONTROL} font-datos`}
        />
      </div>

      <button type="submit" className={CLASES_DE_ACCION_PRINCIPAL}>
        Ver lista
      </button>
    </form>
  );
}
