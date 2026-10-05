"use client";

import { useState } from "react";

/**
 * El formulario del portón y sus tres estados (ficha M1-02 §4):
 *   - Carga: mientras el servidor verifica, el botón queda deshabilitado y lo dice (evita
 *     el doble envío).
 *   - Error: contraseña incorrecta → mensaje en la misma pantalla, sin redirigir.
 *   - Vacío: no aplica — esta pantalla siempre muestra el mismo formulario fijo.
 *
 * La verificación es siempre del lado del servidor (`POST /api/sesion`): acá no hay ninguna
 * contraseña ni ninguna comparación, solo el pedido y lo que se le muestra a la persona.
 * El `action`/`method` nativos del form dejan que funcione igual si el JS no cargó.
 */
const MENSAJES = {
  credencial: "Contraseña incorrecta. Revisala y probá de nuevo.",
  tecnico: "No se pudo verificar la contraseña. Probá de nuevo.",
} as const;

export function FormularioDeIngreso({
  errorInicial,
}: {
  errorInicial?: string;
}): React.ReactElement {
  const [error, setError] = useState(errorInicial ?? "");
  const [verificando, setVerificando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    if (verificando) {
      return;
    }

    const cuerpo = new FormData(evento.currentTarget);
    setVerificando(true);
    setError("");

    try {
      const respuesta = await fetch("/api/sesion", {
        method: "POST",
        headers: { accept: "application/json" },
        body: cuerpo,
      });

      if (respuesta.ok) {
        // Navegación completa a propósito: el middleware vuelve a correr ya con la cookie
        // de sesión puesta, sin riesgo de servir una respuesta cacheada del redirect.
        window.location.replace("/");
        return;
      }

      setError(respuesta.status === 401 ? MENSAJES.credencial : MENSAJES.tecnico);
    } catch {
      setError(MENSAJES.tecnico);
    }

    setVerificando(false);
  }

  return (
    <form
      action="/api/sesion"
      method="post"
      onSubmit={enviar}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contrasena" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={error.length > 0}
          aria-describedby={error ? "error-de-ingreso" : undefined}
          className="rounded-md border border-texto-secundario/25 bg-superficie px-3 py-2 text-sm outline-none focus:border-primario focus:ring-2 focus:ring-primario/25 disabled:opacity-60"
          disabled={verificando}
        />
      </div>

      {error ? (
        <p id="error-de-ingreso" role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={verificando}
        className="rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:cursor-not-allowed disabled:opacity-60"
      >
        {verificando ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
