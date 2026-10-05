import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { requireEnv } from "../../lib/env";
import { crearFeature } from "../../lib/features";
import { organizacionActual } from "../../lib/organizacion";
import { prisma } from "../../lib/prisma";
import { NOMBRE_COOKIE_SESION } from "../../lib/sesion";

/**
 * Verificación 2 de M1-03 (integración, regla #5), capa pantalla: `/features` servida por un
 * Next de verdad contra la base de verdad.
 *
 * Lo que las pruebas de `lib/features.ts` no pueden ver:
 *   - que la ruta nueva quedó efectivamente detrás del portón (sin agregarla a ninguna lista,
 *     `proxy.ts` cierra por omisión);
 *   - que lo que se renderiza es la lista de la organización actual y **nada** de otra
 *     organización (regla #1, ficha §3 fila 2) — medido en el HTML, no en el query.
 *
 * Usa su propio puerto para no competir con el servidor que levanta
 * `porton-de-acceso.test.ts`. La contraseña se lee del entorno y nunca se imprime.
 */

const RAIZ = join(__dirname, "..", "..");
const PUERTO = 3218;
const BASE = `http://127.0.0.1:${PUERTO}`;
const SUFIJO = `m1-03-pantalla-${Date.now()}`;

let servidor: ChildProcess;
let idOrganizacionAjena = "";
let idFeaturePropio = "";

const NOMBRE_PROPIO = `Feature propio ${SUFIJO}`;
const NOMBRE_AJENO = `Feature ajeno ${SUFIJO}`;

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

beforeAll(async () => {
  // Un feature en la organización de la app y otro en una organización ajena: la pantalla
  // tiene que mostrar el primero y no enterarse del segundo.
  const propia = await organizacionActual();
  const propio = await crearFeature(propia.id, {
    name: NOMBRE_PROPIO,
    code: `F-801-${SUFIJO}`,
    prioridad: "ALTA",
    estado: "EN_DESARROLLO",
  });
  if (!propio.ok) {
    throw new Error("No se pudo sembrar el feature de prueba de la organización actual.");
  }
  idFeaturePropio = propio.feature.id;

  const ajena = await prisma.organization.create({ data: { name: `Org ajena ${SUFIJO}` } });
  idOrganizacionAjena = ajena.id;
  const ajeno = await crearFeature(ajena.id, { name: NOMBRE_AJENO, code: `F-802-${SUFIJO}` });
  if (!ajeno.ok) {
    throw new Error("No se pudo sembrar el feature de prueba de la organización ajena.");
  }

  servidor = spawn(
    process.execPath,
    [join(RAIZ, "node_modules", "next", "dist", "bin", "next"), "dev", "--port", String(PUERTO)],
    { cwd: RAIZ, env: { ...process.env }, stdio: "ignore" },
  );
  await esperarServidorListo();
}, 180_000);

afterAll(async () => {
  // La base es la del owner: los datos de prueba no se quedan.
  if (idFeaturePropio) {
    await prisma.feature.deleteMany({ where: { id: idFeaturePropio } });
  }
  if (idOrganizacionAjena) {
    await prisma.feature.deleteMany({ where: { organizationId: idOrganizacionAjena } });
    await prisma.organization.deleteMany({ where: { id: idOrganizacionAjena } });
  }
  await prisma.$disconnect();

  await apagarServidor();
});

/**
 * Apaga el servidor y **espera** a que deje de escuchar antes de devolver el control.
 *
 * No es ceremonia: el otro archivo de integración levanta su propio `next dev` sobre el mismo
 * directorio `.next`, y dos servidores solapados se pisan los archivos de build. M1-02 ya
 * perdió una corrida por servidores de verificación que quedaron vivos.
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
      return; // Ya no escucha nadie: el puerto quedó libre.
    }
    await new Promise((listo) => setTimeout(listo, 300));
  }
}

describe("la pantalla nueva queda detrás del portón sola (M1-02 cierra por omisión)", () => {
  it("GET /features sin sesión redirige a /ingresar", async () => {
    const respuesta = await fetch(`${BASE}/features`, { redirect: "manual" });
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe("/ingresar");
  });
});

describe("criterio #2 · la lista muestra los features de la organización actual", () => {
  it("con sesión, /features responde la lista y muestra el feature propio", async () => {
    const cookie = await cookieDeSesion();
    const respuesta = await fetch(`${BASE}/features`, {
      redirect: "manual",
      headers: { cookie },
    });
    expect(respuesta.status).toBe(200);

    const html = await respuesta.text();
    expect(html).toContain(NOMBRE_PROPIO);
    // Las columnas que la ficha pide ver por fila (§4, paso 2).
    expect(html).toContain(`F-801-${SUFIJO}`);
    expect(html).toContain("En desarrollo");
    expect(html).toContain("Alta");
  });

  it("regla #1 · ningún feature de otra organización aparece en la pantalla", async () => {
    const cookie = await cookieDeSesion();
    const html = await fetch(`${BASE}/features`, {
      redirect: "manual",
      headers: { cookie },
    }).then((respuesta) => respuesta.text());

    expect(html).not.toContain(NOMBRE_AJENO);
    expect(html).not.toContain(`F-802-${SUFIJO}`);
  });

  it("la pantalla ofrece la acción principal de la ficha", async () => {
    const cookie = await cookieDeSesion();
    const html = await fetch(`${BASE}/features`, {
      redirect: "manual",
      headers: { cookie },
    }).then((respuesta) => respuesta.text());

    expect(html).toContain("+ Agregar feature");
    expect(html).toContain("Features");
  });
});
