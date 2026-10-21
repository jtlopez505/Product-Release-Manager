/**
 * `npm run db:migrate:test` — aplica las migraciones a la **base de prueba** (criterio #5 de
 * la ficha M4-00).
 *
 * Por qué hace falta un script y no alcanza `prisma migrate deploy`: el CLI de Prisma lee la
 * URL de `prisma.config.ts`, que usa `env("DIRECT_URL")`. Acá reemplazamos esa variable por
 * `DIRECT_URL_TEST` en el entorno del proceso hijo, así el mismo comando de siempre migra la
 * otra base sin tocar la configuración de Prisma (que es la que usa la base real).
 *
 * `migrate deploy` y no `migrate dev` a propósito: aplica las migraciones que ya están en
 * `prisma/migrations/` sin generar ninguna nueva ni pedir una shadow database. La base de
 * prueba es un espejo del esquema, no el lugar donde se diseña.
 *
 * Regla #2: el valor de la connection string no se imprime ni se pasa por la línea de
 * comandos — viaja solo en el entorno del hijo.
 */
import { spawn } from "node:child_process";

import "../../lib/cargar-env";

import { aplicarBaseDePrueba } from "../../tests/soporte/base-de-prueba";

aplicarBaseDePrueba(process.env);

console.log("Migrando la base de datos de PRUEBA (DIRECT_URL_TEST)…");

const hijo = spawn("npx prisma migrate deploy", {
  cwd: process.cwd(),
  env: { ...process.env },
  stdio: "inherit",
  shell: true,
});

hijo.on("exit", (codigo) => {
  process.exitCode = codigo ?? 1;
});
