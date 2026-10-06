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
const TABLA = readFileSync(join(RAIZ, "app", "features", "tabla-de-features.tsx"), "utf8");

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

/**
 * La primera tabla de la app (M1-03) contra las reglas de interfaz que `marca.md` agregó
 * justo para esto: densidad, divisores y nada de zebra. Son las que se pierden primero
 * cuando una pantalla se retoca sin releer el doc.
 */
describe("la tabla de la lista maestra sigue las reglas de tabla de marca.md", () => {
  it("sin filas alternadas (zebra): compite con el hover y con la fila enfocada", () => {
    expect(TABLA).not.toMatch(/\b(odd|even|nth-child)[-:]/);
  });

  it("densidad: fila de 40px y encabezado de 36px", () => {
    expect(TABLA).toMatch(/\bh-10\b/);
    expect(TABLA).toMatch(/\bh-9\b/);
  });

  it("encabezado de 12px medium en texto secundario, sin mayúsculas ni letter-spacing", () => {
    expect(TABLA).toMatch(/text-xs font-medium text-texto-secundario/);
    expect(TABLA).not.toMatch(/\buppercase\b/);
    expect(TABLA).not.toMatch(/\btracking-(wide|wider|widest)\b/);
  });

  it("divisor sutil entre filas y borde marcado al pie del encabezado", () => {
    expect(TABLA).toMatch(/divide-y divide-borde-sutil/);
    expect(TABLA).toMatch(/border-b border-borde-marcado/);
  });

  it("hover solo donde hay clic: la fila navegable lleva hover y cursor-pointer", () => {
    expect(TABLA).toMatch(/cursor-pointer/);
    expect(TABLA).toMatch(/hover:bg-hover/);
    // Con teclado la fila toma el tinte de seleccionada (marca.md § Reglas de interfaz).
    expect(TABLA).toMatch(/focus-within:bg-seleccionado/);
  });

  it("el estado se lee como palabra, no solo como color", () => {
    expect(TABLA).toMatch(/ETIQUETAS_DE_ESTADO\[estado\]/);
  });
});

/**
 * El formulario de cliente (M1-04) contra las reglas de `marca.md` que le tocan: la densidad
 * del checklist de features, el hover solo donde hay clic, la versión en monoespaciada y
 * "ocupado" sin atenuar nada. Los scans de arriba ya cubren hex sueltos, bordes con alfa,
 * sombras y outline anulado en todo `app/`.
 */
const FORMULARIO_DE_CLIENTE = readFileSync(
  join(RAIZ, "app", "clientes", "formulario-de-cliente.tsx"),
  "utf8",
);

describe("el formulario de cliente sigue las reglas de interfaz de marca.md", () => {
  it("la versión activa se escribe en monoespaciada (se compara de un vistazo)", () => {
    expect(FORMULARIO_DE_CLIENTE).toMatch(/name="currentVersion"[\s\S]*?font-datos/);
  });

  it("el checklist mantiene la densidad de una lista de trabajo (filas de 36px)", () => {
    expect(FORMULARIO_DE_CLIENTE).toMatch(/\bh-9\b/);
  });

  it("sin filas alternadas: el zebra competiría con el hover", () => {
    expect(FORMULARIO_DE_CLIENTE).not.toMatch(/\b(odd|even|nth-child)[-:]/);
  });

  it("hover solo donde hay clic: la fila del checklist tildea, así que lo lleva", () => {
    expect(FORMULARIO_DE_CLIENTE).toMatch(/cursor-pointer/);
    expect(FORMULARIO_DE_CLIENTE).toMatch(/hover:bg-hover/);
    expect(FORMULARIO_DE_CLIENTE).toMatch(/focus-within:bg-seleccionado/);
  });

  it("divisor sutil entre filas del checklist y borde marcado al límite del panel", () => {
    expect(FORMULARIO_DE_CLIENTE).toMatch(/divide-y divide-borde-sutil/);
    expect(FORMULARIO_DE_CLIENTE).toMatch(/border border-borde-marcado/);
  });

  it("los campos usan el token de borde de control", () => {
    expect(FORMULARIO_DE_CLIENTE).toMatch(/border border-borde-control/);
  });

  it("guardar es ocupado, no deshabilitado: aria-busy y nada atenuado", () => {
    expect(FORMULARIO_DE_CLIENTE).toMatch(/aria-busy=\{guardando\}/);
    expect(FORMULARIO_DE_CLIENTE).not.toMatch(/disabled:opacity/);
    expect(FORMULARIO_DE_CLIENTE).not.toMatch(/hover:opacity-/);
  });

  it("el botón primario usa los tokens de hover y active", () => {
    expect(FORMULARIO_DE_CLIENTE).toMatch(/hover:bg-primario-hover/);
    expect(FORMULARIO_DE_CLIENTE).toMatch(/active:bg-primario-active/);
  });

  it("las transiciones son solo de fondo, 120ms ease-out", () => {
    const transiciones = FORMULARIO_DE_CLIENTE.match(/transition-\[[^\]]+\]/g) ?? [];
    expect(transiciones.length).toBeGreaterThan(0);
    for (const transicion of transiciones) {
      expect(transicion).toBe("transition-[background-color]");
    }
  });
});

