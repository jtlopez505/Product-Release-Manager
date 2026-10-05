"use client";

import { useEffect } from "react";

import { MENSAJES_DE_FEATURE } from "@/lib/validacion-de-feature";

/**
 * Estado de error de la pantalla (ficha M1-03 §4): si falla traer la lista, se dice qué pasó
 * y se ofrece la salida — "Reintentar", que vuelve a renderizar el segmento.
 *
 * El detalle técnico va a la consola del servidor/navegador, no a la pantalla: marca.md pide
 * que los errores hablen como una persona, no como un log.
 */
export default function ErrorDeFeatures({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    console.error("No se pudo cargar la lista de features:", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Features</h1>
      <div className="flex flex-col items-start gap-3 rounded-lg border border-borde-marcado bg-superficie p-5">
        <p role="alert" className="text-sm">
          {MENSAJES_DE_FEATURE.cargaFallida}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-borde-control px-3 py-2 text-sm font-medium transition-[background-color] duration-[120ms] ease-out hover:bg-hover active:bg-seleccionado"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
