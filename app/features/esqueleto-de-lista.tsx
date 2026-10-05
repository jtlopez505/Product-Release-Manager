/**
 * Estado de carga de la lista (ficha M1-03 §4): skeleton de filas, no un spinner centrado en
 * pantalla en blanco — el mismo criterio que Inicio en `user-flow.md`.
 *
 * El pulso es de opacidad y lento (marca.md § Transiciones). Sin shimmer en diagonal: es
 * exactamente el gesto que el doc manda evitar porque delata el template.
 *
 * Las medidas son las de la tabla real (encabezado 36px, fila 40px) para que al llegar los
 * datos no salte el layout.
 */
const FILAS_FANTASMA = [0, 1, 2, 3];

export function EsqueletoDeLista(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-9 w-40 animate-pulse rounded-md bg-borde-sutil" />
      <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
        <div className="h-9 border-b border-borde-marcado" />
        <div role="status" className="divide-y divide-borde-sutil">
          <span className="sr-only">Cargando la lista de features.</span>
          {FILAS_FANTASMA.map((fila) => (
            <div key={fila} className="flex h-10 items-center gap-4 px-4">
              <div className="h-3 w-64 animate-pulse rounded-sm bg-borde-sutil" />
              <div className="h-3 w-16 animate-pulse rounded-sm bg-borde-sutil" />
              <div className="h-3 w-20 animate-pulse rounded-sm bg-borde-sutil" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
