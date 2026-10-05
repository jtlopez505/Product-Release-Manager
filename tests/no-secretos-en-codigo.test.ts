import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { CLAVES_OBLIGATORIAS } from "../lib/env";

// Criterio #6 de la ficha M1-01 (regla #2): ningún secreto queda escrito en el código.
// Esta prueba es la red que lo hace verificable en cada corrida, no solo en code review.
//
// Dos niveles de chequeo:
//   a) los VALORES reales del .env no aparecen en ningún archivo fuente (incluidos los tests);
//   b) en el código de producción (todo menos los propios tests) no hay connection strings ni
//      asignaciones literales de las claves — solo lecturas de process.env.
// Los tests pueden usar valores de fantasía como fixtures: el chequeo (a) garantiza que no sean
// los reales.
//
// Importante: ningún mensaje de error de esta prueba imprime el valor de un secreto; solo el
// nombre de la variable y el archivo donde apareció.

const RAIZ = join(__dirname, "..");
// Además del código: los .mts de configuración, el schema y los .sql de las migraciones,
// que también se commitean y también podrían llevar una credencial pegada por error.
const EXTENSIONES = [
  ".ts",
  ".tsx",
  ".mts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".prisma",
  ".sql",
];
const DIRECTORIOS_IGNORADOS = new Set([
  "node_modules",
  ".next",
  ".git",
  "generated",
  "out",
  "build",
  "coverage",
]);

function archivosFuente(dir: string = RAIZ): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      return DIRECTORIOS_IGNORADOS.has(entrada) ? [] : archivosFuente(ruta);
    }
    return EXTENSIONES.some((ext) => entrada.endsWith(ext)) ? [ruta] : [];
  });
}

function esArchivoDeTest(ruta: string): boolean {
  const rel = relative(RAIZ, ruta);
  return rel.includes(".test.") || rel.split(sep)[0] === "tests";
}

function valoresRealesDelEnv(): Array<{ nombre: string; valor: string }> {
  let contenido = "";
  try {
    contenido = readFileSync(join(RAIZ, ".env"), "utf8");
  } catch {
    return [];
  }
  return contenido
    .split(/\r?\n/)
    .map((linea) => /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(linea))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({
      nombre: m[1],
      valor: m[2].trim().replace(/^["']|["']$/g, ""),
    }))
    .filter((v) => v.valor.length >= 8);
}

const FUENTES = archivosFuente();

describe("ningún secreto escrito en el código", () => {
  it("encuentra archivos fuente para revisar (la prueba no es vacía)", () => {
    expect(FUENTES.length).toBeGreaterThan(3);
  });

  it("ningún valor real del .env aparece en un archivo fuente", () => {
    const secretos = valoresRealesDelEnv();
    expect(secretos.length).toBeGreaterThan(0);

    const filtraciones: string[] = [];
    for (const archivo of FUENTES) {
      const contenido = readFileSync(archivo, "utf8");
      for (const { nombre, valor } of secretos) {
        if (contenido.includes(valor)) {
          filtraciones.push(`${relative(RAIZ, archivo)} contiene el valor de ${nombre}`);
        }
      }
    }
    expect(filtraciones).toEqual([]);
  });

  it("no hay connection strings de Postgres literales en el código de producción", () => {
    const hallazgos = FUENTES.filter((archivo) => !esArchivoDeTest(archivo))
      .filter((archivo) => /postgres(ql)?:\/\//.test(readFileSync(archivo, "utf8")))
      .map((archivo) => relative(RAIZ, archivo));
    expect(hallazgos).toEqual([]);
  });

  it("las claves obligatorias solo se leen de process.env, nunca se asignan literales", () => {
    const patron = new RegExp(
      `(${CLAVES_OBLIGATORIAS.join("|")})\s*[:=]\s*["'\`][^"'\`]+["'\`]`,
    );
    const hallazgos = FUENTES.filter((archivo) => !esArchivoDeTest(archivo))
      .filter((archivo) => patron.test(readFileSync(archivo, "utf8")))
      .map((archivo) => relative(RAIZ, archivo));
    expect(hallazgos).toEqual([]);
  });
});
