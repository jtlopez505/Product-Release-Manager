"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Pantalla de último recurso: falló el renderizado de toda la app (ni el layout se salvó).
 * Reporta el error a Sentry y ofrece reintentar. Tono de marca.md: sin "Oops" ni exclamaciones.
 */
export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <main className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 px-6 py-10">
          <h1 className="text-xl font-semibold tracking-tight">Algo salió mal.</h1>
          <p className="text-sm text-texto-secundario">
            No pudimos mostrar esta pantalla. Probá de nuevo; si sigue igual, avisá al equipo.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active"
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
