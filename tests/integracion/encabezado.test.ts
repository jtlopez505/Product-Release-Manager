import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { requireEnv } from "../../lib/env";
import { NOMBRE_COOKIE_SESION } from "../../lib/sesion";

/**
 * Verificación 2 de M4-01 (integración, regla #5): el encabezado compartido
 * (`app/navegacion.tsx`) servido por un Next de verdad, en las cuatro pantallas que lo
 * llevan y en la que no.
 *
 * Lo que una prueba de archivo no puede ver:
 *   - **criterio #1 y #2:** que el nombre "ReleaseView" sale como `<a href="/">` en el HTML
 *     servido, y que sale igual desde pantallas de árboles distintos — no solo en Inicio;
 *   - **criterio #5:** que en el encabezado hay **exactamente un** `aria-current="page"`.
 *     Se cuenta en `/`, que es donde el error aparecería: ahí el nombre y la pestaña "Por
 *     cliente" apuntan los dos a `/`. Se cuenta **dentro del `<header>`**, porque el payload
 *     RSC que Next embute al final del documento repite los atributos escapados y contarlos
 *     en el documento entero daría 4 incluso estando bien;
 *   - **criterio #6:** que el portón sigue sin barra y sin ninguna salida a `/`.
 *
 * Esta pieza no toca datos, así que no hay siembra ni prueba de aislamiento (regla #1 no
 * aplica): solo se lee markup. Usa su propio puerto para no competir con los servidores de
 * los otros archivos de integración. La contraseña se lee del entorno y nunca se imprime.
 */

const RAIZ = join(__dirname, "..", "..");
const PUERTO = 3223;
const BASE = `http://127.0.0.1:${PUERTO}`;

/** Las cuatro pantallas que llevan la barra (ficha §4). */
const PANTALLAS_CON_BARRA = ["/", "/por-feature", "/lista-de-release", "/features"] as const;

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

async function cookieDeSesion(): Promise<string> {
  const respuesta = await fetch(`${BASE}/api/sesion`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams({ contrasena: requireEnv("APP_PASSWORD") }).toString(),
  });
  const cookie = respuesta.headers
    .getSetCookie()
    .find((valor) => valor.startsWith(`${NOMBRE_COOKIE_SESION}=`))
    ?.split(";")[0];
  if (!cookie) {
    throw new Error(
      `El endpoint de sesión no devolvió cookie (estado ${respuesta.status}): sin eso no se ` +
        `puede probar la pantalla protegida.`,
    );
  }
  return cookie;
}

async function html(ruta: string): Promise<{ estado: number; cuerpo: string }> {
  const cookie = await cookieDeSesion();
  const respuesta = await fetch(`${BASE}${ruta}`, { redirect: "manual", headers: { cookie } });
  return { estado: respuesta.status, cuerpo: await respuesta.text() };
}

/**
 * El `<header>` servido, aislado del resto del documento. Hay uno solo por pantalla (lo
 * pinta `Navegacion`) y aislarlo es lo que hace honesto el conteo del criterio #5: el
 * payload RSC del final del documento trae los mismos atributos escapados.
 */
function encabezado(cuerpo: string): string {
  const hallado = /<header[\s\S]*?<\/header>/.exec(cuerpo);
  if (!hallado) {
    throw new Error("La pantalla no trae ningún <header>: se esperaba la barra de navegación.");
  }
  return hallado[0];
}

/**
 * Apaga el servidor y **espera** a que deje de escuchar antes de devolver el control: los
 * otros archivos de integración levantan su propio `next dev` sobre el mismo directorio
 * `.next` y dos servidores solapados se pisan los archivos de build.
 */