/**
 * Las pantallas de consulta de M1-05 (Inicio, Vista de cliente y la navegación) contra las
 * reglas de `marca.md` que les tocan. Dos son específicas de esta pieza y el doc las nombra
 * con nombre y apellido:
 *   - **"Hover solo donde hay clic. El historial de versiones es registro, no lista
 *     navegable: sin hover y sin `cursor-pointer`"** — la lista de clientes sí es navegable,
 *     el historial y los features del cliente no.
 *   - **Las versiones en monoespaciada**, que es para lo que se eligió IBM Plex Mono:
 *     comparar versiones entre filas de un vistazo.
 * Los scans de arriba ya cubren hex sueltos, bordes con alfa, sombras y outline anulado en
 * todo `app/`.
 */
const TABLA_DE_CLIENTES = readFileSync(join(RAIZ, "app", "tabla-de-clientes.tsx"), "utf8");
const HISTORIAL = readFileSync(
  join(RAIZ, "app", "clientes", "[id]", "historial-de-versiones.tsx"),
  "utf8",
);
const FEATURES_DEL_CLIENTE = readFileSync(
  join(RAIZ, "app", "clientes", "[id]", "features-del-cliente.tsx"),
  "utf8",
);
const VISTA_DE_CLIENTE = readFileSync(
  join(RAIZ, "app", "clientes", "[id]", "page.tsx"),
  "utf8",
);
const NAVEGACION = readFileSync(join(RAIZ, "app", "navegacion.tsx"), "utf8");

describe("la lista de clientes de Inicio sigue las reglas de tabla de marca.md", () => {
  it("sin filas alternadas (zebra)", () => {
    expect(TABLA_DE_CLIENTES).not.toMatch(/\b(odd|even|nth-child)[-:]/);
  });

  it("densidad: fila de 40px y encabezado de 36px", () => {
    expect(TABLA_DE_CLIENTES).toMatch(/\bh-10\b/);
    expect(TABLA_DE_CLIENTES).toMatch(/\bh-9\b/);
  });

  it("encabezado de 12px medium en texto secundario, sin mayúsculas ni letter-spacing", () => {
    expect(TABLA_DE_CLIENTES).toMatch(/text-xs font-medium text-texto-secundario/);
    expect(TABLA_DE_CLIENTES).not.toMatch(/\buppercase\b/);
    expect(TABLA_DE_CLIENTES).not.toMatch(/\btracking-(wide|wider|widest)\b/);
  });

  it("divisor sutil entre filas y borde marcado al pie del encabezado", () => {
    expect(TABLA_DE_CLIENTES).toMatch(/divide-y divide-borde-sutil/);
    expect(TABLA_DE_CLIENTES).toMatch(/border-b border-borde-marcado/);
  });

  it("hover solo donde hay clic: la fila abre la Vista, así que lo lleva", () => {
    expect(TABLA_DE_CLIENTES).toMatch(/cursor-pointer/);
    expect(TABLA_DE_CLIENTES).toMatch(/hover:bg-hover/);
    expect(TABLA_DE_CLIENTES).toMatch(/focus-within:bg-seleccionado/);
  });

  it("la versión activa va en monoespaciada (se compara entre filas de un vistazo)", () => {
    expect(TABLA_DE_CLIENTES).toMatch(/font-datos/);
  });

  it("las transiciones son solo de fondo, 120ms ease-out", () => {
    const transiciones = TABLA_DE_CLIENTES.match(/transition-\[[^\]]+\]/g) ?? [];
    expect(transiciones.length).toBeGreaterThan(0);
    for (const transicion of transiciones) {
      expect(transicion).toBe("transition-[background-color]");
    }
  });
});

