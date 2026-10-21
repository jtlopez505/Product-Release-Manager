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

/**
 * La salida (M4-02). Hasta acá este archivo probaba que se entra y que sin sesión no se ve
 * nada; de acá en adelante, que se **sale**: el endpoint `POST /api/salir`, el efecto real
 * sobre una ruta protegida y los dos caminos que no tienen que funcionar (GET y sin sesión).
 *
 * El criterio #4 de la ficha es el que cierra la condición del PRD y por eso **no se da por
 * bueno mirando el `Set-Cookie`**: se simula lo que hace el navegador con esa cabecera
 * (`aplicarSetCookie`) y después se vuelve a pedir `/` con las cookies que quedaron.
 */

/** Una jarra de cookies: nombre → valor, como la que mantiene el navegador para este host. */
type Jarra = Map<string, string>;

/**
 * Lo que haría el navegador con los `Set-Cookie` de una respuesta: guarda las cookies nuevas
 * y **borra** las que vienen vencidas (`Max-Age=0` o `expires` en el pasado). Es la pieza que
 * convierte "la cabecera dice que la expira" en "la cookie ya no se manda".
 */
function aplicarSetCookie(jarra: Jarra, respuesta: Response): Jarra {
  for (const cruda of respuesta.headers.getSetCookie()) {
    const [par, ...atributos] = cruda.split(";").map((parte) => parte.trim());
    const corte = par.indexOf("=");
    const nombre = corte === -1 ? par : par.slice(0, corte);
    const valor = corte === -1 ? "" : par.slice(corte + 1);

    const maxAge = atributos.find((atributo) => /^max-age=/i.test(atributo));
    const expires = atributos.find((atributo) => /^expires=/i.test(atributo));
    const vencida =
      (maxAge !== undefined && Number(maxAge.split("=")[1]) <= 0) ||
      (expires !== undefined && Date.parse(expires.slice("expires=".length)) <= Date.now());

    if (vencida) {
      jarra.delete(nombre);
    } else {
      jarra.set(nombre, valor);
    }
  }
  return jarra;
}

function encabezadoDeCookies(jarra: Jarra): string {
  return [...jarra].map(([nombre, valor]) => `${nombre}=${valor}`).join("; ");
}

/** Entra con la contraseña real (del entorno, regla #2) y devuelve la jarra con la sesión. */
async function jarraConSesion(): Promise<Jarra> {
  const ingreso = await intentarIngresar(requireEnv("APP_PASSWORD"));
  const jarra = aplicarSetCookie(new Map(), ingreso);
  if (!jarra.has(NOMBRE_COOKIE_SESION)) {
    throw new Error(
      `El endpoint de ingreso no dejó cookie de sesión (estado ${ingreso.status}): sin eso ` +
        `no hay sesión que cerrar.`,
    );
  }
  return jarra;
}

async function salir(jarra: Jarra): Promise<Response> {
  return fetch(`${BASE}/api/salir`, {
    method: "POST",
    redirect: "manual",
    headers: { cookie: encabezadoDeCookies(jarra) },
  });
}

async function htmlDe(ruta: string, jarra: Jarra): Promise<string> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    redirect: "manual",
    headers: { cookie: encabezadoDeCookies(jarra) },
  });
  expect(respuesta.status, `se esperaba ver ${ruta} con sesión`).toBe(200);
  return respuesta.text();
}

describe("M4-02 · criterios #2 y #3 · POST /api/salir borra la cookie y vuelve al portón", () => {
  it("responde 303 a /ingresar?salio=1", async () => {
    const respuesta = await salir(await jarraConSesion());
    expect(respuesta.status).toBe(303);

    const destino = new URL(respuesta.headers.get("location") ?? "", BASE);
    expect(destino.pathname).toBe("/ingresar");
    expect(destino.searchParams.get("salio")).toBe("1");
  });

  it("su Set-Cookie expira la cookie de sesión con el mismo path que la original", async () => {
    const respuesta = await salir(await jarraConSesion());
    const cookie = cookieDeSesionEnRespuesta(respuesta);

    expect(cookie).toBeDefined();
    // Si el `path` no coincide con el de la original, el navegador deja la vieja viva.
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Max-Age=0|Expires=/i);
  });
});

