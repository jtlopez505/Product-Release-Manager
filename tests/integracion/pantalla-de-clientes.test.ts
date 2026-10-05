import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearCliente } from "../../lib/clientes";
import { requireEnv } from "../../lib/env";
import { crearFeature } from "../../lib/features";
import { organizacionActual } from "../../lib/organizacion";
import { prisma } from "../../lib/prisma";
import { NOMBRE_COOKIE_SESION } from "../../lib/sesion";

/**
 * Verificación 2 de M1-04 (integración, regla #5), capa pantalla: `/clientes/nuevo` y
 * `/clientes/<id>/editar` servidas por un Next de verdad contra la base de verdad.
 *
 * Lo que las pruebas de `lib/clientes.ts` no pueden ver:
 *   - que las rutas nuevas quedaron efectivamente detrás del portón (sin agregarlas a ninguna
 *     lista: `proxy.ts` cierra por omisión);
 *   - que el checklist ofrece los features de la organización actual y **ninguno** de otra
 *     (regla #1), medido en el HTML y no en el query;
 *   - que el cliente de otra organización no es editable: la ruta responde como si no
 *     existiera (criterio #8).
 *
 * Usa su propio puerto para no competir con los servidores de los otros archivos de
 * integración. La contraseña se lee del entorno y nunca se imprime.
 */

const RAIZ = join(__dirname, "..", "..");
const PUERTO = 3219;
const BASE = `http://127.0.0.1:${PUERTO}`;
const SUFIJO = `m1-04-pantalla-${Date.now()}`;

let servidor: ChildProcess;
let idOrganizacionAjena = "";
let idFeaturePropio = "";
let idClientePropio = "";
let idClienteAjeno = "";

const FEATURE_PROPIO = `Feature propio ${SUFIJO}`;
const FEATURE_AJENO = `Feature ajeno ${SUFIJO}`;
const CLIENTE_PROPIO = `Cliente propio ${SUFIJO}`;
const CLIENTE_AJENO = `Cliente ajeno ${SUFIJO}`;

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
      return; // Ya no escucha nadie: el puerto quedó libre.
    }
    await new Promise((listo) => setTimeout(listo, 300));
  }
}

beforeAll(async () => {
  // Un feature y un cliente en la organización de la app, y otro par en una organización
  // ajena: la pantalla tiene que mostrar los primeros y no enterarse de los segundos.
  const propia = await organizacionActual();
  const propio = await crearFeature(propia.id, {
    name: FEATURE_PROPIO,
    code: `F-811-${SUFIJO}`,
  });
  if (!propio.ok) {
    throw new Error("No se pudo sembrar el feature de prueba de la organización actual.");
  }
  idFeaturePropio = propio.feature.id;

  const cliente = await crearCliente(propia.id, {
    name: CLIENTE_PROPIO,
    currentVersion: "2.4.0",
    featureIds: [idFeaturePropio],
  });
  if (!cliente.ok) {
    throw new Error("No se pudo sembrar el cliente de prueba de la organización actual.");
  }
  idClientePropio = cliente.cliente.id;

  const ajena = await prisma.organization.create({ data: { name: `Org ajena ${SUFIJO}` } });
  idOrganizacionAjena = ajena.id;
  const ajeno = await crearFeature(ajena.id, { name: FEATURE_AJENO, code: `F-812-${SUFIJO}` });
  const clienteAjeno = await crearCliente(ajena.id, {
    name: CLIENTE_AJENO,
    currentVersion: "9.9.9",
    featureIds: [],
  });
  if (!ajeno.ok || !clienteAjeno.ok) {
    throw new Error("No se pudieron sembrar los datos de la organización ajena.");
  }
  idClienteAjeno = clienteAjeno.cliente.id;

  servidor = spawn(
    process.execPath,
    [join(RAIZ, "node_modules", "next", "dist", "bin", "next"), "dev", "--port", String(PUERTO)],
    { cwd: RAIZ, env: { ...process.env }, stdio: "ignore" },
  );
  await esperarServidorListo();
}, 180_000);

