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

/**
 * Verificación 2 de M3-02 (integración, regla #5): la elección de criterio y la rama "por
 * feature" de `/lista-de-release`, servidas por el mismo Next de M3-01 (reusa su servidor en
 * `BASE`, así que estos describes corren después de que los de arriba ya limpiaron lo suyo).
 *
 * Lo que las pruebas de `lib/` no pueden ver:
 *   - que el link "Por feature" y el campo oculto `por=feature` del selector arman la URL
 *     correcta, y que la opción activa trae `aria-current` (fila 1);
 *   - los cuatro estados vacíos de esta rama servidos de verdad (filas 6, 7, 8, 9);
 *   - **fila 10 (no debe pasar):** un criterio por vez — el parámetro del criterio inactivo se
 *     ignora, en los dos sentidos;
 *   - **regla #1 (fila 12, no debe pasar):** ni un cliente ni un feature de otra organización
 *     aparecen ni suman a los conteos, y un `?feature=` ajeno responde igual que uno
 *     inexistente.
 */
describe("fila 1 y 2 · la elección de criterio, sin feature elegido todavía", () => {
  it("sin ?por=, 'Por versión destino' está activa", async () => {
    const { cuerpo } = await html("/lista-de-release");
    expect(cuerpo).toMatch(/<a[^>]*aria-current="page"[^>]*>Por versión destino<\/a>/);
  });

  it("el link 'Por feature' lleva a /lista-de-release?por=feature", async () => {
    const { cuerpo } = await html("/lista-de-release");
    expect(cuerpo).toMatch(/<a[^>]*href="\/lista-de-release\?por=feature"[^>]*>Por feature<\/a>/);
  });

  it("con ?por=feature, 'Por feature' queda activa", async () => {
    const { cuerpo } = await html("/lista-de-release?por=feature");
    expect(cuerpo).toMatch(/<a[^>]*aria-current="page"[^>]*>Por feature<\/a>/);
  });
});

describe("fila 8 · sin features en el catálogo (antes de sembrar ninguno)", () => {
  it("no hay selector: mensaje y salida a /features?nuevo=1", async () => {
    const { estado, cuerpo } = await html("/lista-de-release?por=feature");
    expect(estado).toBe(200);
    expect(cuerpo).toContain("Todavía no cargaste ningún feature.");
    expect(cuerpo).toContain('href="/features?nuevo=1"');
    expect(cuerpo).not.toContain("<select");
  });
});

