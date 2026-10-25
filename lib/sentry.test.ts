import { describe, expect, it } from "vitest";

import { armarConfiguracionSentry, filtrarEvento } from "./sentry";

// Falso a propósito: no es ninguna URL real (regla #2).
const DSN_FALSO = "https://clave-falsa@sentry.example.invalid/0";

describe("armarConfiguracionSentry: apagado sin DSN (criterio #1)", () => {
  it("devuelve apagado sin DSN, con DSN vacío y con DSN en blanco", () => {
    expect(armarConfiguracionSentry({})).toEqual({ activo: false });
    expect(armarConfiguracionSentry({ NEXT_PUBLIC_SENTRY_DSN: "" })).toEqual({ activo: false });
    expect(armarConfiguracionSentry({ NEXT_PUBLIC_SENTRY_DSN: "   " })).toEqual({ activo: false });
  });
});

describe("armarConfiguracionSentry: configuración mínima (criterio #2)", () => {
  const entorno = { NEXT_PUBLIC_SENTRY_DSN: DSN_FALSO, NODE_ENV: "development" };

  it("con DSN queda activo, sin PII, sin trazas, sin sesiones y sin logs", () => {
    const c = armarConfiguracionSentry(entorno);
    if (!c.activo) throw new Error("debería estar activo");
    expect(c.opciones.dsn).toBe(DSN_FALSO);
    expect(c.opciones.sendDefaultPii).toBe(false);
    expect(c.opciones.tracesSampleRate).toBe(0);
    expect(c.opciones.replaysSessionSampleRate).toBe(0);
    expect(c.opciones.replaysOnErrorSampleRate).toBe(0);
    expect(c.opciones.enableLogs).toBe(false);
  });

  it("environment sale de VERCEL_ENV y, si no existe, de NODE_ENV", () => {
    const conVercel = armarConfiguracionSentry({ ...entorno, VERCEL_ENV: "production" });
    const sinVercel = armarConfiguracionSentry(entorno);
    if (!conVercel.activo || !sinVercel.activo) throw new Error("debería estar activo");
    expect(conVercel.opciones.environment).toBe("production");
    expect(sinVercel.opciones.environment).toBe("development");
  });
});

describe("armarConfiguracionSentry: errores atrapados (criterio #4)", () => {
  it("captura la consola solo en el nivel error", () => {
    const c = armarConfiguracionSentry({ NEXT_PUBLIC_SENTRY_DSN: DSN_FALSO });
    if (!c.activo) throw new Error("debería estar activo");
    expect(c.nivelesDeConsola).toEqual(["error"]);
  });
});

describe("filtrarEvento (criterio #5)", () => {
  it("quita cookie, authorization y el cuerpo de la petición", () => {
    const evento = filtrarEvento({
      request: {
        url: "http://localhost:3000/",
        headers: { Cookie: "sesion=abc", Authorization: "Bearer x", "User-Agent": "ua" },
        data: { campo: "valor" },
        cookies: { sesion: "abc" },
      },
    });
    expect(evento.request?.headers).toEqual({ "User-Agent": "ua" });
    expect(evento.request?.data).toBeUndefined();
    expect(evento.request?.cookies).toBeUndefined();
    expect(evento.request?.url).toBe("http://localhost:3000/");
  });

  it("reemplaza connection strings en mensajes y excepciones", () => {
    const falsa = "postgresql://usuario:clave@host.invalid:5432/base";
    const evento = filtrarEvento({
      message: `fallo con ${falsa} y también postgres://a:b@h/d`,
      exception: { values: [{ type: "Error", value: `no conecta a ${falsa}` }] },
    });
    const texto = JSON.stringify(evento);
    expect(texto).not.toContain("postgresql://");
    expect(texto).not.toContain("postgres://");
    expect(texto).not.toContain("clave@");
    expect(texto).toContain("[url-de-base-oculta]");
  });

  it("deja pasar un evento sin nada sensible", () => {
    expect(filtrarEvento({ message: "hola" })).toEqual({ message: "hola" });
  });
});
