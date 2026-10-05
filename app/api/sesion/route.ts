/**
 * El endpoint del portón: recibe la contraseña tipeada y, si es la de la app, abre la sesión.
 *
 * Es el único lugar donde se valida `APP_PASSWORD` (auth-y-permisos.md). La comparación es de
 * tiempo constante y la clave sale de variable de entorno (regla #2 · secretos.md): acá no hay
 * ningún valor escrito.
 *
 * Responde según lo que pida el cliente, para que la pantalla funcione en los dos caminos:
 *   - `Accept: application/json` (el formulario con JS): 200 / 401, así el error se muestra
 *     en la misma pantalla sin redirigir — es el criterio #2 de la ficha.
 *   - navegación normal (formulario enviado sin JS): 303 a `/` si entró, o de vuelta a
 *     `/ingresar?error=credencial` si no.
 */
import { NextResponse } from "next/server";

import { requireEnv } from "@/lib/env";
import {
  NOMBRE_COOKIE_SESION,
  contrasenaEsCorrecta,
  firmarSesion,
  opcionesDeCookieDeSesion,
} from "@/lib/sesion";

const SIN_CACHE = { "cache-control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  const datos = await request.formData().catch(() => null);
  const enviado = datos?.get("contrasena");
  const contrasena = typeof enviado === "string" ? enviado : "";
  const quiereJson = (request.headers.get("accept") ?? "").includes("application/json");

  if (!(await contrasenaEsCorrecta(contrasena, requireEnv("APP_PASSWORD")))) {
    return quiereJson
      ? NextResponse.json(
          { ok: false, error: "credencial" },
          { status: 401, headers: SIN_CACHE },
        )
      : NextResponse.redirect(new URL("/ingresar?error=credencial", request.url), 303);
  }

  const { token, expiraEn } = await firmarSesion(requireEnv("SESSION_SECRET"));
  const respuesta = quiereJson
    ? NextResponse.json({ ok: true }, { headers: SIN_CACHE })
    : NextResponse.redirect(new URL("/", request.url), 303);

  respuesta.cookies.set(NOMBRE_COOKIE_SESION, token, opcionesDeCookieDeSesion(expiraEn));
  return respuesta;
}
