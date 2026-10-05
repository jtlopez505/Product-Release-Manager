"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Feature } from "@/lib/features";
import {
  ETIQUETAS_DE_ESTADO,
  ETIQUETAS_DE_FEATURE,
  ETIQUETAS_DE_PRIORIDAD,
} from "@/lib/validacion-de-feature";

/**
 * La lista maestra: una fila por feature, con lo que se necesita ver de un vistazo (ficha
 * M1-03 §4, paso 2). El resto del catálogo se ve al abrir la fila en edición.
 *
 * Abrir una fila es navegar a `/features?editar=<id>`: el nombre es un link de verdad (sirve
 * con teclado, con el botón del medio y sin JS) y el resto de la fila acompaña ese mismo
 * destino con un clic.
 *
 * Densidad y reglas de interfaz de docs/arquitectura/marca.md:
 *   - Fila de 40px (`h-10`, 10px vertical / 16px horizontal) y encabezado de 36px (`h-9`),
 *     celda de 14px y encabezado de 12px medium en texto secundario — **sin mayúsculas ni
 *     letter-spacing**, que es marca de template.
 *   - **Sin filas alternadas (zebra):** la densidad la dan el divisor de 1px y el alto de
 *     fila; el zebra competiría con el hover y con la fila enfocada.
 *   - **Hover solo donde hay clic:** acá cada fila ES navegable (abre la edición), así que
 *     lleva hover y `cursor-pointer`. Con teclado, `focus-within` pinta la fila con el tinte
 *     de seleccionada, para que recorrer con Tab se vea como con el mouse.
 *   - El divisor entre filas es el borde sutil; el pie del encabezado, el borde marcado.
 */
const CLASES_DE_ENCABEZADO = "h-9 px-4 text-left text-xs font-medium text-texto-secundario";
const CLASES_DE_CELDA = "px-4 py-2.5 text-sm align-middle";

export function rutaDeEdicion(id: string): string {
  return `/features?editar=${encodeURIComponent(id)}`;
}

/**
 * El estado del feature como chip (marca.md § Semánticos para texto y chips). El color nunca
 * va solo: el chip siempre dice la palabra, porque verde y ámbar casi no se diferencian en
 * luminancia para quien tiene deuteranopia.
 */
const CLASES_POR_ESTADO: Record<Feature["estado"], string> = {
  DISPONIBLE: "bg-chip-exito text-exito",
  EN_DESARROLLO: "bg-chip-alerta text-alerta-texto",
  // Pregunta abierta para el Diseñador: marca.md define chip de éxito, de alerta y de error,
  // pero no uno neutro. Se usa el relleno de skeleton (= borde sutil) con texto secundario,
  // que es el valor más cercano ya declarado — no se inventa un color nuevo.
  PROXIMAMENTE: "bg-borde-sutil text-texto-secundario",
};

function ChipDeEstado({ estado }: { estado: Feature["estado"] }): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${CLASES_POR_ESTADO[estado]}`}
    >
      {ETIQUETAS_DE_ESTADO[estado]}
    </span>
  );
}

export function TablaDeFeatures({
  features,
  idEnEdicion,
}: {
  features: Feature[];
  idEnEdicion: string | null;
}): React.ReactElement {
  const router = useRouter();

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-borde-marcado">
          <th scope="col" className={CLASES_DE_ENCABEZADO}>
            {ETIQUETAS_DE_FEATURE.name}
          </th>
          <th scope="col" className={CLASES_DE_ENCABEZADO}>
            {ETIQUETAS_DE_FEATURE.code}
          </th>
          <th scope="col" className={CLASES_DE_ENCABEZADO}>
            {ETIQUETAS_DE_FEATURE.prioridad}
          </th>
          <th scope="col" className={CLASES_DE_ENCABEZADO}>
            {ETIQUETAS_DE_FEATURE.estado}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-borde-sutil">
        {features.map((feature) => (
          <tr
            key={feature.id}
            onClick={() => router.push(rutaDeEdicion(feature.id))}
            className={`h-10 cursor-pointer transition-[background-color] duration-[120ms] ease-out hover:bg-hover focus-within:bg-seleccionado ${
              feature.id === idEnEdicion ? "bg-seleccionado" : ""
            }`}
          >
            <td className={`${CLASES_DE_CELDA} font-medium`}>
              {/* El nombre es el link: la fila se abre también con teclado (Tab + Enter) y
                  sin JavaScript, no solo con el mouse. */}
              <Link href={rutaDeEdicion(feature.id)}>{feature.name}</Link>
            </td>
            <td className={`${CLASES_DE_CELDA} font-datos text-texto-secundario`}>
              {feature.code ?? "—"}
            </td>
            <td className={CLASES_DE_CELDA}>
              {feature.prioridad ? (
                ETIQUETAS_DE_PRIORIDAD[feature.prioridad]
              ) : (
                <span className="text-texto-secundario">Sin definir</span>
              )}
            </td>
            <td className={CLASES_DE_CELDA}>
              <ChipDeEstado estado={feature.estado} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
