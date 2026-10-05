import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Las reglas de estilo de docs/arquitectura/marca.md, hechas verificables.
 *
 * Por qué existe esta prueba: M1-02 necesitó bordes y foco antes de que `marca.md` los
 * definiera y los derivó con transparencia (`border-texto-secundario/15`,
 * `focus:ring-primario/25`). Al medirlo aparecieron tres valores por debajo del mínimo de
 * contraste. `marca.md` ya trae los reemplazos y dos reglas que ahora mandan
 * (DECISIONS.md, 2026-10-05):
 *   - ningún hex suelto en el markup: los colores viven UNA vez como tokens de tema;
 *   - ningún color con transparencia para bordes: el alfa deriva del fondo, así que el
 *     mismo divisor cambiaría de valor entre una fila normal y una en hover.
 *
 * El test lee los hex del propio `marca.md`: si el Diseñador agrega un color al doc y nadie
 * lo declara como token, esto se pone en rojo.
 */

const RAIZ = join(__dirname, "..");
const MARCA = join(RAIZ, "docs", "arquitectura", "marca.md");
const GLOBALS = join(RAIZ, "app", "globals.css");

function markup(dir: string = join(RAIZ, "app")): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      return markup(ruta);
    }
    return entrada.endsWith(".tsx") ? [ruta] : [];
  });
}

/** Los hex de las tablas de paleta de marca.md (celda que es exactamente `#RRGGBB`). */
function hexDeMarca(): string[] {
  const unicos = new Set<string>();
  for (const linea of readFileSync(MARCA, "utf8").split(/\r?\n/)) {
    if (!linea.trimStart().startsWith("|")) {
      continue;
    }
    for (const celda of linea.split("|").map((c) => c.trim())) {
      const hex = /^`(#[0-9A-Fa-f]{6})`$/.exec(celda);
      if (hex) {
        unicos.add(hex[1].toLowerCase());
      }
    }
  }
  return [...unicos];
}

const ARCHIVOS_MARKUP = markup();
const CSS_GLOBAL = readFileSync(GLOBALS, "utf8");
const FORMULARIO = readFileSync(
  join(RAIZ, "app", "ingresar", "formulario-de-ingreso.tsx"),
  "utf8",
);

describe("tokens de marca declarados una sola vez", () => {
  it("marca.md define una paleta con las tres tablas nuevas (la prueba no es vacía)", () => {
    expect(hexDeMarca().length).toBeGreaterThanOrEqual(19);
  });

  it("todo color de marca.md está declarado como token en app/globals.css", () => {
    const faltantes = hexDeMarca().filter((hex) => !CSS_GLOBAL.toLowerCase().includes(hex));
    expect(faltantes).toEqual([]);
  });

  it("ningún hex suelto en el markup (los colores se aplican por token)", () => {
    const hallazgos = ARCHIVOS_MARKUP.filter((archivo) =>
      /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(archivo, "utf8")),
    ).map((archivo) => relative(RAIZ, archivo));
    expect(hallazgos).toEqual([]);
  });
});

describe("reglas de interfaz de marca.md", () => {
  it("ningún borde ni anillo con transparencia (el alfa deriva del fondo)", () => {
    const hallazgos: string[] = [];
    for (const archivo of ARCHIVOS_MARKUP) {
      readFileSync(archivo, "utf8")
        .split(/\r?\n/)
        .forEach((linea, i) => {
          const alfa = /\b(border|divide|ring|outline)-[a-z-]+\/\d+/.exec(linea);
          if (alfa) {
            hallazgos.push(`${relative(RAIZ, archivo)}:${i + 1} → ${alfa[0]}`);
          }
        });
    }
    expect(hallazgos).toEqual([]);
  });

  it("las tarjetas se delimitan con borde, no con sombra", () => {
    // La sombra de marca.md queda reservada a lo que flota sobre contenido (dropdowns,
    // popovers): cuando exista esa pieza, se la permite explícitamente acá.
    const hallazgos = ARCHIVOS_MARKUP.filter((archivo) =>
      /\bshadow-/.test(readFileSync(archivo, "utf8")),
    ).map((archivo) => relative(RAIZ, archivo));
    expect(hallazgos).toEqual([]);
  });

  it("el foco visible es una sola regla global, instantánea y con offset", () => {
    const regla = /:focus-visible\s*\{([^}]*)\}/g;
    const bloques = [...CSS_GLOBAL.matchAll(regla)].map((m) => m[1]);
    expect(bloques).toHaveLength(1);
    expect(bloques[0]).toMatch(/outline:\s*2px solid var\(--color-primario\)/);
    expect(bloques[0]).toMatch(/outline-offset:\s*2px/);
    expect(bloques[0]).not.toMatch(/transition/);
  });

  it("nadie anula el foco en el markup (ni outline-none ni outline-0)", () => {
    const hallazgos = ARCHIVOS_MARKUP.filter((archivo) =>
      /\boutline-(none|0)\b/.test(readFileSync(archivo, "utf8")),
    ).map((archivo) => relative(RAIZ, archivo));
    expect(hallazgos).toEqual([]);
  });
});

describe("“Verificando…” es ocupado, no deshabilitado", () => {
  it("el formulario marca el estado con aria-busy", () => {
    expect(FORMULARIO).toMatch(/aria-busy=\{verificando\}/);
  });

  it("nada se atenúa mientras verifica: el label tiene que poder leerse", () => {
    // `opacity: .6` queda reservado para controles realmente deshabilitados (marca.md).
    expect(FORMULARIO).not.toMatch(/disabled:opacity/);
  });

  it("el botón primario usa los tokens de hover y active, no opacidad", () => {
    expect(FORMULARIO).toMatch(/hover:bg-primario-hover/);
    expect(FORMULARIO).toMatch(/active:bg-primario-active/);
    expect(FORMULARIO).not.toMatch(/hover:opacity-/);
  });

  it("el campo de contraseña usa el token de borde de control", () => {
    expect(FORMULARIO).toMatch(/border-borde-control/);
  });
});