async function apagarServidor(limiteMs = 20_000): Promise<void> {
  if (!servidor?.pid) {
    return;
  }

  // En Windows `kill()` no se lleva el árbol de procesos de Next: taskkill sí.
  if (process.platform === "win32") {
    const matar = spawn("taskkill", ["/pid", String(servidor.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    await new Promise((listo) => matar.on("exit", listo));
  } else {
    servidor.kill("SIGTERM");
  }

  const hasta = Date.now() + limiteMs;
  while (Date.now() < hasta) {
    try {
      await fetch(`${BASE}/ingresar`, { redirect: "manual" });
    } catch {
      return;
    }
    await new Promise((listo) => setTimeout(listo, 300));
  }
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
  await apagarServidor();
});

describe("criterio #1 · el nombre del encabezado es un link a Inicio", () => {
  it("en el markup servido de `/`, 'ReleaseView' está dentro de un <a href=\"/\">", async () => {
    const { estado, cuerpo } = await html("/");
    expect(estado).toBe(200);
    // El orden de atributos del HTML servido lo decide React al serializar, no el JSX: se
    // verifica el `href` dentro del mismo `<a>` que envuelve el texto, no un orden literal.
    expect(encabezado(cuerpo)).toMatch(/<a[^>]*href="\/"[^>]*>ReleaseView<\/a>/);
  });

  it("el nombre ya no es un <span> inerte", async () => {
    const { cuerpo } = await html("/");
    expect(encabezado(cuerpo)).not.toMatch(/<span[^>]*>ReleaseView<\/span>/);
  });
});

describe("criterio #2 · funciona desde cualquier pantalla que tenga la barra", () => {
  for (const ruta of PANTALLAS_CON_BARRA) {
    it(`el encabezado de ${ruta} trae el mismo <a href="/">ReleaseView</a>`, async () => {
      const { estado, cuerpo } = await html(ruta);
      expect(estado).toBe(200);
      expect(encabezado(cuerpo)).toMatch(/<a[^>]*href="\/"[^>]*>ReleaseView<\/a>/);
    });
  }
});

describe("criterio #4 · se comporta como un control clickeable", () => {
  it("lleva el tinte de hover de marca.md (`hover:bg-hover`), el mismo que las pestañas", async () => {
    const { cuerpo } = await html("/lista-de-release");
    const nombre = /<a[^>]*>ReleaseView<\/a>/.exec(encabezado(cuerpo))?.[0] ?? "";
    expect(nombre).toContain("hover:bg-hover");
  });

  it("no anula el foco: el anillo lo da la regla global de globals.css", async () => {
    const { cuerpo } = await html("/lista-de-release");
    const nombre = /<a[^>]*>ReleaseView<\/a>/.exec(encabezado(cuerpo))?.[0] ?? "";
    expect(nombre).not.toMatch(/outline-(none|0)/);
  });
});

describe("criterio #5 · no duplica la 'página actual'", () => {
  it("en `/` el encabezado tiene exactamente un aria-current=\"page\"", async () => {
    const { cuerpo } = await html("/");
    const marcas = encabezado(cuerpo).match(/aria-current="page"/g) ?? [];
    expect(marcas).toHaveLength(1);
  });

  it("ese único aria-current es el de la pestaña 'Por cliente', no el del nombre", async () => {
    const { cuerpo } = await html("/");
    const barra = encabezado(cuerpo);
    expect(barra).toMatch(/<a[^>]*aria-current="page"[^>]*>Por cliente<\/a>/);
    expect(barra).not.toMatch(/<a[^>]*aria-current="page"[^>]*>ReleaseView<\/a>/);
  });

  it("en el resto de las pantallas con barra sigue habiendo exactamente uno", async () => {
    for (const ruta of PANTALLAS_CON_BARRA) {
      const { cuerpo } = await html(ruta);
      const marcas = encabezado(cuerpo).match(/aria-current="page"/g) ?? [];
      expect(marcas, `pantalla ${ruta}`).toHaveLength(1);
    }
  });
});

describe("criterio #6 · no aparece donde la barra no está", () => {
  it("/ingresar sigue sin barra de navegación", async () => {
    const { estado, cuerpo } = await html("/ingresar");
    expect(estado).toBe(200);
    expect(cuerpo).not.toContain("<header");
    expect(cuerpo).not.toContain('aria-label="Secciones"');
  });

  it("/ingresar no tiene ninguna salida a `/`: su nombre sigue siendo un <h1> inerte", async () => {
    const { cuerpo } = await html("/ingresar");
    expect(cuerpo).not.toContain('href="/"');
    expect(cuerpo).toMatch(/<h1[^>]*>ReleaseView<\/h1>/);
  });

  it("sin sesión el portón tampoco ofrece la salida a `/`", async () => {
    const respuesta = await fetch(`${BASE}/ingresar`, { redirect: "manual" });
    const cuerpo = await respuesta.text();
    expect(cuerpo).not.toContain('href="/"');
    expect(cuerpo).not.toContain("<header");
  });
});
