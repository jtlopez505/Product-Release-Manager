import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearCliente } from "../../lib/clientes";
import { requireEnv } from "../../lib/env";
import { organizacionActual } from "../../lib/organizacion";
import { prisma } from "../../lib/prisma";
import { NOMBRE_COOKIE_SESION } from "../../lib/sesion";

/**
 * Verificación 2 de M3-01 (integración, regla #5), capa pantalla: `/lista-de-release`
 * servida por un Next de verdad contra la base de verdad.
 *
 * Lo que las pruebas de `lib/` no pueden ver:
 *   - que la ruta nueva quedó efectivamente detrás del portón (sin agregarla a ninguna
 *     lista, `proxy.ts` cierra por omisión) — criterio #12;
 *   - los estados vacíos de verdad servidos (filas 7, 8, 9);
 *   - **regla #1 (fila 10):** un cliente de otra organización no aparece en la lista ni en
 *     los conteos de la pantalla servida;
 *   - **criterio #11:** una versión con caracteres raros se pinta como texto, nunca se
 *     interpreta;
 *   - la pestaña "Lista de release" nueva en la navegación, sin tocar las otras dos.
 *
 * Usa su propio puerto para no competir con los servidores de los otros archivos de
 * integración. La contraseña se lee del entorno y nunca se imprime.
 *
 * **Los tres estados vacíos (filas 7, 8, 9) necesitan organizaciones de clientes distintas
 * — "cero", "todos comparten la versión pedida" y "versiones repartidas"— así que los
 * describes de abajo siembran y limpian su propio escenario en orden, en vez de un solo
 * `beforeAll` para todo el archivo: cada uno deja la organización sembrada como la encontró
 * antes de que arranque el siguiente.**
 */

const RAIZ = join(__dirname, "..", "..");
const PUERTO = 3222;
const BASE = `http://127.0.0.1:${PUERTO}`;
const SUFIJO = `m3-01-pantalla-${Date.now()}`;

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

/** Borra clientes (y su historial/features) por id — limpieza compartida entre describes. */
async function borrarClientes(ids: string[]): Promise<void> {
  const presentes = ids.filter(Boolean);
  if (presentes.length === 0) {
    return;
  }
  await prisma.clientFeature.deleteMany({ where: { clientId: { in: presentes } } });
  await prisma.clientVersionHistory.deleteMany({ where: { clientId: { in: presentes } } });
  await prisma.client.deleteMany({ where: { id: { in: presentes } } });
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
  await prisma.$disconnect();
  await apagarServidor();
});

