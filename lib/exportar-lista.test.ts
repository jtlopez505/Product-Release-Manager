import { describe, expect, it } from "vitest";

import {
  contenidoCsv,
  exportarListaDeRelease,
  nombreDeArchivo,
  type FilaParaExportar,
} from "./exportar-lista";

/**
 * Verificación 1 de M3-03 (unitarias, regla #5): todo el riesgo del formato del archivo,
 * probado sin base ni navegador (anexo técnico de la ficha). Cada `it` cita la fila de la
 * tabla de criterios (§3) que comprueba.
 */

const TRES_CLIENTES: FilaParaExportar[] = [
  { name: "Acme", currentVersion: "2.4.1" },
  { name: "Globex", currentVersion: "2.5.0" },
  { name: "Peñalolén Logística", currentVersion: "2.3.0" },
];

describe("contenidoCsv · fila 5, BOM de UTF-8", () => {
  it("los primeros 3 bytes del archivo son EF BB BF", () => {
    const bytes = Buffer.from(contenidoCsv(TRES_CLIENTES), "utf8");
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("un cliente con acentos y eñe sale igual, bien codificado", () => {
    const contenido = contenidoCsv(TRES_CLIENTES);
    expect(contenido).toContain("Peñalolén Logística");
  });
});

describe("contenidoCsv · fila 3, encabezado", () => {
  it("la primera fila es 'Cliente;Versión actual'", () => {
    const contenido = contenidoCsv(TRES_CLIENTES);
    const primeraLinea = contenido.replace(/^﻿/, "").split("\r\n")[0];
    expect(primeraLinea).toBe("Cliente;Versión actual");
  });
});

describe("contenidoCsv · fila 4, separador punto y coma", () => {
  it("ninguna fila usa coma como separador", () => {
    const contenido = contenidoCsv(TRES_CLIENTES);
    const lineas = contenido.replace(/^﻿/, "").trim().split("\r\n");
    for (const linea of lineas) {
      expect(linea).not.toContain(",");
      expect(linea).toContain(";");
    }
  });
});

describe("contenidoCsv · fila 2, mismos clientes en el mismo orden", () => {
  it("una fila de encabezado y 3 filas de datos, en el orden recibido", () => {
    const contenido = contenidoCsv(TRES_CLIENTES);
    const lineas = contenido.replace(/^﻿/, "").trim().split("\r\n");
    expect(lineas).toHaveLength(4);
    expect(lineas[1]).toBe("Acme;2.4.1");
    expect(lineas[2]).toBe("Globex;2.5.0");
    expect(lineas[3]).toBe("Peñalolén Logística;2.3.0");
  });

  it("sin clientes, solo queda el encabezado", () => {
    const contenido = contenidoCsv([]);
    const lineas = contenido.replace(/^﻿/, "").trim().split("\r\n");
    expect(lineas).toHaveLength(1);
  });
});

describe("contenidoCsv · fila 6, escapado de punto y coma, comillas y saltos de línea", () => {
  it('el ejemplo exacto de la ficha: `Acme; "Sur"` sale como `"Acme; ""Sur"""`', () => {
    const contenido = contenidoCsv([{ name: 'Acme; "Sur"', currentVersion: "1.0.0" }]);
    const fila = contenido.replace(/^﻿/, "").trim().split("\r\n")[1];
    expect(fila).toBe('"Acme; ""Sur"""' + ";1.0.0");
  });

  it("un salto de línea dentro de un valor queda en una sola celda entre comillas", () => {
    const contenido = contenidoCsv([{ name: "Acme\nSur", currentVersion: "1.0.0" }]);
    const sinBom = contenido.replace(/^﻿/, "");
    expect(sinBom).toContain('"Acme\nSur";1.0.0');
    // Sigue siendo UNA fila de datos: el \n interno no cuenta como separador de filas, solo
    // el \r\n que separa las filas del CSV en sí.
    const filasDeDatos = sinBom.trim().split("\r\n").slice(1);
    expect(filasDeDatos).toHaveLength(1);
  });

  it("un valor sin ninguno de esos caracteres no se envuelve en comillas", () => {
    const contenido = contenidoCsv([{ name: "Acme", currentVersion: "1.0.0" }]);
    const fila = contenido.replace(/^﻿/, "").trim().split("\r\n")[1];
    expect(fila).toBe("Acme;1.0.0");
  });
});

describe("contenidoCsv · fila 7 (no debe pasar), neutralizar fórmulas", () => {
  it('`=HYPERLINK("http://x")` sale con un apóstrofo adelante, como texto', () => {
    const contenido = contenidoCsv([
      { name: '=HYPERLINK("http://x")', currentVersion: "1.0.0" },
    ]);
    const fila = contenido.replace(/^﻿/, "").trim().split("\r\n")[1];
    // Neutralizado (apóstrofo) y además escapado (tiene comillas): las dos reglas se aplican
    // juntas, sin pisarse.
    expect(fila).toBe('"\'=HYPERLINK(""http://x"")"' + ";1.0.0");
    expect(fila.startsWith('"\'=')).toBe(true);
  });

  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "\t1", "\r1"])(
    "%j también se neutraliza con un apóstrofo adelante",
    (valorPeligroso) => {
      const contenido = contenidoCsv([{ name: valorPeligroso, currentVersion: "1.0.0" }]);
      const sinBom = contenido.replace(/^﻿/, "");
      const primerCampo = sinBom.trim().split("\r\n")[1].split(";")[0].replace(/^"|"$/g, "");
      expect(primerCampo.startsWith("'")).toBe(true);
    },
  );

  it("un valor que no empieza con ninguno de esos caracteres no se toca", () => {
    const contenido = contenidoCsv([{ name: "2.5.0=final", currentVersion: "1.0.0" }]);
    const fila = contenido.replace(/^﻿/, "").trim().split("\r\n")[1];
    expect(fila).toBe("2.5.0=final;1.0.0");
  });
});