describe("el historial de versiones es registro, no lista navegable (marca.md)", () => {
  it("sin hover y sin cursor-pointer: un hover que no lleva a ningún lado es promesa falsa", () => {
    expect(HISTORIAL).not.toMatch(/hover:/);
    expect(HISTORIAL).not.toMatch(/cursor-pointer/);
  });

  it("tampoco se anima: sin transiciones en las filas del registro", () => {
    expect(HISTORIAL).not.toMatch(/transition-/);
  });

  it("la versión de cada fila va en monoespaciada", () => {
    expect(HISTORIAL).toMatch(/font-datos/);
  });

  it("densidad de tabla: fila 40px, encabezado 36px, sin zebra", () => {
    expect(HISTORIAL).toMatch(/\bh-10\b/);
    expect(HISTORIAL).toMatch(/\bh-9\b/);
    expect(HISTORIAL).not.toMatch(/\b(odd|even|nth-child)[-:]/);
  });

  it("encabezado de 12px medium en texto secundario, sin mayúsculas ni letter-spacing", () => {
    expect(HISTORIAL).toMatch(/text-xs font-medium text-texto-secundario/);
    expect(HISTORIAL).not.toMatch(/\buppercase\b/);
    expect(HISTORIAL).not.toMatch(/\btracking-(wide|wider|widest)\b/);
  });

  it("divisor sutil entre filas y borde marcado al pie del encabezado", () => {
    expect(HISTORIAL).toMatch(/divide-y divide-borde-sutil/);
    expect(HISTORIAL).toMatch(/border-b border-borde-marcado/);
  });
});

describe("los features del cliente: dos grupos, sin prometer clic", () => {
  it("sin hover ni cursor-pointer: las filas no llevan a ninguna parte", () => {
    expect(FEATURES_DEL_CLIENTE).not.toMatch(/hover:/);
    expect(FEATURES_DEL_CLIENTE).not.toMatch(/cursor-pointer/);
  });

  it("el color nunca va solo: cada grupo dice la palabra", () => {
    expect(FEATURES_DEL_CLIENTE).toMatch(/ETIQUETAS_DE_HABILITACION\.habilitados/);
    expect(FEATURES_DEL_CLIENTE).toMatch(/ETIQUETAS_DE_HABILITACION\.noHabilitados/);
  });

  it("el ámbar como texto usa el tono oscuro (el de puntos de estado no se lee)", () => {
    expect(FEATURES_DEL_CLIENTE).toMatch(/text-alerta-texto/);
    // El token pelado `text-alerta` es el ámbar de 3.76:1: no alcanza para texto.
    expect(FEATURES_DEL_CLIENTE).not.toMatch(/text-alerta(?!-texto)/);
  });

  it("densidad: encabezado de grupo 36px, fila 40px, divisor sutil, sin zebra", () => {
    expect(FEATURES_DEL_CLIENTE).toMatch(/\bh-9\b/);
    expect(FEATURES_DEL_CLIENTE).toMatch(/\bh-10\b/);
    expect(FEATURES_DEL_CLIENTE).toMatch(/divide-y divide-borde-sutil/);
    expect(FEATURES_DEL_CLIENTE).not.toMatch(/\b(odd|even|nth-child)[-:]/);
  });
});

