import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearCliente } from "../../lib/clientes";
import { requireEnv } from "../../lib/env";
import { organizacionActual } from "../../lib/organizacion";
import { prisma } from "../../lib/prisma";
import { NOMBRE_COOKIE_SESION } from "../../lib/sesion";
import { NOMBRE_ORGANIZACION_DE_PRUEBA } from "../soporte/base-de-prueba";

/**
 * Verificación 2 de M4-00 (integración, regla #5): la suite corre contra la **base de prueba**
 * y no contra la base real del owner.
 *
 * Criterio #1 — el proceso de test: `tests/integracion/entorno-de-prueba.ts` reemplazó
 * `DATABASE_URL` antes de que `lib/prisma.ts` la leyera, así que el cliente de Prisma que
 * importan todos los archivos de la suite habla con la base de prueba. Se comprueba contra la
 * base **viva**, no contra la configuración: se le pregunta cómo se llama y de qué
 * organización cuelga.
 *
 * Criterio #2 — el servidor: los tests de pantalla levantan su propio `next dev` con
 * `env: { ...process.env }`. Si el reemplazo pasara solo en el proceso de test, el servidor
 * seguiría pegado a la base real y nadie lo notaría hasta romper datos del owner. Así que acá
 * se siembra un cliente que existe **solo** en la base de prueba y se le pide a la pantalla de
 * inicio servida de verdad que lo muestre — junto con el nombre de la organización, que esa
 * pantalla pinta y que solo siembra `npm run db:seed:test`.
 *
 * Regla #2: no se imprime ni se compara ningún valor de connection string; lo único que se
 * mira son nombres de variables, nombres de base y datos sembrados por la propia suite.
 */

const RAIZ = join(__dirname, "..", "..");
const PUERTO = 3224;
const BASE = `http://127.0.0.1:${PUERTO}`;
const SUFIJO = `m4-00-base-de-prueba-${Date.now()}`;
const NOMBRE_CLIENTE = `Cliente solo de la base de prueba ${SUFIJO}`;

let servidor: ChildProcess;
let idCliente = "";

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

/**
 * Apaga el servidor y espera a que deje de escuchar: los otros archivos levantan su propio
 * `next dev` sobre el mismo `.next` y dos servidores solapados se pisan el build.
 */
async function apagarServidor(limiteMs = 20_000): Promise<void> {
  if (!servidor?.pid) {
    return;
  }

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
  const organizacion = await organizacionActual();
  const creado = await crearCliente(organizacion.id, {
    name: NOMBRE_CLIENTE,
    currentVersion: "9.9.9",
  });
  if (!creado.ok) {
    throw new Error(
      "No se pudo sembrar el cliente de prueba: sin él no se puede comprobar que el " +
        "servidor también apunta a la base de prueba.",
    );
  }
  idCliente = creado.cliente.id;

  servidor = spawn(
    process.execPath,
    [join(RAIZ, "node_modules", "next", "dist", "bin", "next"), "dev", "--port", String(PUERTO)],
    { cwd: RAIZ, env: { ...process.env }, stdio: "ignore" },
  );
  await esperarServidorListo();
}, 180_000);

afterAll(async () => {
  if (idCliente) {
    await prisma.clientVersionHistory.deleteMany({ where: { clientId: idCliente } });
    await prisma.clientFeature.deleteMany({ where: { clientId: idCliente } });
    await prisma.client.deleteMany({ where: { id: idCliente } });
  }
  await prisma.$disconnect();

  await apagarServidor();
});

describe("criterio #1 · la suite se conecta a la base de prueba, no a la real", () => {
  it("la DATABASE_URL en uso es la de prueba (el reemplazo del setupFile pasó)", () => {
    const enUso = requireEnv("DATABASE_URL");
    expect(enUso).toBe(requireEnv("DATABASE_URL_TEST"));
    expect(requireEnv("DIRECT_URL")).toBe(requireEnv("DIRECT_URL_TEST"));
  });

  it("la base viva responde y tiene nombre", async () => {
    const filas = await prisma.$queryRaw<Array<{ base: string }>>`
      SELECT current_database()::text AS base
    `;
    expect(filas).toHaveLength(1);
    expect(filas[0].base.length).toBeGreaterThan(0);
  });

  it("la organización de la que cuelga todo es la que siembra db:seed:test", async () => {
    // Este nombre lo escribe SOLO `npm run db:seed:test`. Si la suite estuviera pegada a la
    // base real, acá aparecería la organización del owner y el test fallaría.
    const organizacion = await organizacionActual();
    expect(organizacion.name).toBe(NOMBRE_ORGANIZACION_DE_PRUEBA);
  });
});

describe("criterio #2 · el servidor de prueba también apunta a la base de prueba", () => {
  it("la pantalla de inicio servida muestra un cliente que existe solo en la base de prueba", async () => {
    const cookie = await cookieDeSesion();
    const respuesta = await fetch(`${BASE}/`, {
      redirect: "manual",
      headers: { cookie },
    });
    expect(respuesta.status).toBe(200);

    const html = await respuesta.text();
    expect(html).toContain(NOMBRE_CLIENTE);
    // La pantalla pinta de qué organización son los datos: la de prueba, no la del owner.
    expect(html).toContain(NOMBRE_ORGANIZACION_DE_PRUEBA);
  });
});
