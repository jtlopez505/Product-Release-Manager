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
 * Verificación 2 de M2-01 (integración, regla #5), capa pantalla: `/por-feature` servida por
 * un Next de verdad contra la base de verdad.
 *
 * Lo que las pruebas de `lib/` no pueden ver:
 *   - que la ruta nueva quedó efectivamente detrás del portón (sin agregarla a ninguna
 *     lista, `proxy.ts` cierra por omisión);
 *   - que la partición se ve correcta en el HTML servido, no solo en el query
 *     (criterio #3, #5, #6);
 *   - **regla #1 (filas 11 y 12):** ni un cliente ni un feature de otra organización aparecen
 *     en la pantalla, y un `?feature=` ajeno responde exactamente igual que uno inexistente;
 *   - los cuatro estados vacíos (filas 7, 8, 9, 10) servidos de verdad.
 *
 * Usa su propio puerto para no competir con los servidores de los otros archivos de
 * integración. La contraseña se lee del entorno y nunca se imprime.
 */

const RAIZ = join(__dirname, "..", "..");
const PUERTO = 3221;
const BASE = `http://127.0.0.1:${PUERTO}`;
const SUFIJO = `m2-01-pantalla-${Date.now()}`;

let servidor: ChildProcess;

let idOrganizacionAjena = "";
let idFeatureConsultado = "";
let idFeatureAjeno = "";
let idClienteConFeature = "";
let idClienteSinFila = "";
let idClienteDeshabilitado = "";
let idClienteAjeno = "";

const FEATURE_CONSULTADO = `Feature consultado ${SUFIJO}`;
const FEATURE_AJENO = `Feature ajeno ${SUFIJO}`;
const CLIENTE_CON_FEATURE = `Con feature ${SUFIJO}`;
const CLIENTE_SIN_FILA = `Sin fila ${SUFIJO}`;
const CLIENTE_DESHABILITADO = `Deshabilitado ${SUFIJO}`;
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

async function html(ruta: string): Promise<{ estado: number; cuerpo: string }> {
  const cookie = await cookieDeSesion();
  const respuesta = await fetch(`${BASE}${ruta}`, { redirect: "manual", headers: { cookie } });
  return { estado: respuesta.status, cuerpo: await respuesta.text() };
}

beforeAll(async () => {
  const propia = await organizacionActual();

  const feature = await crearFeature(propia.id, {
    name: FEATURE_CONSULTADO,
    code: `F-910-${SUFIJO}`,
    estado: "DISPONIBLE",
  });
  if (!feature.ok) {
    throw new Error("No se pudo sembrar el feature de prueba.");
  }
  idFeatureConsultado = feature.feature.id;

  const [conFeature, sinFila, deshabilitado] = await Promise.all([
    crearCliente(propia.id, {
      name: CLIENTE_CON_FEATURE,
      currentVersion: "1.0.0",
      featureIds: [idFeatureConsultado],
    }),
    crearCliente(propia.id, {
      name: CLIENTE_SIN_FILA,
      currentVersion: "1.0.0",
      featureIds: [],
    }),
    crearCliente(propia.id, {
      name: CLIENTE_DESHABILITADO,
      currentVersion: "1.0.0",
      featureIds: [idFeatureConsultado],
    }),
  ]);
  if (!conFeature.ok || !sinFila.ok || !deshabilitado.ok) {
    throw new Error("No se pudieron sembrar los clientes de prueba.");
  }
  idClienteConFeature = conFeature.cliente.id;
  idClienteSinFila = sinFila.cliente.id;
  idClienteDeshabilitado = deshabilitado.cliente.id;

  await prisma.clientFeature.update({
    where: {
      clientId_featureId: { clientId: idClienteDeshabilitado, featureId: idFeatureConsultado },
    },
    data: { enabled: false },
  });

  // Organización ajena, con su propio feature y su propio cliente: la pantalla de la
  // organización propia no se puede enterar de ninguno de los dos (regla #1).
  const ajena = await prisma.organization.create({ data: { name: `Org ajena ${SUFIJO}` } });
  idOrganizacionAjena = ajena.id;

  const featureAjeno = await crearFeature(ajena.id, { name: FEATURE_AJENO });
  if (!featureAjeno.ok) {
    throw new Error("No se pudo sembrar el feature ajeno.");
  }
  idFeatureAjeno = featureAjeno.feature.id;

  const clienteAjeno = await crearCliente(ajena.id, {
    name: CLIENTE_AJENO,
    currentVersion: "9.9.9",
    featureIds: [idFeatureAjeno],
  });
  if (!clienteAjeno.ok) {
    throw new Error("No se pudo sembrar el cliente ajeno.");
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
  const idsClientes = [
    idClienteConFeature,
    idClienteSinFila,
    idClienteDeshabilitado,
    idClienteAjeno,
  ].filter(Boolean);
  if (idsClientes.length > 0) {
    await prisma.clientFeature.deleteMany({ where: { clientId: { in: idsClientes } } });
    await prisma.clientVersionHistory.deleteMany({ where: { clientId: { in: idsClientes } } });
    await prisma.client.deleteMany({ where: { id: { in: idsClientes } } });
  }
  if (idFeatureConsultado) {
    await prisma.feature.deleteMany({ where: { id: idFeatureConsultado } });
  }
  if (idOrganizacionAjena) {
    await prisma.feature.deleteMany({ where: { organizationId: idOrganizacionAjena } });
    await prisma.organization.deleteMany({ where: { id: idOrganizacionAjena } });
  }
  await prisma.$disconnect();

  await apagarServidor();
});

/**
 * Apaga el servidor y **espera** a que deje de escuchar antes de devolver el control — mismo
 * criterio que `pantalla-de-features.test.ts`: dos servidores solapados se pisan `.next`.
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

describe("la pantalla nueva queda detrás del portón sola (M1-02 cierra por omisión)", () => {
  it("GET /por-feature sin sesión redirige a /ingresar", async () => {
    const respuesta = await fetch(`${BASE}/por-feature`, { redirect: "manual" });
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe("/ingresar");
  });
});

describe("criterio #7 · sin feature elegido", () => {
  it("muestra el selector y el mensaje, sin listas", async () => {
    const { estado, cuerpo } = await html("/por-feature");
    expect(estado).toBe(200);
    expect(cuerpo).toContain("Elegí un feature para ver qué clientes lo tienen.");
    expect(cuerpo).not.toContain("Clientes que lo tienen");
    expect(cuerpo).not.toContain("Clientes que no lo tienen todavía");
  });

  it("el selector trae el feature de la organización, en el <select>", async () => {
    const { cuerpo } = await html("/por-feature");
    expect(cuerpo).toContain(FEATURE_CONSULTADO);
    expect(cuerpo).toContain(`F-910-${SUFIJO}`);
  });
});

describe("criterio #2 y #3 · elegir un feature trae las dos listas, partidas", () => {
  it("la fila 3 de la ficha: dos lo tienen, dos todavía no", async () => {
    const { estado, cuerpo } = await html(`/por-feature?feature=${idFeatureConsultado}`);
    expect(estado).toBe(200);

    expect(cuerpo).toContain("Clientes que lo tienen (1)");
    expect(cuerpo).toContain("Clientes que no lo tienen todavía (2)");

    expect(cuerpo).toContain(CLIENTE_CON_FEATURE);
    expect(cuerpo).toContain(CLIENTE_SIN_FILA);
    expect(cuerpo).toContain(CLIENTE_DESHABILITADO);

    // El habilitado aparece antes de la sección "todavía no" (son dos bloques separados).
    expect(cuerpo.indexOf("Clientes que lo tienen")).toBeLessThan(
      cuerpo.indexOf("Clientes que no lo tienen todavía"),
    );
  });

  it("el selector queda con ese feature ya seleccionado", async () => {
    const { cuerpo } = await html(`/por-feature?feature=${idFeatureConsultado}`);
    expect(cuerpo).toMatch(
      new RegExp(`<option value="${idFeatureConsultado}"[^>]*selected`),
    );
  });

  it("criterio #6 · muestra nombre, código y chip de estado del feature elegido", async () => {
    const { cuerpo } = await html(`/por-feature?feature=${idFeatureConsultado}`);
    expect(cuerpo).toContain(FEATURE_CONSULTADO);
    expect(cuerpo).toContain(`F-910-${SUFIJO}`);
    expect(cuerpo).toContain("Disponible");
  });

  it("cada cliente linkea a su Vista de cliente", async () => {
    const { cuerpo } = await html(`/por-feature?feature=${idFeatureConsultado}`);
    expect(cuerpo).toContain(`href="/clientes/${idClienteConFeature}"`);
    expect(cuerpo).toContain(`href="/clientes/${idClienteSinFila}"`);
  });
});

describe("regla #1 · aislamiento entre organizaciones", () => {
  it("ni el cliente ni el feature ajenos aparecen sin elegir ningún feature", async () => {
    const { cuerpo } = await html("/por-feature");
    expect(cuerpo).not.toContain(CLIENTE_AJENO);
    expect(cuerpo).not.toContain(FEATURE_AJENO);
  });

  it("ni el cliente ni el feature ajenos aparecen con el feature propio elegido", async () => {
    const { cuerpo } = await html(`/por-feature?feature=${idFeatureConsultado}`);
    expect(cuerpo).not.toContain(CLIENTE_AJENO);
    expect(cuerpo).not.toContain(FEATURE_AJENO);
    expect(cuerpo).not.toContain(idClienteAjeno);
  });

  it("fila 12 · un ?feature= de otra organización responde como uno inexistente", async () => {
    const deOtra = await html(`/por-feature?feature=${idFeatureAjeno}`);
    const inventado = await html("/por-feature?feature=id-que-no-existe-en-ninguna-parte");

    expect(deOtra.estado).toBe(200);
    expect(inventado.estado).toBe(200);

    expect(deOtra.cuerpo).toContain("Ese feature ya no existe.");
    expect(inventado.cuerpo).toContain("Ese feature ya no existe.");

    // Ninguna de las dos respuestas muestra listas ni filtra nada del feature ajeno.
    expect(deOtra.cuerpo).not.toContain("Clientes que lo tienen");
    expect(inventado.cuerpo).not.toContain("Clientes que lo tienen");
    expect(deOtra.cuerpo).not.toContain(FEATURE_AJENO);

    // El selector sigue usable en los dos casos (no se rompe la pantalla).
    expect(deOtra.cuerpo).toContain("Ver clientes");
    expect(inventado.cuerpo).toContain("Ver clientes");
  });
});

describe("la navegación marca 'Por feature' como activa", () => {
  it("/por-feature trae aria-current en esa pestaña", async () => {
    const { cuerpo } = await html("/por-feature");
    // El orden de atributos del HTML servido no es el de la fuente JSX (React lo decide al
    // serializar): se verifican los dos atributos en el mismo `<a>`, no un orden literal.
    expect(cuerpo).toMatch(/<a[^>]*aria-current="page"[^>]*>Por feature<\/a>/);
    expect(cuerpo).toMatch(/<a[^>]*href="\/por-feature"[^>]*>Por feature<\/a>/);
  });
});

describe("link a la lista maestra", () => {
  it("ofrece 'Lista maestra de features' hacia /features", async () => {
    const { cuerpo } = await html("/por-feature");
    expect(cuerpo).toContain("Lista maestra de features");
    expect(cuerpo).toContain('href="/features"');
  });
});
