import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { actualizarCliente, crearCliente } from "../../lib/clientes";
import { requireEnv } from "../../lib/env";
import { crearFeature } from "../../lib/features";
import { organizacionActual } from "../../lib/organizacion";
import { prisma } from "../../lib/prisma";
import { NOMBRE_COOKIE_SESION } from "../../lib/sesion";

/**
 * Verificación 2 de M1-05 (integración, regla #5): Inicio (`/`) y la Vista de cliente
 * (`/clientes/<id>`) servidas por un Next de verdad contra la base de verdad.
 *
 * Lo que las pruebas de `lib/` no pueden ver:
 *   - **regla #1, criterio #6:** un cliente de otra organización no aparece en la lista de
 *     Inicio — medido en el HTML, no en el query;
 *   - **regla #1, criterio #7:** ese mismo cliente no es accesible armando la URL de detalle
 *     a mano: la ruta responde 404 y no filtra ni el nombre ni la versión;
 *   - que las rutas nuevas quedaron detrás del portón solas (`proxy.ts` cierra por omisión);
 *   - que el historial completo llega a la pantalla con el más reciente primero (criterio #5);
 *   - que la navegación existe de verdad: desde Inicio se llega al alta y a la lista maestra
 *     de features (los dos links que M1-05 reemplaza por navegación real).
 *
 * Usa su propio puerto para no competir con los servidores de los otros archivos de
 * integración. La contraseña se lee del entorno y nunca se imprime.
 */

const RAIZ = join(__dirname, "..", "..");
const PUERTO = 3220;
const BASE = `http://127.0.0.1:${PUERTO}`;
const SUFIJO = `m1-05-inicio-${Date.now()}`;

let servidor: ChildProcess;
let idOrganizacionAjena = "";
let idFeatureHabilitado = "";
let idFeatureNoHabilitado = "";
let idClientePropio = "";
let idClienteAjeno = "";

const FEATURE_HABILITADO = `Feature habilitado ${SUFIJO}`;
const FEATURE_NO_HABILITADO = `Feature no habilitado ${SUFIJO}`;
const FEATURE_AJENO = `Feature ajeno ${SUFIJO}`;
const CLIENTE_PROPIO = `Cliente propio ${SUFIJO}`;
const CLIENTE_AJENO = `Cliente ajeno ${SUFIJO}`;
const VERSION_PRIMERA = "2.4.0";
const VERSION_ACTUAL = "2.5.0";
const VERSION_AJENA = "9.9.9";

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
  const respuesta = await fetch(`${BASE}${ruta}`, {
    redirect: "manual",
    headers: { cookie },
  });
  return { estado: respuesta.status, cuerpo: await respuesta.text() };
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
  // La organización de la app: dos features (uno habilitado y otro no, para ver los dos
  // grupos del criterio #4) y un cliente con DOS filas de historial (el alta + un cambio
  // de versión, criterio #5).
  const propia = await organizacionActual();
  const habilitado = await crearFeature(propia.id, {
    name: FEATURE_HABILITADO,
    code: `F-851-${SUFIJO}`,
  });
  const noHabilitado = await crearFeature(propia.id, {
    name: FEATURE_NO_HABILITADO,
    code: `F-852-${SUFIJO}`,
  });
  if (!habilitado.ok || !noHabilitado.ok) {
    throw new Error("No se pudieron sembrar los features de prueba de la organización actual.");
  }
  idFeatureHabilitado = habilitado.feature.id;
  idFeatureNoHabilitado = noHabilitado.feature.id;

  const alta = await crearCliente(propia.id, {
    name: CLIENTE_PROPIO,
    currentVersion: VERSION_PRIMERA,
    featureIds: [idFeatureHabilitado],
  });
  if (!alta.ok) {
    throw new Error("No se pudo sembrar el cliente de prueba de la organización actual.");
  }
  idClientePropio = alta.cliente.id;

  const cambio = await actualizarCliente(propia.id, idClientePropio, {
    name: CLIENTE_PROPIO,
    currentVersion: VERSION_ACTUAL,
    featureIds: [idFeatureHabilitado],
  });
  if (!cambio.ok) {
    throw new Error("No se pudo registrar el cambio de versión del cliente de prueba.");
  }

  // La organización ajena: la pantalla no tiene que enterarse de nada de esto (regla #1).
  const ajena = await prisma.organization.create({ data: { name: `Org ajena ${SUFIJO}` } });
  idOrganizacionAjena = ajena.id;
  const ajeno = await crearFeature(ajena.id, { name: FEATURE_AJENO, code: `F-853-${SUFIJO}` });
  const clienteAjeno = await crearCliente(ajena.id, {
    name: CLIENTE_AJENO,
    currentVersion: VERSION_AJENA,
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
  for (const featureId of [idFeatureHabilitado, idFeatureNoHabilitado].filter(Boolean)) {
    await prisma.feature.deleteMany({ where: { id: featureId } });
  }
  if (idOrganizacionAjena) {
    await prisma.feature.deleteMany({ where: { organizationId: idOrganizacionAjena } });
    await prisma.organization.deleteMany({ where: { id: idOrganizacionAjena } });
  }
  await prisma.$disconnect();

  await apagarServidor();
});

describe("las pantallas de consulta quedan detrás del portón solas", () => {
  it("GET / sin sesión redirige a /ingresar", async () => {
    const respuesta = await fetch(`${BASE}/`, { redirect: "manual" });
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe("/ingresar");
  });

  it("GET /clientes/<id> sin sesión redirige a /ingresar", async () => {
    const respuesta = await fetch(`${BASE}/clientes/${idClientePropio}`, {
      redirect: "manual",
    });
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe("/ingresar");
  });
});

