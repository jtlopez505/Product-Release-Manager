/**
 * `npm run db:seed:test` — siembra la organización de la **base de prueba** (criterio #5 de la
 * ficha M4-00).
 *
 * Sin organización, `organizacionActual()` corta con `OrganizacionNoSembradaError` y toda la
 * suite de integración falla (lib/organizacion.ts).
 *
 * Reusa el mismo `prisma/seed.ts` de siempre — idempotente — con dos cambios en el entorno,
 * aplicados ANTES de importarlo porque `lib/prisma.ts` lee `DATABASE_URL` al evaluarse:
 *   1. `DATABASE_URL` → la base de prueba;
 *   2. `SEED_ORG_NAME` → un nombre propio, que es lo que después usa la suite para comprobar
 *      a qué base está conectada sin mirar ninguna connection string (regla #2).
 */
import "../../lib/cargar-env";

import {
  NOMBRE_ORGANIZACION_DE_PRUEBA,
  aplicarBaseDePrueba,
} from "../../tests/soporte/base-de-prueba";

aplicarBaseDePrueba(process.env);
process.env.SEED_ORG_NAME = NOMBRE_ORGANIZACION_DE_PRUEBA;

console.log("Sembrando la base de datos de PRUEBA (DATABASE_URL_TEST)…");

// Import dinámico: tiene que pasar después del reemplazo de arriba, y los imports estáticos
// se evalúan todos antes de la primera línea de código.
void import("../../prisma/seed");