describe("M4-02 · criterio #4 · después de salir, una ruta protegida ya no se ve", () => {
  it("entrar → / da 200 → salir → / redirige a /ingresar (el efecto, no la cabecera)", async () => {
    const jarra = await jarraConSesion();

    const conSesion = await pedir("/", encabezadoDeCookies(jarra));
    expect(conSesion.status).toBe(200);

    const salida = await salir(jarra);
    expect(salida.status).toBe(303);
    aplicarSetCookie(jarra, salida);

    // El navegador ya descartó la cookie vencida: esto es lo que mandaría en el próximo GET.
    const despues = await pedir("/", encabezadoDeCookies(jarra));
    expect([302, 303, 307, 308]).toContain(despues.status);
    expect(new URL(despues.headers.get("location") ?? "", BASE).pathname).toBe("/ingresar");
  });

  it("tampoco se ve otra ruta protegida: la sesión se cerró, no se mudó", async () => {
    const jarra = await jarraConSesion();
    aplicarSetCookie(jarra, await salir(jarra));

    const respuesta = await pedir("/lista-de-release", encabezadoDeCookies(jarra));
    expect([302, 303, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe("/ingresar");
  });
});

describe("M4-02 · criterio #7 · no se puede cerrar sesión por GET", () => {
  it("GET /api/salir responde 405 y no toca ninguna cookie", async () => {
    const jarra = await jarraConSesion();
    const respuesta = await pedir("/api/salir", encabezadoDeCookies(jarra));

    expect(respuesta.status).toBe(405);
    expect(respuesta.headers.getSetCookie()).toEqual([]);
  });

  it("y la sesión sigue viva: el GET no sacó a nadie", async () => {
    const jarra = await jarraConSesion();
    await pedir("/api/salir", encabezadoDeCookies(jarra));

    const respuesta = await pedir("/", encabezadoDeCookies(jarra));
    expect(respuesta.status).toBe(200);
  });
});

describe("M4-02 · criterio #8 · el endpoint no es público", () => {
  it("POST /api/salir sin sesión lo intercepta el portón: redirige, no revienta", async () => {
    const respuesta = await fetch(`${BASE}/api/salir`, { method: "POST", redirect: "manual" });
    expect([302, 303, 307, 308]).toContain(respuesta.status);

    const destino = new URL(respuesta.headers.get("location") ?? "", BASE);
    expect(destino.pathname).toBe("/ingresar");
    // Quien responde es el portón, no el endpoint: si alguien agregara `/api/salir` a
    // `RUTAS_PUBLICAS`, acá llegaría el 303 del endpoint (`?salio=1` y su `Set-Cookie`) y
    // esta prueba se pondría en rojo. Es el guardián de esa decisión.
    expect(destino.searchParams.get("salio")).toBeNull();
    expect(respuesta.headers.getSetCookie()).toEqual([]);
  });

  it("con una cookie inválida tampoco responde 500", async () => {
    const respuesta = await fetch(`${BASE}/api/salir`, {
      method: "POST",
      redirect: "manual",
      headers: { cookie: `${NOMBRE_COOKIE_SESION}=v1.9999999999999.firma-falsa` },
    });
    expect(respuesta.status).toBeLessThan(500);
    expect([302, 303, 307, 308]).toContain(respuesta.status);
  });
});

describe("M4-02 · criterio #1 · el control está en toda pantalla con barra", () => {
  for (const ruta of ["/", "/por-feature", "/lista-de-release"] as const) {
    it(`${ruta} trae el formulario POST a /api/salir con el botón "Cerrar sesión"`, async () => {
      const cuerpo = await htmlDe(ruta, await jarraConSesion());
      const formulario = /<form[^>]*action="\/api\/salir"[\s\S]*?<\/form>/.exec(cuerpo)?.[0];

      expect(formulario, `no hay <form action="/api/salir"> en ${ruta}`).toBeDefined();
      expect(formulario).toMatch(/method="post"/i);
      expect(formulario).toMatch(/<button[^>]*>Cerrar sesión<\/button>/);
      // Que el control sea clickeable se ve en el tinte de marca.md, el mismo del nombre.
      expect(formulario).toContain("hover:bg-hover");
    });
  }
});

describe("M4-02 · criterio #9 · no aparece donde la barra no está", () => {
  it("/ingresar no ofrece cerrar una sesión que no existe", async () => {
    const respuesta = await fetch(`${BASE}/ingresar`, { redirect: "manual" });
    const cuerpo = await respuesta.text();

    expect(respuesta.status).toBe(200);
    expect(cuerpo).not.toContain("/api/salir");
    expect(cuerpo).not.toContain("Cerrar sesión");
  });

  it("los formularios de cliente siguen saliendo por Cancelar, sin barra", async () => {
    const cuerpo = await htmlDe("/clientes/nuevo", await jarraConSesion());
    expect(cuerpo).not.toContain("/api/salir");
    expect(cuerpo).toContain("Cancelar");
  });
});

describe("M4-02 · criterio #5 · al volver al portón se entiende qué pasó", () => {
  it("/ingresar?salio=1 avisa 'Cerraste sesión.' y no habla de contraseña incorrecta", async () => {
    const respuesta = await fetch(`${BASE}/ingresar?salio=1`, { redirect: "manual" });
    const cuerpo = await respuesta.text();

    expect(respuesta.status).toBe(200);
    expect(cuerpo).toContain("Cerraste sesión.");
    expect(cuerpo).not.toContain("Contraseña incorrecta");
  });

  it("sin el parámetro, el portón no inventa el aviso", async () => {
    const respuesta = await fetch(`${BASE}/ingresar`, { redirect: "manual" });
    expect(await respuesta.text()).not.toContain("Cerraste sesión.");
  });

  it("el aviso de salida y el de credencial son independientes", async () => {
    const respuesta = await fetch(`${BASE}/ingresar?error=credencial`, { redirect: "manual" });
    const cuerpo = await respuesta.text();
    expect(cuerpo).toContain("Contraseña incorrecta");
    expect(cuerpo).not.toContain("Cerraste sesión.");
  });
});
