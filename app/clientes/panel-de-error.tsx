/**
 * El estado de error de las pantallas de cliente (ficha §4): qué pasó y cómo reintentar.
 *
 * Se renderiza en el servidor y no desde un `error.tsx`: cuando la base falla, el mensaje
 * viaja en el HTML y se ve aunque el JS no haya cargado. Mismo criterio que M1-03.
 *
 * "Reintentar" es un `<a>` y no un `<Link>` a propósito: hace una carga completa de la ruta,
 * que es lo que vuelve a intentar la consulta de verdad. Un `Link` a la misma URL podría
 * resolverse del cache del router y no reintentar nada.
 */
export function PanelDeError({
  mensaje,
  reintentarEn,
}: {
  mensaje: string;
  reintentarEn: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
      <p role="alert" className="text-sm">
        {mensaje}
      </p>
      <a
        href={reintentarEn}
        className="rounded-md border border-borde-control px-3 py-2 text-sm font-medium transition-[background-color] duration-[120ms] ease-out hover:bg-hover active:bg-seleccionado"
      >
        Reintentar
      </a>
    </div>
  );
}