describe("el encabezado de la Vista de cliente y la navegación", () => {
  it("la versión activa se destaca en monoespaciada", () => {
    expect(VISTA_DE_CLIENTE).toMatch(/font-datos text-lg/);
  });

  it("la tarjeta del encabezado se delimita con borde (el scan de sombras ya corre)", () => {
    expect(VISTA_DE_CLIENTE).toMatch(/border border-borde-marcado/);
  });

  it("la pestaña activa se marca con aria-current, no solo con color", () => {
    expect(NAVEGACION).toMatch(/aria-current=\{activa \? "page" : undefined\}/);
    expect(NAVEGACION).toMatch(/bg-seleccionado/);
  });

  it("la navegación transiciona solo el fondo, 120ms ease-out", () => {
    const transiciones = NAVEGACION.match(/transition-\[[^\]]+\]/g) ?? [];
    expect(transiciones.length).toBeGreaterThan(0);
    for (const transicion of transiciones) {
      expect(transicion).toBe("transition-[background-color]");
    }
  });
});

/**
 * La consulta por feature (M2-01) contra las reglas de `marca.md` que le tocan. Las dos
 * listas reusan `TablaDeClientes` tal cual (ya cubierta arriba) y el chip de estado reusa
 * `ChipDeEstado` de `tabla-de-features.tsx` (también cubierto); lo que se agrega acá es el
 * selector (control de formulario) y el título de cada lista. Los scans de arriba ya cubren
 * hex sueltos, bordes con alfa, sombras y outline anulado en todo `app/`.
 */
const SELECTOR_DE_FEATURE = readFileSync(
  join(RAIZ, "app", "por-feature", "selector-de-feature.tsx"),
  "utf8",
);
const LISTAS_DE_CLIENTES = readFileSync(
  join(RAIZ, "app", "por-feature", "listas-de-clientes.tsx"),
  "utf8",
);
const ESQUELETO_DE_CONSULTA = readFileSync(
  join(RAIZ, "app", "por-feature", "esqueleto-de-consulta.tsx"),
  "utf8",
);
const PAGINA_POR_FEATURE = readFileSync(
  join(RAIZ, "app", "por-feature", "page.tsx"),
  "utf8",
);

describe("la consulta por feature (M2-01) sigue las reglas de interfaz de marca.md", () => {
  it("el selector usa el token de borde de control", () => {
    expect(SELECTOR_DE_FEATURE).toMatch(/border-borde-control/);
  });

  it("el botón primario usa los tokens de hover y active, no opacidad", () => {
    expect(SELECTOR_DE_FEATURE).toMatch(/hover:bg-primario-hover/);
    expect(SELECTOR_DE_FEATURE).toMatch(/active:bg-primario-active/);
    expect(SELECTOR_DE_FEATURE).not.toMatch(/hover:opacity-/);
  });

  it("las dos listas van lado a lado en pantalla ancha y apiladas en angosta", () => {
    expect(LISTAS_DE_CLIENTES).toMatch(/grid gap-4 lg:grid-cols-2/);
  });

  it("una lista vacía se delimita con borde, no con sombra", () => {
    expect(LISTAS_DE_CLIENTES).toMatch(/border border-borde-marcado/);
  });

  it("el esqueleto anticipa el layout de dos columnas y usa el mismo pulso que el resto", () => {
    expect(ESQUELETO_DE_CONSULTA).toMatch(/grid gap-4 lg:grid-cols-2/);
    expect(ESQUELETO_DE_CONSULTA).toMatch(/animate-pulse/);
    // El shimmer en diagonal es el gesto que marca.md manda evitar: solo pulso de opacidad.
    expect(ESQUELETO_DE_CONSULTA).not.toMatch(/bg-gradient|animate-shimmer/);
  });

  it("sin filas alternadas en ningún archivo nuevo de esta pieza", () => {
    for (const archivo of [
      SELECTOR_DE_FEATURE,
      LISTAS_DE_CLIENTES,
      ESQUELETO_DE_CONSULTA,
      PAGINA_POR_FEATURE,
    ]) {
      expect(archivo).not.toMatch(/\b(odd|even|nth-child)[-:]/);
    }
  });

  it("el feature elegido muestra su código en monoespaciada", () => {
    expect(PAGINA_POR_FEATURE).toMatch(/font-datos text-xs text-texto-secundario/);
  });

  it("el estado del feature se reusa como chip, no se reinventa", () => {
    expect(PAGINA_POR_FEATURE).toMatch(/ChipDeEstado estado={featureElegido\.estado}/);
  });
});