describe("nombreDeArchivo · fila 8, por versión", () => {
  it("release-version-<version>-<fecha>.csv", () => {
    const nombre = nombreDeArchivo(
      { tipo: "version", version: "2.5.0" },
      new Date(2026, 9, 7), // 7 de octubre de 2026 (mes 0-index)
    );
    expect(nombre).toBe("release-version-2.5.0-2026-10-07.csv");
  });

  it("los caracteres inválidos en Windows de la versión se reemplazan", () => {
    const nombre = nombreDeArchivo(
      { tipo: "version", version: 'raro\\/:*?"<>|' },
      new Date(2026, 9, 7),
    );
    expect(nombre).not.toMatch(/[\\/:*?"<>|]/);
    expect(nombre.endsWith("-2026-10-07.csv")).toBe(true);
  });
});

describe("nombreDeArchivo · fila 8, por feature", () => {
  it("usa el código cuando el feature lo tiene", () => {
    const nombre = nombreDeArchivo(
      { tipo: "feature", feature: { code: "F-020", name: "Reportes avanzados" } },
      new Date(2026, 9, 7),
    );
    expect(nombre).toBe("release-feature-F-020-2026-10-07.csv");
  });

  it("usa el nombre cuando el feature no tiene código", () => {
    const nombre = nombreDeArchivo(
      { tipo: "feature", feature: { code: null, name: "Reportes avanzados" } },
      new Date(2026, 9, 7),
    );
    expect(nombre).toBe("release-feature-Reportes avanzados-2026-10-07.csv");
  });
});

describe("exportarListaDeRelease · junta nombre y contenido", () => {
  it("devuelve el mismo contenido que contenidoCsv y el mismo nombre que nombreDeArchivo", () => {
    const identificador = { tipo: "version" as const, version: "2.5.0" };
    const fecha = new Date(2026, 9, 7);
    const archivo = exportarListaDeRelease(identificador, TRES_CLIENTES, fecha);
    expect(archivo.contenido).toBe(contenidoCsv(TRES_CLIENTES));
    expect(archivo.nombre).toBe(nombreDeArchivo(identificador, fecha));
  });
});
