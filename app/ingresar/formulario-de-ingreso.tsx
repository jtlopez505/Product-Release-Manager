"use client";

import { useState } from "react";

/**
 * El formulario del portón y sus tres estados (ficha M1-02 §4):
 *   - Carga: mientras el servidor verifica, el botón pasa a "ocupado" — lo dice en el label,
 *     en color pleno, con los clics bloqueados (evita el doble envío). Ocupado no es
 *     deshabilitado: no se atenúa, porque el label es justo lo que hay que poder leer.
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
        {/* Borde de control de marca.md (3.68:1): es lo que identifica dónde se escribe, así
            que es el único borde con mínimo de contraste exigible. El foco lo pinta la regla
            global de `:focus-visible` (app/globals.css) — por eso acá no se anula el outline
            ni se dibuja un anillo propio. */}
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={error.length > 0}
          aria-describedby={error ? "error-de-ingreso" : undefined}
          className="rounded-md border border-borde-control bg-superficie px-3 py-2 text-sm focus:border-primario"
          disabled={verificando}
        />
      </div>

      {error ? (
        <p id="error-de-ingreso" role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {/* "Verificando…" es OCUPADO, no deshabilitado (marca.md § Reglas de interfaz): color
          pleno, `aria-busy` y los clics bloqueados. El label comunica el estado y el usuario
          necesita poder leerlo — atenuarlo lo dejaba en 3.57:1. La opacidad queda reservada
          para controles realmente deshabilitados. Hover y active salen de los tokens del
          primario: aclarar/oscurecer el relleno, nunca bajar la opacidad del botón entero.
          La transición es solo de fondo (120ms ease-out) para no demorar el outline de foco,
          que es instantáneo. */}
      <button
        type="submit"
        disabled={verificando}
        aria-busy={verificando}
        className="rounded-md bg-primario px-3 py-2 text-sm font-medium text-superficie transition-[background-color] duration-[120ms] ease-out hover:bg-primario-hover active:bg-primario-active"
      >
        {verificando ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
