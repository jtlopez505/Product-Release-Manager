/**
 * Estado de carga de la consulta por feature (ficha M2-01, fila 15): esqueleto de filas en
 * las dos listas, mientras el selector y el feature elegido —que no dependen de esta
 * consulta— ya están a la vista arriba (`app/por-feature/page.tsx` los resuelve fuera de este
 * `Suspense`).
 *
 * Mismo criterio que `EsqueletoDeLista` (M1-03) y `EsqueletoDeSecciones` (M1-05): pulso de
 * opacidad lento, sin shimmer en diagonal (marca.md § Transiciones), y las medidas de la
 * tabla real (encabezado 36px, fila 40px) para que no salte el layout al llegar los datos.
 * Dos columnas, para que el esqueleto ya anticipe el layout lado a lado en pantalla ancha.
 */
const FILAS_FANTASMA = [0, 1, 2, 3];
const COLUMNAS = [0, 1];

function ColumnaFantasma(): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-5 w-48 animate-pulse rounded-sm bg-borde-sutil" />
      <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
        <div className="h-9 border-b border-borde-marcado" />
        <div className="divide-y divide-borde-sutil">
          {FILAS_FANTASMA.map((fila) => (
            <div key={fila} className="flex h-10 items-center gap-4 px-4">
              <div className="h-3 w-40 animate-pulse rounded-sm bg-borde-sutil" />
              <div className="h-3 w-14 animate-pulse rounded-sm bg-borde-sutil" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EsqueletoDeConsulta(): React.ReactElement {
  return (
    <div role="status" className="grid gap-4 lg:grid-cols-2">
      <span className="sr-only">Cargando la consulta por feature.</span>
      {COLUMNAS.map((columna) => (
        <ColumnaFantasma key={columna} />
      ))}
    </div>
  );
}
