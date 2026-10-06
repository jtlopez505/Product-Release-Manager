import Link from "next/link";

import type { Feature } from "@/lib/features";

/**
 * El selector de feature de la consulta (ficha M2-01, criterio #2): un `<select>` con todo el
 * catálogo y un botón de confirmar, más el link de salida a la lista maestra (`user-flow.md`
 * §4, paso 7).
 *
 * Es un componente de servidor a propósito: un `<form method="get">` nativo no necesita JS
 * para funcionar (criterio #16) — el navegador arma `?feature=<id>` solo. Con un feature ya
 * elegido, `defaultValue` lo deja seleccionado sin que haga falta estado de cliente.
 *
 * **Parametrizado desde M3-02** (ficha M3-02, anexo técnico): `destino` y `camposOcultos`
 * dejan reusar este mismo selector desde "Lista de release" (`/lista-de-release?por=feature`,
 * con el campo oculto `por=feature`) sin copiarlo. Los tres defaults —`destino="/por-feature"`,
 * sin campos ocultos, `textoBoton="Ver clientes"`— son exactamente el comportamiento de M2-01,
 * así que `/por-feature` sigue andando igual sin que su código tenga que pasar nada nuevo
 * (ficha M3-02, fila 13).
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
  destino = "/por-feature",
  camposOcultos,
  textoBoton = "Ver clientes",
}: {
  features: Pick<Feature, "id" | "name" | "code">[];
  /** El feature ya elegido (de `?feature=`), para que el selector no vuelva a "sin elegir". */
  featureElegidoId: string | null;
  /** A dónde manda el formulario. Default: `/por-feature` (M2-01), sin cambios. */
  destino?: string;
  /** Campos ocultos que viajan junto con `feature=`, como `{ por: "feature" }` desde "Lista
   * de release" (M3-02). Ninguno por default: `/por-feature` no necesita ninguno. */
  camposOcultos?: Record<string, string>;
  /** El texto del botón de confirmar: "Ver clientes" en `/por-feature` (default), "Ver lista"
   * en "Lista de release" — mismo verbo que ya usa `FormularioDeVersion` ahí para el otro
   * criterio. */
  textoBoton?: string;
}): React.ReactElement {
  return (
    <form method="get" action={destino} className="flex flex-wrap items-end gap-3">
      {camposOcultos
        ? Object.entries(camposOcultos).map(([nombre, valor]) => (
            <input key={nombre} type="hidden" name={nombre} value={valor} />
          ))
        : null}

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
        {textoBoton}
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
