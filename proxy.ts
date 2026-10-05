/**
 * El portón, aplicado: ninguna ruta de la app se ve sin una sesión válida.
 *
 * Mecanismo definido en docs/arquitectura/auth-y-permisos.md: sin cookie firmada vigente,
 * se redirige a `/ingresar`. Cierra por omisión — una ruta nueva queda protegida sola, sin
 * que nadie se acuerde de agregarla a una lista.
 *
 * Corre en el runtime Edge, por eso `lib/sesion.ts` usa Web Crypto y no `node:crypto`.
 *
 * El archivo se llama `proxy.ts` y no `middleware.ts` porque es el nombre que Next 16 le da
 * ahora a esa misma pieza: `middleware.ts` sigue funcionando pero avisa en cada build que
 * está deprecado. Es el mismo middleware de Next que define la arquitectura, con el nombre
 * de archivo que corresponde a la versión instalada.
 */
import { type NextRequest, NextResponse } from "next/server";

import { requireEnv } from "@/lib/env";
import { NOMBRE_COOKIE_SESION, rutaEsPublica, verificarSesion } from "@/lib/sesion";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (rutaEsPublica(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // En Edge, `process.env` solo se resuelve con la clave escrita literal: se la pasa a
  // `requireEnv` para conservar el fallo ruidoso si falta (criterio #7 de M1-01).
  const secreto = requireEnv("SESSION_SECRET", {
    SESSION_SECRET: process.env.SESSION_SECRET,
  });
  const token = request.cookies.get(NOMBRE_COOKIE_SESION)?.value;

  if (await verificarSesion(token, secreto)) {
    return NextResponse.next();
  }

  const aIngresar = NextResponse.redirect(new URL("/ingresar", request.url));
  if (token) {
    // Cookie vencida o inválida: se limpia para no arrastrarla en cada request.
    aIngresar.cookies.delete(NOMBRE_COOKIE_SESION);
  }
  return aIngresar;
}

export const config = {
  // Todo pasa por el portón menos los assets estáticos, que no son datos de la app.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|svg|ico|webp|woff2?|txt|xml)$).*)",
  ],
};
