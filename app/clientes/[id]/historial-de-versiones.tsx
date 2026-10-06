import type { FilaDeHistorial } from "@/lib/clientes";
import { fechaDeHistorial, historialMasRecientePrimero } from "@/lib/vista-de-cliente";

/**
 * El historial completo de cambios de versión del cliente (criterio #5 de la ficha M1-05):
 * fecha → versión, el más reciente primero, incluida la primera carga.
 *
 * Lo que se muestra acá ya se venía guardando desde M1-04; esta es la pantalla que lo hace
 * visible. `listarHistorialDeVersiones` lo devuelve en orden cronológico (es la secuencia que
 * se audita) y `historialMasRecientePrimero` lo invierte para leerlo.
 *
 * **Es un registro, no una lista navegable** (marca.md § Reglas de interfaz, que nombra justo
 * este caso): las filas no se resaltan al pasar el mouse ni muestran cursor de mano. Un
 * resaltado que no lleva a ningún lado es una promesa falsa. Tampoco hay acciones sobre las
 * filas: el historial no se edita ni se borra (`modelo-de-datos.md`).
 *
 * La versión va en monoespaciada: es para lo que se eligió la IBM Plex Mono — comparar
 * versiones entre filas de un vistazo.
 */
const CLASES_DE_ENCABEZADO = "h-9 px-4 text-left text-xs font-medium text-texto-secundario";
const CLASES_DE_CELDA = "px-4 py-2.5 text-sm align-middle";

export function HistorialDeVersiones({
  historial,
}: {
  historial: FilaDeHistorial[];
}): React.ReactElement {
  const filas = historialMasRecientePrimero(historial);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold tracking-tight">Historial de versiones</h2>
        <p className="text-sm text-texto-secundario">
          Cada cambio de versión de este cliente, con su fecha. El más reciente primero.
        </p>
      </div>

      {filas.length === 0 ? (
        /* No debería pasar: el alta deja la primera fila (M1-04). Si pasa, se dice, no se
           muestra una tabla vacía. */
        <p className="rounded-lg border border-borde-marcado bg-superficie p-5 text-sm">
          Todavía no hay cambios de versión registrados para este cliente.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-borde-marcado bg-superficie">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-borde-marcado">
                {/* La fecha tiene ancho fijo: así la versión queda pegada a ella y la
                    columna se lee como una sola línea de "cuándo → qué". */}
                <th scope="col" className={`${CLASES_DE_ENCABEZADO} w-48`}>
                  Fecha
                </th>
                <th scope="col" className={CLASES_DE_ENCABEZADO}>
                  Versión
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde-sutil">
              {filas.map((fila) => (
                <tr key={fila.id} className="h-10">
                  <td className={`${CLASES_DE_CELDA} text-texto-secundario`}>
                    <time dateTime={fila.recordedAt.toISOString()}>
                      {fechaDeHistorial(fila.recordedAt)}
                    </time>
                  </td>
                  <td className={`${CLASES_DE_CELDA} font-datos`}>{fila.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
