import Link from "next/link";

/**
 * La pantalla de "no existe", con la marca puesta.
 *
 * Es lo que ve alguien que arma una URL a mano: un id de cliente que no existe o —criterio #7
 * de la ficha M1-05, regla #1— uno que pertenece a otra organización. Las dos cosas se
 * responden igual, sin pistas: no se confirma que ese id exista en otra parte.
 *
 * Reemplaza la pantalla por omisión de Next (que no tiene nada de esta app) por una que habla
 * como una persona y ofrece la salida — marca.md § Voz y tono: sin "Oops" y sin signos de
 * exclamación.
 */
export default function NoEncontrado(): React.ReactElement {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Esa dirección no existe</h1>
      <p className="text-sm text-texto-secundario">
        Puede que el cliente que buscás ya no esté o que el enlace esté mal escrito.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active"
      >
        Ir a la lista de clientes
      </Link>
    </main>
  );
}
