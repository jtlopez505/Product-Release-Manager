import Link from "next/link";

import type { CriterioDeListaDeRelease } from "@/lib/lista-de-release";

/**
 * La elección de criterio de "Lista de release" (ficha M3-02, fila 1): "Por versión destino"
 * (el criterio de M3-01, activo por defecto) o "Por feature" — un criterio a la vez
 * (`user-flow.md` §5: "no combinados con AND en el MVP").
 *
 * Cuál está activo lo decide la URL (`?por=feature`; sin `?por=` o con cualquier otro valor,
 * "por versión" — `lib/lista-de-release.ts#criterioActivo`), no un estado de cliente: así este
 * es un componente de servidor y funciona sin JS (criterio #14), y cambiar de criterio con un
 * link nunca arrastra la selección del otro (fila 10): el link de cada opción no lleva el
 * parámetro del criterio contrario.
 *
 * **Pregunta abierta para el Diseñador** (reportada en la ficha, anexo técnico): `marca.md` no
 * define el aspecto de "elegir uno de dos criterios dentro de una pantalla" — solo el de la
 * navegación de nivel superior. Se usa el valor ya declarado más cercano, en vez de inventar
 * uno nuevo: exactamente los mismos tokens que la pestaña activa de `Navegacion`
 * (`app/navegacion.tsx`) — `bg-seleccionado text-primario` para la activa,
 * `text-texto-secundario hover:bg-hover active:bg-seleccionado` para la inactiva.
 */
const CRITERIOS = [
  { criterio: "version", etiqueta: "Por versión destino", destino: "/lista-de-release" },
  { criterio: "feature", etiqueta: "Por feature", destino: "/lista-de-release?por=feature" },
] as const satisfies readonly {
  criterio: CriterioDeListaDeRelease;
  etiqueta: string;
  destino: string;
}[];

const CLASES_DE_OPCION =
  "rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color] duration-[120ms] ease-out";
const CLASES_ACTIVA = "bg-seleccionado text-primario";
const CLASES_INACTIVA = "text-texto-secundario hover:bg-hover active:bg-seleccionado";

export function CriterioDeFiltro({
  activo,
}: {
  activo: CriterioDeListaDeRelease;
}): React.ReactElement {
  return (
    <nav aria-label="Criterio de filtro" className="flex items-center gap-1">
      {CRITERIOS.map(({ criterio, etiqueta, destino }) => {
        const activa = criterio === activo;
        return (
          <Link
            key={criterio}
            href={destino}
            aria-current={activa ? "page" : undefined}
            className={`${CLASES_DE_OPCION} ${activa ? CLASES_ACTIVA : CLASES_INACTIVA}`}
          >
            {etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
