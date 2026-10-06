/**
 * Estado de carga de la Vista de cliente (ficha M1-05 §4): esqueleto de **secciones**, no un
 * spinner centrado en pantalla en blanco.
 *
 * El encabezado (nombre + versión activa) no está acá: lo pinta la página sin esperar, porque
 * es la consulta que decide si el cliente existe (y si no, la ruta responde 404). Lo que se
 * espera —y lo que este esqueleto ocupa— son las dos secciones de abajo: features e
 * historial.
 *
 * Pulso de opacidad, lento, sin shimmer en diagonal (marca.md § Transiciones). Las medidas
 * son las de las tablas reales (encabezado 36px, fila 40px) para que al llegar los datos no
 * salte el layout.
 */
const FILAS_FANTASMA = [0, 1, 2];

function SeccionFantasma({ ancho }: { ancho: string }): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <div className={`h-5 ${ancho} animate-pulse rounded-md bg-borde-sutil`} />
      <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
        <div className="h-9 border-b border-borde-marcado" />
        <div className="divide-y divide-borde-sutil">
          {FILAS_FANTASMA.map((fila) => (
            <div key={fila} className="flex h-10 items-center gap-4 px-4">
              <div className="h-3 w-48 animate-pulse rounded-sm bg-borde-sutil" />
              <div className="h-3 w-16 animate-pulse rounded-sm bg-borde-sutil" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EsqueletoDeSecciones(): React.ReactElement {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Cargando los features y el historial del cliente.</span>
      <SeccionFantasma ancho="w-24" />
      <SeccionFantasma ancho="w-48" />
    </div>
  );
}
