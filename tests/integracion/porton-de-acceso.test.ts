import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { requireEnv } from "../../lib/env";
import {
  DURACION_SESION_SEGUNDOS,
  NOMBRE_COOKIE_SESION,
  firmarSesion,
} from "../../lib/sesion";

/**
 * Verificación 2 de M1-02 (integración, regla #5): el middleware protegiendo rutas reales
 * de la app, servidas por un servidor Next de verdad contra la base de verdad.
 *
 * Levanta `next dev` en un puerto propio, le pega por HTTP y mira redirects, cookies y
 * cuerpos. Lo que las unitarias no pueden ver: que el middleware esté efectivamente
 * enganchado a `/` y que el endpoint setee la cookie que el middleware después acepta.
 *
 * La contraseña real se lee del entorno en tiempo de ejecución (regla #2) y nunca se
 * imprime: si un assert falla, el mensaje habla de códigos de estado, no de valores.
 */

const RAIZ = join(__dirname, "..", "..");
const PUERTO = 3217;
const BASE = `http://127.0.0.1:${PUERTO}`;

let servidor: ChildProcess;

async function esperarServidorListo(limiteMs = 120_000): Promise<void> {
  const hasta = Date.now() + limiteMs;
  while (Date.now() < hasta) {
    try {
      const respuesta = await fetch(`${BASE}/ingresar`, { redirect: "manual" });
      if (respuesta.status > 0) {
        return;
      }
    } catch {
      // Todavía no escucha: se reintenta.
    }
    await new Promise((listo) => setTimeout(listo, 500));
  }
  throw new Error(`El servidor de prueba no respondió en ${limiteMs / 1000}s`);
}

function cookieDeSesionEnRespuesta(respuesta: Response): string | undefined {
  return respuesta.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${NOMBRE_COOKIE_SESION}=`));
}

async function pedir(ruta: string, cookie?: string): Promise<Response> {
  return fetch(`${BASE}${ruta}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : undefined,
  });
}

async function intentarIngresar(contrasena: string): Promise<Response> {
  return fetch(`${BASE}/api/sesion`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({ contrasena }).toString(),
  });
}

beforeAll(async () => {
  servidor = spawn(
    process.execPath,
    [join(RAIZ, "node_modules", "next", "dist", "bin", "next"), "dev", "--port", String(PUERTO)],
    { cwd: RAIZ, env: { ...process.env }, stdio: "ignore" },
  );
  await esperarServidorListo();
}, 180_000);

afterAll(async () => {
  if (!servidor?.pid) {
    return;
  }
  // En Windows `kill()` no se lleva el árbol de procesos de Next: taskkill sí.
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(servidor.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    servidor.kill("SIGTERM");
  }
});

describe("criterio #3 · ruta protegida sin sesión redirige al login", () => {
  it("GET / sin cookie redirige a /ingresar", async () => {
    const respuesta = await pedir("/");
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe(
      "/ingresar",
    );
  });

  it("una ruta inexistente también queda detrás del portón (no filtra la app)", async () => {
    const respuesta = await pedir("/clientes");
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe(
      "/ingresar",
    );
  });

  it("/ingresar sí se puede ver sin sesión y muestra el formulario", async () => {
    const respuesta = await pedir("/ingresar");
    expect(respuesta.status).toBe(200);
    const html = await respuesta.text();
    expect(html).toContain('type="password"');
    expect(html).toContain("name=\"contrasena\"");
  });
});

describe("criterio #1 · contraseña correcta crea sesión y deja pasar", () => {
  it("el endpoint acepta la contraseña real y setea la cookie de sesión", async () => {
    const respuesta = await intentarIngresar(requireEnv("APP_PASSWORD"));
    expect(respuesta.status).toBe(200);

    const cookie = cookieDeSesionEnRespuesta(respuesta);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toMatch(new RegExp(`Max-Age=${DURACION_SESION_SEGUNDOS}`, "i"));
  });

  it("con esa cookie, / responde la app real (lee la organización de la base)", async () => {
    const ingreso = await intentarIngresar(requireEnv("APP_PASSWORD"));
    const cookie = cookieDeSesionEnRespuesta(ingreso)?.split(";")[0];
    expect(cookie).toBeDefined();

    const respuesta = await pedir("/", cookie);
    expect(respuesta.status).toBe(200);
    const html = await respuesta.text();
    expect(html).toContain("ReleaseView");
    expect(html).toContain("Organización");
  });

  it("criterio #4 · la sesión persiste: la misma cookie sirve en otra ruta protegida", async () => {
    const ingreso = await intentarIngresar(requireEnv("APP_PASSWORD"));
    const cookie = cookieDeSesionEnRespuesta(ingreso)?.split(";")[0];

    const primera = await pedir("/", cookie);
    const segunda = await pedir("/", cookie);
    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(200);
  });
});

describe("criterio #2 · contraseña incorrecta no crea sesión", () => {
  it("el endpoint rechaza y no setea ninguna cookie de sesión", async () => {
    const respuesta = await intentarIngresar("contrasena-incorrecta-de-prueba");
    expect(respuesta.status).toBe(401);
    expect(cookieDeSesionEnRespuesta(respuesta)).toBeUndefined();
  });

  it("una contraseña vacía también se rechaza", async () => {
    const respuesta = await intentarIngresar("");
    expect(respuesta.status).toBe(401);
    expect(cookieDeSesionEnRespuesta(respuesta)).toBeUndefined();
  });
});

describe("criterio #5 · cookie inválida o vencida vuelve a pedir la contraseña", () => {
  it("una cookie inventada no abre el portón", async () => {
    const respuesta = await pedir("/", `${NOMBRE_COOKIE_SESION}=v1.9999999999999.firma-falsa`);
    expect([302, 307, 308]).toContain(respuesta.status);
  });

  it("una cookie firmada con otro secreto no abre el portón", async () => {
    const { token } = await firmarSesion("otro-secreto-de-fantasia-para-el-test-123456");
    const respuesta = await pedir("/", `${NOMBRE_COOKIE_SESION}=${token}`);
    expect([302, 307, 308]).toContain(respuesta.status);
  });

  it("una cookie bien firmada pero vencida no abre el portón", async () => {
    // Emitida hace 31 días: la firma es legítima, el plazo ya pasó.
    const hace31Dias = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const { token } = await firmarSesion(requireEnv("SESSION_SECRET"), hace31Dias);
    const respuesta = await pedir("/", `${NOMBRE_COOKIE_SESION}=${token}`);
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe(
      "/ingresar",
    );
  });
});
