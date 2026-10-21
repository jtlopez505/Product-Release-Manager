/**
 * Arranque de la suite de integración (ficha M4-00). Es el `setupFiles` de
 * `vitest.integracion.mts` y corre antes que cualquier archivo de test.
 *
 * Qué hace: deja `DATABASE_URL` y `DIRECT_URL` apuntando a la **base de prueba** antes de que
 * nadie las lea. Desde acá, todo lo que la suite toca — `lib/prisma.ts`, los `next dev` que
 * levantan los tests de pantalla con `env: { ...process.env }`, y los scripts de Prisma —
 * habla con la base de prueba y nunca con la base real del owner.
 *
 * **El orden es lo único delicado:**
 *   1. `lib/cargar-env` mete el `.env` en `process.env` (los tests corren con tsx/vitest, que
 *      no lo hacen solos);
 *   2. este módulo reemplaza las dos variables;
 *   3. recién después se importan los archivos de test, y con ellos `lib/prisma.ts`, que lee
 *      `DATABASE_URL` **al evaluarse** (una sola vez, en el singleton).
 *
 * Los pasos 1 y 2 son imports de este archivo, en este orden, así que no dependen de cómo
 * Vitest ordene los `setupFiles`. El paso 3 lo comprueba
 * `tests/integracion/base-de-prueba.test.ts` preguntándole a la base viva quién es.
 *
 * Si la base de prueba falta o es la real, `aplicarBaseDePrueba` corta acá y la suite no corre
 * ni un test (criterios #3 y #4). Eso es deliberado: un fallback silencioso a la base real
 * daría la sensación de aislamiento sin tenerlo.
 */
import "../../lib/cargar-env";

import { aplicarBaseDePrueba } from "../soporte/base-de-prueba";

aplicarBaseDePrueba(process.env);

export {};