afterAll(async () => {
  // La base es la del owner: los datos de prueba no se quedan.
  for (const clientId of [idClientePropio, idClienteAjeno].filter(Boolean)) {
    await prisma.clientFeature.deleteMany({ where: { clientId } });
    await prisma.clientVersionHistory.deleteMany({ where: { clientId } });
    await prisma.client.deleteMany({ where: { id: clientId } });
  }
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

describe("las rutas nuevas quedan detrás del portón solas (M1-02 cierra por omisión)", () => {
  it("GET /clientes/nuevo sin sesión redirige a /ingresar", async () => {
    const respuesta = await fetch(`${BASE}/clientes/nuevo`, { redirect: "manual" });
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe("/ingresar");
  });

  it("GET /clientes/<id>/editar sin sesión redirige a /ingresar", async () => {
    const respuesta = await fetch(`${BASE}/clientes/${idClientePropio}/editar`, {
      redirect: "manual",
    });
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe("/ingresar");
  });
});

describe("el formulario de alta ofrece los campos y los features de la organización", () => {
  it("muestra nombre, versión activa y el checklist con el feature propio", async () => {
    const cookie = await cookieDeSesion();
    const respuesta = await fetch(`${BASE}/clientes/nuevo`, {
      redirect: "manual",
      headers: { cookie },
    });
    expect(respuesta.status).toBe(200);

    const html = await respuesta.text();
    expect(html).toContain("Nuevo cliente");
    expect(html).toContain("Nombre del cliente");
    expect(html).toContain("Versión activa");
    expect(html).toContain("Features habilitados");
    expect(html).toContain(FEATURE_PROPIO);
    expect(html).toContain("Guardar cliente");
    // La salida para crear un feature sin salir del formulario (criterio #5).
    expect(html).toContain("+ Crear feature");
  });

  it("regla #1 · ningún feature de otra organización aparece en el checklist", async () => {
    const cookie = await cookieDeSesion();
    const html = await fetch(`${BASE}/clientes/nuevo`, {
      redirect: "manual",
      headers: { cookie },
    }).then((respuesta) => respuesta.text());

    expect(html).not.toContain(FEATURE_AJENO);
    expect(html).not.toContain(`F-812-${SUFIJO}`);
  });
});

describe("el formulario de edición llega precargado", () => {
  it("trae el nombre, la versión y el feature habilitado ya tildado", async () => {
    const cookie = await cookieDeSesion();
    const respuesta = await fetch(`${BASE}/clientes/${idClientePropio}/editar`, {
      redirect: "manual",
      headers: { cookie },
    });
    expect(respuesta.status).toBe(200);

    const html = await respuesta.text();
    expect(html).toContain(CLIENTE_PROPIO);
    expect(html).toContain("2.4.0");
    expect(html).toContain("Editar cliente");
    // La casilla del feature habilitado viene marcada.
    expect(html).toMatch(
      new RegExp(`value="${idFeaturePropio}"[^>]*checked|checked[^>]*value="${idFeaturePropio}"`),
    );
  });
});

describe("criterio #8 · regla #1 · el cliente de otra organización no es visible ni editable", () => {
  it("su formulario de edición responde como si el cliente no existiera", async () => {
    const cookie = await cookieDeSesion();
    const respuesta = await fetch(`${BASE}/clientes/${idClienteAjeno}/editar`, {
      redirect: "manual",
      headers: { cookie },
    });
    expect(respuesta.status).toBe(404);

    const html = await respuesta.text();
    expect(html).not.toContain(CLIENTE_AJENO);
    expect(html).not.toContain("9.9.9");
  });

  it("y sigue intacto en la base después del intento", async () => {
    const sinTocar = await prisma.client.findUnique({ where: { id: idClienteAjeno } });
    expect(sinTocar?.name).toBe(CLIENTE_AJENO);
    expect(sinTocar?.currentVersion).toBe("9.9.9");
  });
});