/**
 * Apaga el servidor y espera a que deje de escuchar antes de devolver el control — mismo
 * criterio que `pantalla-de-por-feature.test.ts`: dos servidores solapados se pisan `.next`.
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
  it("GET /lista-de-release sin sesión redirige a /ingresar", async () => {
    const respuesta = await fetch(`${BASE}/lista-de-release`, { redirect: "manual" });
    expect([302, 307, 308]).toContain(respuesta.status);
    expect(new URL(respuesta.headers.get("location") ?? "", BASE).pathname).toBe("/ingresar");
  });
});

describe("criterio #9 · sin ningún cliente cargado", () => {
  // Corre primero, antes de que cualquier otro describe siembre un cliente: depende de que
  // la organización sembrada arranque sin clientes (igual que el resto de la suite asume).
  it("un solo mensaje y la acción, ni lista ni conteos", async () => {
    const { estado, cuerpo } = await html("/lista-de-release?version=2.5.0");
    expect(estado).toBe(200);
    expect(cuerpo).toContain("Todavía no cargaste ningún cliente.");
    expect(cuerpo).toContain("+ Agregar cliente");
    expect(cuerpo).not.toContain("Clientes que reciben");
    expect(cuerpo).not.toContain("ya está en");
    expect(cuerpo).not.toContain("ya están en");
  });
});

describe("criterio #8 · todos los clientes ya están en la versión pedida", () => {
  const CLIENTE_E = `E ${SUFIJO}`;
  const CLIENTE_F = `F ${SUFIJO}`;
  let idE = "";
  let idF = "";

  beforeAll(async () => {
    const propia = await organizacionActual();
    const [e, f] = await Promise.all([
      crearCliente(propia.id, { name: CLIENTE_E, currentVersion: "3.0.0", featureIds: [] }),
      crearCliente(propia.id, { name: CLIENTE_F, currentVersion: "3.0.0", featureIds: [] }),
    ]);
    if (!e.ok || !f.ok) {
      throw new Error("No se pudieron sembrar los clientes de prueba.");
    }
    idE = e.cliente.id;
    idF = f.cliente.id;
  });

  afterAll(async () => {
    await borrarClientes([idE, idF]);
  });

  it("dice 'Ningún cliente corresponde a este filtro todavía' y '2 clientes ya están en 3.0.0'", async () => {
    const { estado, cuerpo } = await html("/lista-de-release?version=3.0.0");
    expect(estado).toBe(200);
    // Texto literal de docs/arquitectura/user-flow.md §5 (criterio #8 de la ficha).
    expect(cuerpo).toContain("Ningún cliente corresponde a este filtro todavía.");
    expect(cuerpo).toContain("2 clientes ya están en 3.0.0");
    expect(cuerpo).not.toContain("Clientes que reciben");
  });
});

describe("con clientes en versiones repartidas", () => {
  const CLIENTE_A = `A ${SUFIJO}`;
  const CLIENTE_B = `B ${SUFIJO}`;
  const CLIENTE_C = `C ${SUFIJO}`;
  const CLIENTE_D = `D ${SUFIJO}`;
  const CLIENTE_AJENO = `Ajeno ${SUFIJO}`;

  let idClienteA = "";
  let idClienteB = "";
  let idClienteC = "";
  let idClienteD = "";
  let idOrganizacionAjena = "";
  let idClienteAjeno = "";

  beforeAll(async () => {
    const propia = await organizacionActual();

    // A, B, C, D: el caso de la ficha §3 fila 3 — pedir 2.5.0 trae A, B y D; C queda afuera.
    const [a, b, c, d] = await Promise.all([
      crearCliente(propia.id, { name: CLIENTE_A, currentVersion: "2.4.0", featureIds: [] }),
      crearCliente(propia.id, { name: CLIENTE_B, currentVersion: "2.4.1", featureIds: [] }),
      crearCliente(propia.id, { name: CLIENTE_C, currentVersion: "2.5.0", featureIds: [] }),
      crearCliente(propia.id, { name: CLIENTE_D, currentVersion: "2.6.0", featureIds: [] }),
    ]);
    if (!a.ok || !b.ok || !c.ok || !d.ok) {
      throw new Error("No se pudieron sembrar los clientes de prueba.");
    }
    idClienteA = a.cliente.id;
    idClienteB = b.cliente.id;
    idClienteC = c.cliente.id;
    idClienteD = d.cliente.id;

    // Organización ajena, con su propio cliente en la misma versión que A: la pantalla de la
    // organización propia no se puede enterar de él (regla #1, fila 10).
    const ajena = await prisma.organization.create({ data: { name: `Org ajena ${SUFIJO}` } });
    idOrganizacionAjena = ajena.id;
    const clienteAjeno = await crearCliente(ajena.id, {
      name: CLIENTE_AJENO,
      currentVersion: "2.4.0",
      featureIds: [],
    });
    if (!clienteAjeno.ok) {
      throw new Error("No se pudo sembrar el cliente ajeno.");
    }
    idClienteAjeno = clienteAjeno.cliente.id;
  });

  afterAll(async () => {
    await borrarClientes([idClienteA, idClienteB, idClienteC, idClienteD, idClienteAjeno]);
    if (idOrganizacionAjena) {
      await prisma.organization.deleteMany({ where: { id: idOrganizacionAjena } });
    }
  });

  describe("criterio #7 · sin versión pedida", () => {
    it("muestra el campo y el mensaje, sin lista", async () => {
      const { estado, cuerpo } = await html("/lista-de-release");
      expect(estado).toBe(200);
      expect(cuerpo).toContain(
        "Escribí la versión que vas a desplegar para ver qué clientes la reciben.",
      );
      expect(cuerpo).not.toContain("Clientes que reciben");
    });

    it("una versión de solo espacios cuenta igual como 'sin versión'", async () => {
      const { estado, cuerpo } = await html("/lista-de-release?version=%20%20");
      expect(estado).toBe(200);
      expect(cuerpo).toContain(
        "Escribí la versión que vas a desplegar para ver qué clientes la reciben.",
      );
    });
  });

  describe("criterios #2, #3, #5, #6 · pedir una versión trae la lista y los conteos", () => {
    it("fila 3 de la ficha: A, B y D reciben; C no aparece", async () => {
      const { estado, cuerpo } = await html("/lista-de-release?version=2.5.0");
      expect(estado).toBe(200);

      expect(cuerpo).toContain("Clientes que reciben la 2.5.0 (3)");
      expect(cuerpo).toContain("1 cliente ya está en 2.5.0");

      expect(cuerpo).toContain(CLIENTE_A);
      expect(cuerpo).toContain(CLIENTE_B);
      expect(cuerpo).toContain(CLIENTE_D);
      expect(cuerpo).not.toContain(CLIENTE_C);
    });

    it("el campo conserva la versión pedida", async () => {
      const { cuerpo } = await html("/lista-de-release?version=2.5.0");
      expect(cuerpo).toMatch(/name="version"[^>]*value="2\.5\.0"/);
    });

    it("cada cliente linkea a su Vista de cliente", async () => {
      const { cuerpo } = await html("/lista-de-release?version=2.5.0");
      expect(cuerpo).toContain(`href="/clientes/${idClienteA}"`);
      expect(cuerpo).toContain(`href="/clientes/${idClienteD}"`);
    });

    it("criterio #4 · ignora espacios al borde: '  2.5.0  ' da la misma lista que '2.5.0'", async () => {
      const conEspacios = await html("/lista-de-release?version=%20%202.5.0%20%20");
      expect(conEspacios.estado).toBe(200);
      expect(conEspacios.cuerpo).toContain("Clientes que reciben la 2.5.0 (3)");
    });
  });

  describe("criterio #11 · una versión con caracteres raros se muestra como texto", () => {
    it("responde 200 y pinta el texto literal, sin ejecutarlo", async () => {
      const cruda = "<script>alert(1)</script>";
      const { estado, cuerpo } = await html(
        `/lista-de-release?version=${encodeURIComponent(cruda)}`,
      );
      expect(estado).toBe(200);
      // Escapado por React: el script nunca queda como una etiqueta real en el HTML.
      expect(cuerpo).not.toContain("<script>alert(1)</script>");
      expect(cuerpo).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    });
  });

  describe("regla #1 · aislamiento entre organizaciones (fila 10)", () => {
    it("sin versión pedida, el cliente ajeno no aparece en ningún lado", async () => {
      const { cuerpo } = await html("/lista-de-release");
      expect(cuerpo).not.toContain(CLIENTE_AJENO);
    });

    it("con una versión pedida, el cliente ajeno no suma ni a la lista ni a los conteos", async () => {
      const { cuerpo } = await html("/lista-de-release?version=2.4.0");
      expect(cuerpo).not.toContain(CLIENTE_AJENO);
      expect(cuerpo).not.toContain(idClienteAjeno);
      // A está en 2.4.0: pedir esa misma versión da un único "ya está" (A) — el ajeno, que
      // también está en 2.4.0 pero en su propia organización, no suma al conteo.
      expect(cuerpo).toContain("1 cliente ya está en 2.4.0");
    });
  });

  describe("la navegación suma 'Lista de release' sin tocar las otras dos pestañas", () => {
    it("/lista-de-release trae aria-current en esa pestaña", async () => {
      const { cuerpo } = await html("/lista-de-release");
      expect(cuerpo).toMatch(/<a[^>]*aria-current="page"[^>]*>Lista de release<\/a>/);
      expect(cuerpo).toMatch(/<a[^>]*href="\/lista-de-release"[^>]*>Lista de release<\/a>/);
    });

    it("'Por cliente' y 'Por feature' siguen llevando a / y /por-feature", async () => {
      const { cuerpo } = await html("/lista-de-release");
      expect(cuerpo).toMatch(/<a[^>]*href="\/"[^>]*>Por cliente<\/a>/);
      expect(cuerpo).toMatch(/<a[^>]*href="\/por-feature"[^>]*>Por feature<\/a>/);
    });
  });
});