describe("M3-02 · con un feature en el catálogo", () => {
  const FEATURE = `Feature release ${SUFIJO}`;
  let idFeature = "";

  beforeAll(async () => {
    const propia = await organizacionActual();
    const feature = await crearFeature(propia.id, { name: FEATURE, code: `F-M3-02-${SUFIJO}` });
    if (!feature.ok) {
      throw new Error("No se pudo sembrar el feature de prueba.");
    }
    idFeature = feature.feature.id;
  });

  afterAll(async () => {
    if (idFeature) {
      await prisma.feature.deleteMany({ where: { id: idFeature } });
    }
  });

  describe("fila 6 · sin feature elegido", () => {
    it("explica qué hacer, sin consultar clientes", async () => {
      const { estado, cuerpo } = await html("/lista-de-release?por=feature");
      expect(estado).toBe(200);
      expect(cuerpo).toContain(
        "Elegí el feature que vas a desplegar para ver qué clientes lo reciben.",
      );
      expect(cuerpo).not.toContain("Clientes que reciben");
    });

    it("el selector trae el feature en el <select>", async () => {
      const { cuerpo } = await html("/lista-de-release?por=feature");
      expect(cuerpo).toContain(FEATURE);
      expect(cuerpo).toContain(`F-M3-02-${SUFIJO}`);
    });

    it("el selector manda a /lista-de-release con el campo oculto por=feature", async () => {
      const { cuerpo } = await html("/lista-de-release?por=feature");
      // El orden de atributos del HTML servido no es el de la fuente JSX (React lo decide al
      // serializar, mismo criterio que la prueba de aria-current de más arriba): se verifica
      // cada atributo del mismo `<form>`, no un orden literal.
      expect(cuerpo).toMatch(/<form[^>]*method="get"[^>]*>/);
      expect(cuerpo).toMatch(/<form[^>]*action="\/lista-de-release"[^>]*>/);
      expect(cuerpo).toMatch(/<input[^>]*type="hidden"[^>]*name="por"[^>]*value="feature"/);
      expect(cuerpo).toContain("Ver lista");
    });
  });

  describe("fila 9 · sin clientes cargados, con un feature ya elegido", () => {
    it("un solo mensaje y la acción, ni lista ni conteos", async () => {
      const { estado, cuerpo } = await html(
        `/lista-de-release?por=feature&feature=${idFeature}`,
      );
      expect(estado).toBe(200);
      expect(cuerpo).toContain("Todavía no cargaste ningún cliente.");
      expect(cuerpo).toContain("+ Agregar cliente");
      expect(cuerpo).not.toContain("Clientes que reciben");
    });
  });

  describe("con clientes sembrados", () => {
    // A y B tienen el feature habilitado; C no tiene fila; D tiene la fila deshabilitada —
    // el caso de la ficha M3-02, fila 3: C y D "todavía no lo tienen" (reciben el release).
    const CLIENTE_A = `A feature ${SUFIJO}`;
    const CLIENTE_B = `B feature ${SUFIJO}`;
    const CLIENTE_C = `C feature ${SUFIJO}`;
    const CLIENTE_D = `D feature ${SUFIJO}`;
    const CLIENTE_AJENO = `Ajeno feature ${SUFIJO}`;
    const FEATURE_AJENO = `Feature ajeno ${SUFIJO}`;
    const FEATURE_TODOS = `Feature todos ${SUFIJO}`;

    let idClienteA = "";
    let idClienteB = "";
    let idClienteC = "";
    let idClienteD = "";
    let idOrganizacionAjena = "";
    let idFeatureAjeno = "";
    let idClienteAjeno = "";
    let idFeatureTodos = "";

    beforeAll(async () => {
      const propia = await organizacionActual();

      const [a, b, c, d] = await Promise.all([
        crearCliente(propia.id, { name: CLIENTE_A, currentVersion: "1.0.0", featureIds: [idFeature] }),
        crearCliente(propia.id, { name: CLIENTE_B, currentVersion: "1.0.0", featureIds: [idFeature] }),
        crearCliente(propia.id, { name: CLIENTE_C, currentVersion: "1.0.0", featureIds: [] }),
        crearCliente(propia.id, { name: CLIENTE_D, currentVersion: "1.0.0", featureIds: [idFeature] }),
      ]);
      if (!a.ok || !b.ok || !c.ok || !d.ok) {
        throw new Error("No se pudieron sembrar los clientes de prueba.");
      }
      idClienteA = a.cliente.id;
      idClienteB = b.cliente.id;
      idClienteC = c.cliente.id;
      idClienteD = d.cliente.id;

      // D queda con la fila deshabilitada: cae en "todavía no lo tienen" junto con C.
      await prisma.clientFeature.update({
        where: { clientId_featureId: { clientId: idClienteD, featureId: idFeature } },
        data: { enabled: false },
      });

      // Un segundo feature que los cuatro tienen habilitado: ninguno queda en "reciben"
      // (fila 7 de la ficha — "Ningún cliente corresponde a este filtro todavía").
      const featureTodos = await crearFeature(propia.id, { name: FEATURE_TODOS });
      if (!featureTodos.ok) {
        throw new Error("No se pudo sembrar el feature que todos tienen.");
      }
      idFeatureTodos = featureTodos.feature.id;
      await prisma.clientFeature.createMany({
        data: [idClienteA, idClienteB, idClienteC, idClienteD].map((clientId) => ({
          clientId,
          featureId: idFeatureTodos,
          enabled: true,
        })),
      });

      // Organización ajena, con su propio feature y su propio cliente: la pantalla de la
      // organización propia no se puede enterar de ninguno de los dos (regla #1, fila 12).
      const ajena = await prisma.organization.create({ data: { name: `Org ajena feature ${SUFIJO}` } });
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
    });

    afterAll(async () => {
      await borrarClientes([idClienteA, idClienteB, idClienteC, idClienteD, idClienteAjeno]);
      if (idFeatureTodos) {
        await prisma.feature.deleteMany({ where: { id: idFeatureTodos } });
      }
      if (idFeatureAjeno) {
        await prisma.feature.deleteMany({ where: { id: idFeatureAjeno } });
      }
      if (idOrganizacionAjena) {
        await prisma.organization.deleteMany({ where: { id: idOrganizacionAjena } });
      }
    });

    describe("fila 3, 4 y 5 · la partición, los conteos y la vista previa", () => {
      it("C y D reciben (todavía no lo tienen); A y B ya lo tienen y no aparecen", async () => {
        const { estado, cuerpo } = await html(
          `/lista-de-release?por=feature&feature=${idFeature}`,
        );
        expect(estado).toBe(200);
        expect(cuerpo).toContain(`Clientes que reciben ${FEATURE} (2)`);
        expect(cuerpo).toContain("2 clientes ya tienen este feature");
        expect(cuerpo).toContain(CLIENTE_C);
        expect(cuerpo).toContain(CLIENTE_D);
        expect(cuerpo).not.toContain(CLIENTE_A);
        expect(cuerpo).not.toContain(CLIENTE_B);
      });

      it("cada cliente de la lista linkea a su Vista de cliente", async () => {
        const { cuerpo } = await html(`/lista-de-release?por=feature&feature=${idFeature}`);
        expect(cuerpo).toContain(`href="/clientes/${idClienteC}"`);
        expect(cuerpo).toContain(`href="/clientes/${idClienteD}"`);
      });

      it("el selector queda con ese feature ya elegido", async () => {
        const { cuerpo } = await html(`/lista-de-release?por=feature&feature=${idFeature}`);
        expect(cuerpo).toMatch(new RegExp(`<option value="${idFeature}"[^>]*selected`));
      });

      it("muestra nombre, código y chip de estado del feature elegido", async () => {
        const { cuerpo } = await html(`/lista-de-release?por=feature&feature=${idFeature}`);
        expect(cuerpo).toContain(FEATURE);
        expect(cuerpo).toContain(`F-M3-02-${SUFIJO}`);
        expect(cuerpo).toContain("Disponible");
      });
    });

    describe("fila 7 · todos los clientes ya tienen el feature", () => {
      it("dice 'Ningún cliente corresponde a este filtro todavía' y el conteo en plural", async () => {
        const { cuerpo } = await html(
          `/lista-de-release?por=feature&feature=${idFeatureTodos}`,
        );
        expect(cuerpo).toContain("Ningún cliente corresponde a este filtro todavía.");
        expect(cuerpo).toContain("4 clientes ya tienen este feature");
        expect(cuerpo).not.toContain(`Clientes que reciben ${FEATURE_TODOS}`);
      });
    });

    describe("fila 10 · un criterio por vez (no debe pasar)", () => {
      it("?por=feature&feature=<id>&version=2.5.0 lista por feature e ignora la versión", async () => {
        const { cuerpo } = await html(
          `/lista-de-release?por=feature&feature=${idFeature}&version=2.5.0`,
        );
        expect(cuerpo).toContain(`Clientes que reciben ${FEATURE} (2)`);
        expect(cuerpo).not.toContain("Clientes que reciben la 2.5.0");
      });

      it("?version=1.0.0&feature=<id> (sin por) lista por versión e ignora el feature", async () => {
        const { cuerpo } = await html(
          `/lista-de-release?version=1.0.0&feature=${idFeature}`,
        );
        // A, B, C, D están en 1.0.0: todos "ya están", ninguno "recibe".
        expect(cuerpo).toContain("Ningún cliente corresponde a este filtro todavía.");
        expect(cuerpo).toContain("4 clientes ya están en 1.0.0");
        expect(cuerpo).not.toContain(`Clientes que reciben ${FEATURE}`);
      });

      it("cambiar de criterio con los links no arrastra la selección del otro", async () => {
        const { cuerpo } = await html("/lista-de-release?por=feature");
        // El link "Por versión destino" no lleva ningún ?feature= pegado.
        expect(cuerpo).toMatch(/<a[^>]*href="\/lista-de-release"[^>]*>Por versión destino<\/a>/);
      });
    });

    describe("fila 12 · regla #1, aislamiento entre organizaciones (no debe pasar)", () => {
      it("el cliente y el feature ajenos no aparecen ni suman en los conteos", async () => {
        const { cuerpo } = await html(`/lista-de-release?por=feature&feature=${idFeature}`);
        expect(cuerpo).not.toContain(CLIENTE_AJENO);
        expect(cuerpo).not.toContain(FEATURE_AJENO);
        expect(cuerpo).not.toContain(idClienteAjeno);
      });

      it("el feature ajeno no aparece en el selector", async () => {
        const { cuerpo } = await html("/lista-de-release?por=feature");
        expect(cuerpo).not.toContain(FEATURE_AJENO);
      });

      it("un ?feature= de otra organización responde igual que uno inexistente", async () => {
        const deOtra = await html(`/lista-de-release?por=feature&feature=${idFeatureAjeno}`);
        const inventado = await html(
          "/lista-de-release?por=feature&feature=id-que-no-existe-en-ninguna-parte",
        );

        expect(deOtra.estado).toBe(200);
        expect(inventado.estado).toBe(200);

        expect(deOtra.cuerpo).toContain("Ese feature ya no existe.");
        expect(inventado.cuerpo).toContain("Ese feature ya no existe.");

        expect(deOtra.cuerpo).not.toContain("Clientes que reciben");
        expect(inventado.cuerpo).not.toContain("Clientes que reciben");
        expect(deOtra.cuerpo).not.toContain(FEATURE_AJENO);

        // El selector sigue usable en los dos casos (no se rompe la pantalla).
        expect(deOtra.cuerpo).toContain("Ver lista");
        expect(inventado.cuerpo).toContain("Ver lista");
      });
    });
  });
});
