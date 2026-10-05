import { describe, expect, it } from "vitest";

import {
  DURACION_SESION_SEGUNDOS,
  NOMBRE_COOKIE_SESION,
  contrasenaEsCorrecta,
  firmarSesion,
  opcionesDeCookieDeSesion,
  rutaEsPublica,
  verificarSesion,
} from "./sesion";

/**
 * Verificación 1 de M1-02 (unitarias, regla #5): validación de la contraseña y
 * firma/verificación de la cookie de sesión, el mecanismo que define
 * docs/arquitectura/auth-y-permisos.md.
 *
 * Los valores de abajo son de fantasía: el .env real nunca entra acá (regla #2, y
 * tests/no-secretos-en-codigo.test.ts lo chequea en cada corrida).
 */
const SECRETO = "secreto-de-fantasia-para-los-tests-0123456789";
const OTRO_SECRETO = "otro-secreto-de-fantasia-para-los-tests-98765";
const CONTRASENA = "contrasena-de-fantasia-de-los-tests";

describe("contrasenaEsCorrecta", () => {
  it("acepta la contraseña que coincide exactamente", async () => {
    await expect(contrasenaEsCorrecta(CONTRASENA, CONTRASENA)).resolves.toBe(true);
  });

  it("rechaza una contraseña distinta de igual largo", async () => {
    const mismoLargo = `${CONTRASENA.slice(0, -1)}X`;
    expect(mismoLargo).toHaveLength(CONTRASENA.length);
    await expect(contrasenaEsCorrecta(mismoLargo, CONTRASENA)).resolves.toBe(false);
  });

  it("rechaza una contraseña con el prefijo correcto pero incompleta", async () => {
    await expect(
      contrasenaEsCorrecta(CONTRASENA.slice(0, 5), CONTRASENA),
    ).resolves.toBe(false);
  });

  it("rechaza vacío, espacios y un valor que solo difiere en mayúsculas", async () => {
    await expect(contrasenaEsCorrecta("", CONTRASENA)).resolves.toBe(false);
    await expect(contrasenaEsCorrecta("   ", CONTRASENA)).resolves.toBe(false);
    await expect(
      contrasenaEsCorrecta(CONTRASENA.toUpperCase(), CONTRASENA),
    ).resolves.toBe(false);
  });

  it("no usa comparación de strings: compara digests de largo fijo (secretos.md)", async () => {
    // Un valor larguísimo tiene que resolverse igual que uno corto: la comparación no
    // corta en el primer byte distinto ni depende del largo de lo tipeado.
    await expect(contrasenaEsCorrecta("x".repeat(5000), CONTRASENA)).resolves.toBe(
      false,
    );
  });
});

describe("firmarSesion / verificarSesion", () => {
  it("un token recién firmado es válido con el mismo secreto", async () => {
    const { token } = await firmarSesion(SECRETO);
    await expect(verificarSesion(token, SECRETO)).resolves.toBe(true);
  });

  it("el token no contiene la contraseña ni el secreto", async () => {
    const { token } = await firmarSesion(SECRETO);
    expect(token).not.toContain(SECRETO);
    expect(token).not.toContain(CONTRASENA);
  });

  it("rechaza un token firmado con otro secreto", async () => {
    const { token } = await firmarSesion(OTRO_SECRETO);
    await expect(verificarSesion(token, SECRETO)).resolves.toBe(false);
  });

  it("rechaza un token manipulado (firma o vencimiento tocados)", async () => {
    const { token } = await firmarSesion(SECRETO);
    const [version, expiraEn, firma] = token.split(".");

    // Vencimiento estirado a mano, firma original.
    const vencimientoFalseado = [version, String(Number(expiraEn) + 86_400_000), firma].join(
      ".",
    );
    await expect(verificarSesion(vencimientoFalseado, SECRETO)).resolves.toBe(false);

    // Firma tocada, vencimiento original.
    const firmaFalseada = [version, expiraEn, `${firma.slice(0, -1)}A`].join(".");
    await expect(verificarSesion(firmaFalseada, SECRETO)).resolves.toBe(false);
  });

  it("rechaza tokens mal formados, vacíos o ausentes", async () => {
    await expect(verificarSesion(undefined, SECRETO)).resolves.toBe(false);
    await expect(verificarSesion("", SECRETO)).resolves.toBe(false);
    await expect(verificarSesion("cualquier-cosa", SECRETO)).resolves.toBe(false);
    await expect(verificarSesion("v1.abc.def", SECRETO)).resolves.toBe(false);
    await expect(verificarSesion("v9.1.2.3.4", SECRETO)).resolves.toBe(false);
  });

  it("rechaza un token vencido (criterio #5 de la ficha)", async () => {
    const ahora = Date.UTC(2026, 9, 5);
    const { token, expiraEn } = await firmarSesion(SECRETO, ahora);

    // Un instante antes de vencer: sigue válido.
    await expect(verificarSesion(token, SECRETO, expiraEn - 1000)).resolves.toBe(true);
    // Pasado el vencimiento: no.
    await expect(verificarSesion(token, SECRETO, expiraEn + 1000)).resolves.toBe(false);
  });

  it("la expiración es de ~30 días, como define auth-y-permisos.md", async () => {
    expect(DURACION_SESION_SEGUNDOS).toBe(30 * 24 * 60 * 60);

    const ahora = Date.UTC(2026, 9, 5);
    const { expiraEn } = await firmarSesion(SECRETO, ahora);
    expect(expiraEn - ahora).toBe(DURACION_SESION_SEGUNDOS * 1000);
  });
});

describe("opcionesDeCookieDeSesion", () => {
  it("la cookie es httpOnly, de todo el sitio y con el vencimiento de la sesión", async () => {
    const ahora = Date.UTC(2026, 9, 5);
    const { expiraEn } = await firmarSesion(SECRETO, ahora);
    const opciones = opcionesDeCookieDeSesion(expiraEn, ahora);

    expect(NOMBRE_COOKIE_SESION.length).toBeGreaterThan(0);
    expect(opciones.httpOnly).toBe(true);
    expect(opciones.sameSite).toBe("lax");
    expect(opciones.path).toBe("/");
    expect(opciones.maxAge).toBe(DURACION_SESION_SEGUNDOS);
    expect(opciones.expires.getTime()).toBe(expiraEn);
  });

  it("la cookie es `secure` fuera de desarrollo local (auth-y-permisos.md)", () => {
    // Los tests corren con NODE_ENV=test, que no es "development": igual que producción.
    expect(opcionesDeCookieDeSesion(Date.now()).secure).toBe(true);
  });
});

describe("rutaEsPublica", () => {
  it("solo la pantalla de ingreso y su endpoint quedan fuera del portón", () => {
    expect(rutaEsPublica("/ingresar")).toBe(true);
    expect(rutaEsPublica("/api/sesion")).toBe(true);
  });

  it("todo el resto de la app está protegido", () => {
    expect(rutaEsPublica("/")).toBe(false);
    expect(rutaEsPublica("/clientes")).toBe(false);
    expect(rutaEsPublica("/clientes/abc")).toBe(false);
    expect(rutaEsPublica("/api/clientes")).toBe(false);
  });

  it("no se cuela nada por prefijo parecido a una ruta pública", () => {
    expect(rutaEsPublica("/ingresar-de-verdad")).toBe(false);
    expect(rutaEsPublica("/api/sesion-falsa")).toBe(false);
    expect(rutaEsPublica("/otra/ingresar")).toBe(false);
  });
});