describe("criterio #1 · Inicio lista los clientes con su versión activa en la misma fila", () => {
  it("muestra el nombre y la versión activa sin abrir el detalle", async () => {
    const { estado, cuerpo } = await html("/");
    expect(estado).toBe(200);
    expect(cuerpo).toContain(CLIENTE_PROPIO);
    expect(cuerpo).toContain(VERSION_ACTUAL);
  });

  it("criterio #2 · la fila linkea a la Vista de ese cliente", async () => {
    const { cuerpo } = await html("/");
    expect(cuerpo).toContain(`href="/clientes/${idClientePropio}"`);
  });

  it("la acción para agregar un cliente está siempre visible y linkea al alta", async () => {
    const { cuerpo } = await html("/");
    expect(cuerpo).toContain("+ Agregar cliente");
    expect(cuerpo).toContain('href="/clientes/nuevo"');
  });

  it("la navegación de verdad reemplaza el link puente a la lista de features", async () => {
    const { cuerpo } = await html("/");
    expect(cuerpo).toContain('href="/features"');
    expect(cuerpo).not.toContain("Ver la lista de features");
  });
});

describe("criterio #6 · regla #1 · ningún cliente de otra organización en la lista", () => {
  it("Inicio no incluye ni el nombre ni la versión del cliente ajeno", async () => {
    const { cuerpo } = await html("/");
    expect(cuerpo).not.toContain(CLIENTE_AJENO);
    expect(cuerpo).not.toContain(VERSION_AJENA);
    expect(cuerpo).not.toContain(idClienteAjeno);
  });
});

describe("criterios #3, #4 y #5 · la Vista de cliente responde la pregunta del PM", () => {
  it("encabeza con el nombre y la versión activa", async () => {
    const { estado, cuerpo } = await html(`/clientes/${idClientePropio}`);
    expect(estado).toBe(200);
    expect(cuerpo).toContain(CLIENTE_PROPIO);
    expect(cuerpo).toContain(VERSION_ACTUAL);
  });

  it("criterio #4 · muestra los features habilitados y los no habilitados, separados", async () => {
    const { cuerpo } = await html(`/clientes/${idClientePropio}`);
    expect(cuerpo).toContain(FEATURE_HABILITADO);
    expect(cuerpo).toContain(FEATURE_NO_HABILITADO);
    // Los dos grupos se nombran con palabras, no solo con color (marca.md).
    expect(cuerpo).toContain("Habilitados");
    expect(cuerpo).toContain("No habilitados todavía");
    // El habilitado va primero: es la respuesta que se busca al abrir la pantalla.
    expect(cuerpo.indexOf(FEATURE_HABILITADO)).toBeLessThan(
      cuerpo.indexOf(FEATURE_NO_HABILITADO),
    );
  });

  it("criterio #5 · muestra el historial completo, más reciente primero", async () => {
    const { cuerpo } = await html(`/clientes/${idClientePropio}`);
    expect(cuerpo).toContain("Historial de versiones");
    // Las dos filas: el alta (2.4.0) y el cambio (2.5.0). La vieja solo puede estar en el
    // historial, porque la versión activa ya es otra.
    expect(cuerpo).toContain(VERSION_PRIMERA);
    // El orden se mide DENTRO de la sección (el encabezado ya nombró la versión activa
    // antes, y el payload de React repite todo el contenido al final del documento).
    const seccion = cuerpo.slice(cuerpo.indexOf("Historial de versiones"));
    expect(seccion.indexOf(VERSION_ACTUAL)).toBeGreaterThan(-1);
    expect(seccion.indexOf(VERSION_ACTUAL)).toBeLessThan(seccion.indexOf(VERSION_PRIMERA));
    // Fecha de cada fila, en formato legible (dd/mm/aaaa hh:mm).
    expect(cuerpo).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
  });

  it("ofrece la salida a editar, que es donde vive el formulario (M1-04)", async () => {
    const { cuerpo } = await html(`/clientes/${idClientePropio}`);
    expect(cuerpo).toContain(`href="/clientes/${idClientePropio}/editar"`);
  });

  it("regla #1 · no se filtra ningún feature de otra organización", async () => {
    const { cuerpo } = await html(`/clientes/${idClientePropio}`);
    expect(cuerpo).not.toContain(FEATURE_AJENO);
    expect(cuerpo).not.toContain(`F-853-${SUFIJO}`);
  });
});

describe("criterio #7 · regla #1 · el cliente ajeno no es accesible por URL directa", () => {
  it("su Vista responde como si el cliente no existiera", async () => {
    const { estado, cuerpo } = await html(`/clientes/${idClienteAjeno}`);
    expect(estado).toBe(404);
    expect(cuerpo).not.toContain(CLIENTE_AJENO);
    expect(cuerpo).not.toContain(VERSION_AJENA);
  });

  it("y sigue intacto en la base después del intento", async () => {
    const sinTocar = await prisma.client.findUnique({ where: { id: idClienteAjeno } });
    expect(sinTocar?.name).toBe(CLIENTE_AJENO);
    expect(sinTocar?.currentVersion).toBe(VERSION_AJENA);
  });

  it("un id que no existe en ninguna parte responde igual: 404", async () => {
    const { estado } = await html("/clientes/no-existe-este-id");
    expect(estado).toBe(404);
  });
});
