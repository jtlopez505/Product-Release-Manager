import Link from "next/link";

/**
 * La navegación de nivel superior (docs/arquitectura/user-flow.md §1): dos pestañas, "Por
 * cliente" y "Por feature" — cambiar de ángulo de consulta es un clic.
 *
 * Llega con M1-05 y **retira los dos puentes** que las piezas anteriores habían dejado: el
 * link suelto a `/features` que M1-03 puso en Inicio, y el hecho de que a `/clientes/nuevo`
 * solo se llegaba escribiendo la URL (ahora cuelga del "+ Agregar cliente" de Inicio).
 *
 * En M1, "Por feature" lleva a la lista maestra de features: es la única pantalla de ese
 * ángulo que existe todavía, y `user-flow.md` §2.1 la pone justo ahí ("accesible desde Por
 * feature"). La consulta por feature de M2 se suma a esa misma pestaña cuando llegue.
 *
 * No está en `app/layout.tsx` a propósito: el portón (`/ingresar`) no tiene navegación —
 * todavía no se entró — y los formularios de cliente tampoco, porque salir de ahí por un
 * link costaría lo tipeado (ver `formulario-de-cliente.tsx`: la salida es "Cancelar", que
 * pregunta antes de descartar).
 *
 * Cuál pestaña está activa lo decide la pantalla por `prop`, no `usePathname`: así esto es un
 * componente de servidor y la navegación se pinta igual antes de que cargue el JS.
 */
export type SeccionActual = "clientes" | "features";

const SECCIONES = [
  { seccion: "clientes", etiqueta: "Por cliente", destino: "/" },
  { seccion: "features", etiqueta: "Por feature", destino: "/features" },
] as const satisfies readonly { seccion: SeccionActual; etiqueta: string; destino: string }[];

/* La pestaña activa toma el tinte de "control presionado" de marca.md y además queda en el
   primario: el color no va solo, lo acompaña `aria-current`. Hover solo en las otras, que
   son las que llevan a algún lado nuevo. */
const CLASES_DE_PESTANA =
  "rounded-md px-3 py-1.5 text-sm font-medium transition-[background-color] duration-[120ms] ease-out";
const CLASES_ACTIVA = "bg-seleccionado text-primario";
const CLASES_INACTIVA = "text-texto-secundario hover:bg-hover active:bg-seleccionado";

export function Navegacion({ actual }: { actual: SeccionActual }): React.ReactElement {
  return (
    <header className="border-b border-borde-marcado bg-superficie">
      <div className="mx-auto flex h-12 w-full max-w-4xl items-center gap-6 px-6">
        <span className="text-sm font-semibold tracking-tight">ReleaseView</span>
        <nav aria-label="Secciones" className="flex items-center gap-1">
          {SECCIONES.map(({ seccion, etiqueta, destino }) => {
            const activa = seccion === actual;
            return (
              <Link
                key={seccion}
                href={destino}
                aria-current={activa ? "page" : undefined}
                className={`${CLASES_DE_PESTANA} ${activa ? CLASES_ACTIVA : CLASES_INACTIVA}`}
              >
                {etiqueta}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
