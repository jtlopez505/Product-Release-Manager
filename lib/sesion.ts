/**
 * El portón de acceso: validar la contraseña compartida y firmar/verificar la sesión.
 *
 * El mecanismo lo define docs/arquitectura/auth-y-permisos.md y acá no se reinventa:
 * una sola contraseña (`APP_PASSWORD`) para toda la app, y al acertarla una cookie
 * httpOnly firmada con `SESSION_SECRET` que vence a los ~30 días. La firma es stateless:
 * no hay tabla de sesiones en la base.
 *
 * Dos detalles que no son decoración:
 *   - La comparación de la contraseña es de **tiempo constante** (docs/arquitectura/secretos.md):
 *     se comparan digests SHA-256 de largo fijo, nunca los strings con `===`, que corta en el
 *     primer byte distinto y filtra información por el reloj.
 *   - Todo usa **Web Crypto** (`crypto.subtle`), no el módulo `node:crypto`: el middleware de
 *     Next.js corre en el runtime Edge, donde `node:crypto` no existe. Así el mismo módulo
 *     sirve al middleware, al endpoint y a los tests.
 *
 * Ningún secreto vive acá: los valores entran por parámetro, leídos con `requireEnv` (regla #2).
 */

/** Nombre de la cookie de sesión. No lleva ningún valor sensible: solo el token firmado. */
export const NOMBRE_COOKIE_SESION = "releaseview_sesion";

/** ~30 días, la expiración que define auth-y-permisos.md. */
export const DURACION_SESION_SEGUNDOS = 30 * 24 * 60 * 60;

/** Versión del formato del token: si algún día cambia la firma, los viejos se invalidan solos. */
const VERSION_TOKEN = "v1";

/** Las únicas rutas que se pueden ver sin sesión: la pantalla de ingreso y su endpoint. */
const RUTAS_PUBLICAS = new Set(["/ingresar", "/api/sesion"]);

const codificador = new TextEncoder();

function aBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function digest(valor: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", codificador.encode(valor)));
}

/**
 * Compara dos secuencias de bytes sin cortar en el primer byte distinto: el tiempo que
 * tarda depende del largo, no del contenido. Los digests SHA-256 siempre miden 32 bytes,
 * así que el largo no filtra nada del valor original.
 */
function sonIgualesEnTiempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diferencia = 0;
  for (let i = 0; i < a.length; i += 1) {
    diferencia |= a[i] ^ b[i];
  }
  return diferencia === 0;
}

/**
 * ¿La contraseña tipeada es la contraseña compartida de la app?
 * Comparación de tiempo constante sobre digests (secretos.md); `esperada` sale de
 * `requireEnv("APP_PASSWORD")`, nunca del código.
 */
export async function contrasenaEsCorrecta(
  tipeada: string,
  esperada: string,
): Promise<boolean> {
  const [digestTipeada, digestEsperada] = await Promise.all([
    digest(tipeada),
    digest(esperada),
  ]);
  return sonIgualesEnTiempoConstante(digestTipeada, digestEsperada);
}

async function firmar(secreto: string, mensaje: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("HMAC", clave, codificador.encode(mensaje));
  return aBase64Url(new Uint8Array(firma));
}

/**
 * Emite el token de sesión: `v1.<vencimiento>.<firma HMAC-SHA256>`.
 * No guarda ni transporta la contraseña — solo dice "esta sesión vale hasta tal momento",
 * y la firma es lo que hace que ese plazo no se pueda estirar desde el navegador.
 */
export async function firmarSesion(
  secreto: string,
  ahora: number = Date.now(),
): Promise<{ token: string; expiraEn: number }> {
  const expiraEn = ahora + DURACION_SESION_SEGUNDOS * 1000;
  const carga = `${VERSION_TOKEN}.${expiraEn}`;
  return { token: `${carga}.${await firmar(secreto, carga)}`, expiraEn };
}

/**
 * ¿El token de la cookie es una sesión válida y vigente?
 * Devuelve `false` ante cualquier duda (ausente, mal formado, otra firma, vencido): el
 * portón se cierra, nunca se abre por omisión.
 */
export async function verificarSesion(
  token: string | undefined | null,
  secreto: string,
  ahora: number = Date.now(),
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const partes = token.split(".");
  if (partes.length !== 3) {
    return false;
  }

  const [version, expiraEnCrudo, firmaRecibida] = partes;
  if (version !== VERSION_TOKEN) {
    return false;
  }

  const expiraEn = Number(expiraEnCrudo);
  if (!Number.isSafeInteger(expiraEn) || expiraEn <= ahora) {
    return false;
  }

  const firmaEsperada = await firmar(secreto, `${version}.${expiraEnCrudo}`);
  return sonIgualesEnTiempoConstante(
    codificador.encode(firmaRecibida),
    codificador.encode(firmaEsperada),
  );
}

/**
 * Atributos de la cookie de sesión (auth-y-permisos.md): `httpOnly` para que ningún script
 * la lea, `secure` para que no viaje en claro, `sameSite: lax` para que el link a la app
 * siga funcionando, y el vencimiento de la sesión.
 *
 * `secure` se apaga solo en desarrollo local, donde `next dev` sirve por http:// y el
 * navegador descartaría la cookie. En producción (Vercel, https) va siempre encendida.
 */
export function opcionesDeCookieDeSesion(
  expiraEn: number,
  ahora: number = Date.now(),
): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  expires: Date;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(0, Math.round((expiraEn - ahora) / 1000)),
    expires: new Date(expiraEn),
  };
}

/** ¿Esta ruta se puede ver sin sesión? Coincidencia exacta: nada entra por prefijo parecido. */
export function rutaEsPublica(pathname: string): boolean {
  const normalizada =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return RUTAS_PUBLICAS.has(normalizada);
}