/**
 * La lista de release (M3-01) contra las reglas de interfaz de `marca.md` que le tocan. La
 * vista previa reusa `TablaDeClientes` tal cual (ya cubierta arriba); lo que se agrega acá es
 * el campo de versión (control de formulario) y el esqueleto de carga. Los scans de arriba ya
 * cubren hex sueltos, bordes con alfa, sombras y outline anulado en todo `app/`.
 */
const FORMULARIO_DE_VERSION = readFileSync(
  join(RAIZ, "app", "lista-de-release", "formulario-de-version.tsx"),
  "utf8",
);
const VISTA_PREVIA_DE_LISTA = readFileSync(
  join(RAIZ, "app", "lista-de-release", "vista-previa-de-lista-de-release.tsx"),
  "utf8",
);
const ESQUELETO_DE_LISTA_DE_RELEASE = readFileSync(
  join(RAIZ, "app", "lista-de-release", "esqueleto-de-lista-de-release.tsx"),
  "utf8",
);
const PAGINA_DE_LISTA_DE_RELEASE = readFileSync(
  join(RAIZ, "app", "lista-de-release", "page.tsx"),
  "utf8",
);

describe("la lista de release (M3-01) sigue las reglas de interfaz de marca.md", () => {
  it("el campo de versión usa el token de borde de control y va en monoespaciada", () => {
    expect(FORMULARIO_DE_VERSION).toMatch(/border-borde-control/);
    expect(FORMULARIO_DE_VERSION).toMatch(/name="version"[\s\S]*?font-datos/);
  });

  it("el botón primario usa los tokens de hover y active, no opacidad", () => {
    expect(FORMULARIO_DE_VERSION).toMatch(/hover:bg-primario-hover/);
    expect(FORMULARIO_DE_VERSION).toMatch(/active:bg-primario-active/);
    expect(FORMULARIO_DE_VERSION).not.toMatch(/hover:opacity-/);
  });

  it("la vista previa se delimita con borde, no con sombra", () => {
    expect(VISTA_PREVIA_DE_LISTA).toMatch(/border border-borde-marcado/);
  });

  it("el esqueleto usa las medidas reales de la tabla y el mismo pulso que el resto", () => {
    expect(ESQUELETO_DE_LISTA_DE_RELEASE).toMatch(/\bh-10\b/);
    expect(ESQUELETO_DE_LISTA_DE_RELEASE).toMatch(/\bh-9\b/);
    expect(ESQUELETO_DE_LISTA_DE_RELEASE).toMatch(/animate-pulse/);
    // El shimmer en diagonal es el gesto que marca.md manda evitar: solo pulso de opacidad.
    expect(ESQUELETO_DE_LISTA_DE_RELEASE).not.toMatch(/bg-gradient|animate-shimmer/);
  });

  it("sin filas alternadas en ningún archivo nuevo de esta pieza", () => {
    for (const archivo of [
      FORMULARIO_DE_VERSION,
      VISTA_PREVIA_DE_LISTA,
      ESQUELETO_DE_LISTA_DE_RELEASE,
      PAGINA_DE_LISTA_DE_RELEASE,
    ]) {
      expect(archivo).not.toMatch(/\b(odd|even|nth-child)[-:]/);
    }
  });
});
