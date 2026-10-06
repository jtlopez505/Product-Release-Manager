import Link from "next/link";

import type { Feature } from "@/lib/features";

/**
 * El selector de feature de la consulta (ficha M2-01, criterio #2): un `<select>` con todo el
 * catálogo y el botón "Ver clientes", más el link de salida a la lista maestra
 * (`user-flow.md` §4, paso 7).
 *
 * Es un componente de servidor a propósito: un `<form method="get">` nativo no necesita JS
 * para funcionar (criterio #16) — el navegador arma `?feature=<id>` solo. Con un feature ya
 * elegido, `defaultValue` lo deja seleccionado sin que haga falta estado de cliente.
 *
 * El botón usa las mismas clases de acción principal que el resto de la app
 * (`app/page.tsx`, `app/features/page.tsx`); el link de salida sigue el estilo de link
 * secundario de `app/clientes/[id]/page.tsx` ("← Clientes").
 */
const CLASES_DE_ACCION_PRINCIPAL =
  "rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active";

const CLASES_DE_CONTROL =
  "rounded-md border border-borde-control bg-superficie px-3 py-2 text-sm focus:border-primario";

export function SelectorDeFeature({
  features,
  featureElegidoId,
}: {
  features: Pick<Feature, "id" | "name" | "code">[];
  /** El feature ya elegido (de `?feature=`), para que el selector no vuelva a "sin elegir". */
  featureElegidoId: string | null;
}): React.ReactElement {
  return (
    <form
      method="get"
      action="/por-feature"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none sm:w-80">
        <label htmlFor="selector-de-feature" className="text-sm font-medium">
          Feature
        </label>
        <select
          id="selector-de-feature"
          name="feature"
          defaultValue={featureElegidoId ?? ""}
          className={CLASES_DE_CONTROL}
        >
          <option value="" disabled>
            Elegí un feature
          </option>
          {features.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {feature.code ? `${feature.name} (${feature.code})` : feature.name}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className={CLASES_DE_ACCION_PRINCIPAL}>
        Ver clientes
      </button>

      <Link
        href="/features"
        className="text-sm text-texto-secundario underline-offset-2 hover:underline"
      >
        Lista maestra de features
      </Link>
    </form>
  );
}
