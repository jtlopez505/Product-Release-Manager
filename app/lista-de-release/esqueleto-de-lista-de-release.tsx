/**
 * Estado de carga de la lista de release (ficha M3-01, fila 13): esqueleto de filas mientras
 * llega la lista, con el campo de versión ya a la vista (`app/lista-de-release/page.tsx` lo
 * resuelve fuera de este `Suspense`).
 *
 * Mismo criterio que `EsqueletoDeInicio` (M1-05) y `EsqueletoDeConsulta` (M2-01): pulso de
 * opacidad lento, sin shimmer en diagonal (marca.md § Transiciones), y las medidas de la
 * tabla real (encabezado 36px, fila 40px) para que no salte el layout al llegar los datos.
 */
const FILAS_FANTASMA = [0, 1, 2, 3, 4];

export function EsqueletoDeListaDeRelease(): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-5 w-64 animate-pulse rounded-sm bg-borde-sutil" />
      <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
        <div className="h-9 border-b border-borde-marcado" />
        <div role="status" className="divide-y divide-borde-sutil">
          <span className="sr-only">Cargando la lista de release.</span>
          {FILAS_FANTASMA.map((fila) => (
            <div key={fila} className="flex h-10 items-center gap-4 px-4">
              <div className="h-3 w-56 animate-pulse rounded-sm bg-borde-sutil" />
              <div className="h-3 w-16 animate-pulse rounded-sm bg-borde-sutil" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
