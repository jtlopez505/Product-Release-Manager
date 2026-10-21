/**
 * El endpoint de salida: cierra la sesión de este navegador y devuelve al portón.
 *
 * Es la contracara de `app/api/sesion/route.ts`, y lo único que hace es **borrar la cookie**:
 * no lee la base, no necesita ninguna clave (regla #2 · secretos.md) y no puede fallar por
 * lógica. La sesión es una firma stateless, así que acá no hay nada que invalidar del lado
 * del servidor — ver `docs/arquitectura/auth-y-permisos.md` § Cómo se sale: cerrar sesión
 * resuelve "me levanto de la máquina", no "se filtró el link".
 *
 * **Solo `POST`, nunca un link GET.** Un logout por GET lo dispara cualquier prefetch o
 * `<img>` de una página y saca al usuario sin que lo haya pedido; con solo `POST` exportado,
 * un GET a esta ruta responde 405 y no toca ninguna cookie (criterio #7 de M4-02). Se sirve
 * con un `<form method="post">` en el encabezado, así funciona igual si el JS no cargó — el
 * mismo criterio de doble camino del endpoint de ingreso.
 *
 * **No está en `RUTAS_PUBLICAS`:** solo cierra sesión quien tiene una. Sin cookie válida,
 * `proxy.ts` intercepta el pedido y redirige a `/ingresar` antes de llegar hasta acá — mismo
 * resultado, sin agujero.
 */
import { NextResponse } from "next/server";

import { NOMBRE_COOKIE_SESION, opcionesDeCookieDeSesion } from "@/lib/sesion";

/**
 * La cookie de sesión, ya vencida: `Max-Age=0` y `expires` en el epoch. Los atributos salen
 * de `opcionesDeCookieDeSesion` y no se reescriben a mano porque el **`path` tiene que ser el
 * mismo** que el de la cookie original: si no coincide, el navegador guarda una cookie nueva
 * y deja la vieja viva.
 */
const EPOCH = 0;

export function POST(request: Request): Response {
  // 303: la respuesta a un POST se sigue con un GET, así "atrás" no reenvía el formulario.
  // El `?salio=1` es lo que le permite al portón decir qué pasó, en vez de parecer una
  // sesión vencida o un primer ingreso (criterio #5).
  const respuesta = NextResponse.redirect(new URL("/ingresar?salio=1", request.url), 303);

  respuesta.cookies.set(NOMBRE_COOKIE_SESION, "", opcionesDeCookieDeSesion(EPOCH, EPOCH));
  return respuesta;
}
