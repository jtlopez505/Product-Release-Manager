/**
 * La pantalla de ingreso: lo único que se ve sin sesión (middleware.ts).
 *
 * Una sola contraseña compartida para todo el equipo — no hay cuentas individuales en el MVP
 * (auth-y-permisos.md). Tono y densidad de docs/arquitectura/marca.md: una tarjeta compacta,
 * sin ilustración ni copy motivacional; es una herramienta de trabajo, no una landing.
 */
import type { Metadata } from "next";

import { FormularioDeIngreso } from "./formulario-de-ingreso";

export const metadata: Metadata = {
  title: "Ingresar · ReleaseView",
};

const MENSAJE_POR_ERROR: Record<string, string> = {
  credencial: "Contraseña incorrecta. Revisala y probá de nuevo.",
};

/**
 * El aviso de que la sesión se cerró (M4-02). Sigue el mismo patrón que `?error=`: un
 * parámetro de la URL traducido a texto acá, nunca el texto en la URL. Sin este aviso, la
 * pantalla sería indistinguible de "se te venció la sesión" o "nunca entraste".
 */
const MENSAJE_POR_SALIDA: Record<string, string> = {
  "1": "Cerraste sesión.",
};

export default async function Ingresar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; salio?: string }>;
}) {
  // El `?error=` solo aparece en el camino sin JS, donde el endpoint redirige acá.
  // El `?salio=` lo pone siempre `POST /api/salir`, que redirige con 303.
  const { error, salio } = await searchParams;
  const aviso = salio ? MENSAJE_POR_SALIDA[salio] : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-5 px-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">ReleaseView</h1>
        <p className="text-sm text-texto-secundario">
          Panel interno del equipo. Ingresá la contraseña para ver qué versión y qué
          features tiene cada cliente.
        </p>
      </div>

      {/* Una línea de texto y no un panel: la salida salió bien, no hay nada que resolver.
          `role="status"` para que el lector de pantalla lo anuncie al llegar, sin la urgencia
          de un `alert` — eso queda para el error de contraseña, que sí pide una acción. */}
      {aviso ? (
        <p role="status" className="text-sm">
          {aviso}
        </p>
      ) : null}

      {/* Tarjeta delimitada con borde y no con sombra (marca.md § Reglas de interfaz): la
          sombra queda para lo que flota sobre contenido. El borde es el token de marca, no
          un color con alfa: el mismo pixel que antes, con nombre propio. */}
      <div className="rounded-lg border border-borde-marcado bg-superficie p-5">
        <FormularioDeIngreso errorInicial={error ? MENSAJE_POR_ERROR[error] : undefined} />
      </div>

      <p className="text-xs text-texto-secundario">
        La contraseña es la misma para todo el equipo. Si no la tenés, pedila a quien
        administra el panel.
      </p>
    </main>
  );
}
