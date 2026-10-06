"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { FilaDeListaDeClientes } from "@/lib/clientes";
import { ETIQUETAS_DE_CLIENTE } from "@/lib/validacion-de-cliente";

/**
 * La lista de clientes de Inicio: una fila por cliente, con su versión activa a la vista
 * (criterios #1 y #2 de la ficha M1-05). La pregunta "qué versión tiene cada uno" se
 * responde sin abrir ninguno.
 *
 * Abrir una fila es navegar a `/clientes/<id>`: el nombre es un link de verdad (sirve con
 * teclado, con el botón del medio y sin JS) y el resto de la fila acompaña ese mismo destino
 * con un clic — el mismo patrón que la lista maestra de M1-03.
 *
 * Reglas de interfaz de docs/arquitectura/marca.md que esta tabla sostiene:
 *   - Fila de 40px (`h-10`) y encabezado de 36px (`h-9`); celda 14px, encabezado 12px medium
 *     en texto secundario, **sin mayúsculas ni letter-spacing**.
 *   - **Sin zebra:** la densidad la dan el divisor de 1px y el alto de fila.
 *   - **Hover solo donde hay clic:** acá cada fila ES navegable, así que lleva hover y
 *     `cursor-pointer`. Con teclado, `focus-within` la pinta con el tinte de seleccionada.
 *   - La versión va en monoespaciada (`font-datos`): es para lo que se eligió la IBM Plex
 *     Mono — comparar versiones entre filas de un vistazo.
 */
const CLASES_DE_ENCABEZADO = "h-9 px-4 text-left text-xs font-medium text-texto-secundario";
const CLASES_DE_CELDA = "px-4 py-2.5 text-sm align-middle";

export function rutaDeCliente(id: string): string {
  return `/clientes/${encodeURIComponent(id)}`;
}

export function TablaDeClientes({
  clientes,
}: {
  clientes: FilaDeListaDeClientes[];
}): React.ReactElement {
  const router = useRouter();

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-borde-marcado">
          <th scope="col" className={CLASES_DE_ENCABEZADO}>
            {ETIQUETAS_DE_CLIENTE.name}
          </th>
          <th scope="col" className={CLASES_DE_ENCABEZADO}>
            {ETIQUETAS_DE_CLIENTE.currentVersion}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-borde-sutil">
        {clientes.map((cliente) => (
          <tr
            key={cliente.id}
            onClick={() => router.push(rutaDeCliente(cliente.id))}
            className="h-10 cursor-pointer transition-[background-color] duration-[120ms] ease-out hover:bg-hover focus-within:bg-seleccionado"
          >
            <td className={`${CLASES_DE_CELDA} font-medium`}>
              {/* El nombre es el link: la fila se abre también con teclado (Tab + Enter) y
                  sin JavaScript, no solo con el mouse. */}
              <Link href={rutaDeCliente(cliente.id)}>{cliente.name}</Link>
            </td>
            <td className={`${CLASES_DE_CELDA} font-datos`}>{cliente.currentVersion}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
