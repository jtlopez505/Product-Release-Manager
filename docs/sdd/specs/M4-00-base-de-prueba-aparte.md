# M4-00 · Base de prueba aparte para la integración

**Depende de:** nada — y **bloquea a M4-01 y M4-02**: mientras la suite de integración no cierre en
verde, ninguna pieza puede darse por terminada (regla #5).

## 1. Qué queremos lograr

Que `npm run test:integracion` corra contra **una base de datos propia de prueba**, no contra la
base real donde están los clientes del owner. Hoy corre contra la real: los tests siembran datos
ahí y los limpian al final (`tests/integracion/pantalla-de-clientes.test.ts:158` lo dice con todas
las letras: *"La base es la del owner: los datos de prueba no se quedan"*).

Eso tiene dos consecuencias que ya nos pegaron:

1. **Los tests de pantalla se rompen cuando el owner carga datos reales.** Hoy hay 13 en rojo
   porque afirman conteos absolutos sobre la organización real (`"Clientes que reciben la 2.5.0
   (3)"`) y hasta un estado vacío (`"Todavía no cargaste ningún cliente."`) que con 3 clientes
   cargados es imposible de satisfacer. No es un bug de los tests: es que no pueden elegir su
   organización, porque la pantalla la resuelve sola con `organizacionActual()`.
2. **Las corridas de prueba escriben en la base de producción.** Con una limpieza que falle a
   mitad, o un `afterAll` que no corra porque el proceso murió, quedan datos de prueba en los
   datos reales del owner.

Con una base aparte, las dos desaparecen de raíz.

## 2. Qué hay hoy

- **`vitest.integracion.mts`** configura la suite: `setupFiles: ["lib/cargar-env.ts"]`,
  `fileParallelism: false`, e incluye `tests/integracion/**/*.test.ts`.
- **`lib/cargar-env.ts`** hace `process.loadEnvFile(".env")` y nada más.
- **`lib/prisma.ts:17`** pasa `requireEnv("DATABASE_URL")` al adapter `@prisma/adapter-pg`. Es el
  único lugar donde la app resuelve a qué base se conecta.
- **`prisma.config.ts:24`** usa `env("DIRECT_URL")` para las migraciones.
- **`lib/env.ts:10`** declara las cuatro claves obligatorias en `CLAVES_OBLIGATORIAS`.
- **Cada test de pantalla levanta su propio `next dev`** en su puerto, con
  `env: { ...process.env }` (ej. `tests/integracion/pantalla-de-clientes.test.ts:153`). O sea:
  **lo que esté en `process.env` cuando arranca la suite es lo que usa el servidor de prueba.** Ese
  es el punto donde esta pieza entra.
- **`lib/organizacion.ts:33`** devuelve la primera organización por `createdAt`. No acepta
  override, y está bien que no lo acepte: es la función que hace cumplir la regla #1.

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | La suite de integración se conecta a la base de prueba, no a la real | El módulo de arranque de la suite reemplaza `DATABASE_URL` por `DATABASE_URL_TEST` y `DIRECT_URL` por `DIRECT_URL_TEST` en `process.env` **antes** de que cualquier módulo los lea. Se comprueba con un test que consulta a la base por su propio nombre (`current_database()`) y verifica que **no** es el de la base real. |
| 2 | El servidor de prueba también apunta a la base de prueba | No alcanza con que el proceso de test esté bien: el `next dev` que los tests levantan hereda `process.env`. Se comprueba pidiéndole a una pantalla real los datos sembrados solo en la base de prueba. |
| 3 | **Falla ruidosamente si falta la variable** | **La guarda que sostiene toda la pieza.** Si `DATABASE_URL_TEST` no está definida, la suite **corta con un error que la nombra** y no corre ningún test. Jamás cae de vuelta a la base real por omisión — un fallback silencioso acá es peor que no tener la pieza, porque daría la sensación de aislamiento sin tenerlo. Se comprueba corriendo el módulo de arranque con la variable ausente y verificando el error. |
| 4 | **Falla ruidosamente si la base de prueba es la real** | Si `DATABASE_URL_TEST` es igual a `DATABASE_URL`, la suite corta nombrando el problema. Protege contra el error de copiar y pegar la connection string de producción, que dejaría todo "verde" escribiendo en los datos del owner. Se comprueba con las dos variables iguales. |
| 5 | La base de prueba tiene el esquema y su organización | Hay forma de prepararla: `npm run db:migrate:test` corre las migraciones contra `DIRECT_URL_TEST` y `npm run db:seed:test` siembra la organización. Sin organización, `organizacionActual()` corta con `OrganizacionNoSembradaError` y toda la suite falla. |
| 6 | **Las 13 fallas actuales se ponen en verde sin tocar una sola aserción** | **Es la prueba de que el arreglo es el correcto y no un parche.** `tests/integracion/pantalla-de-lista-de-release.test.ts` y `pantalla-de-por-feature.test.ts` quedan **byte por byte iguales** (`git diff` vacío para esos dos archivos) y pasan. Si hubiera que editar una aserción, el diagnóstico estaba mal. |
| 7 | La suite entera cierra en verde | `npm run test:integracion`: 12 archivos, 0 fallas. Hoy son `2 failed | 10 passed` y `13 failed | 129 passed`. |
| 8 | La app de producción no cambia de comportamiento | `npm run check` sigue en verde y **`lib/prisma.ts`, `lib/organizacion.ts` y las pantallas no se tocan**. El cambio vive en la configuración de la suite, no en el código que se publica. Se comprueba con `git diff --stat`: esos archivos no aparecen. |
| 9 | Ninguna clave entra al repo | `tests/no-secretos-en-codigo.test.ts` sigue en verde. Las dos variables nuevas se leen del entorno; sus valores viven solo en `.env` (gitignoreado) y nunca se escriben en un `.ts` ni se imprimen en un log (regla #2). |
| 10 | Las claves nuevas son obligatorias **solo para la suite** | `CLAVES_OBLIGATORIAS` de `lib/env.ts` **no** suma las dos nuevas: la app en producción no las necesita y pedírselas la haría no arrancar en Vercel por una variable de test. Se comprueba con `lib/env.test.ts`, que sigue en verde con las cuatro claves originales. |

## 4. Qué queda afuera

- **Unificar el código duplicado que levanta `next dev`** en los seis archivos de pantalla. Es
  duplicación real y molesta, pero es otro trabajo: "una cosa a la vez", sin refactor colateral.
- **Mover `organizacionActual()` a algo configurable.** Se descartó a propósito: es la función que
  hace cumplir la regla #1 y no se le abre una puerta para habilitar una prueba.
- **Borrar los 3 clientes de demo de la base real.** Son datos del owner; no se tocan.
- **Una base de prueba local con Docker.** Sumaría una dependencia de entorno que el proyecto hoy
  no tiene (y que ya se descartó al evaluar el CLI de Supabase).
- **Correr la integración en CI.** No hay CI todavía; cuando haya, esta pieza es justo lo que lo
  hace posible.

## 5. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo). Esta pieza existe precisamente
  para que la verificación 2 vuelva a poder estar en verde.
- **#2** — suma dos variables de entorno. Sus valores salen del entorno y nunca del código; no se
  agregan a `CLAVES_OBLIGATORIAS` porque no son claves de la app (criterio #10).
- **#1** — el aislamiento de datos se refuerza, no se debilita: las corridas de prueba dejan de
  escribir en la base donde viven los datos reales. `organizacionActual()` queda intacta.

---

## Anexo técnico (para los agentes)

- **Paso previo del owner, ya hecho cuando te despachan:** la segunda base existe y `.env` tiene
  `DATABASE_URL_TEST` y `DIRECT_URL_TEST`. Si no están, **no inventes un fallback**: el criterio #3
  es justamente que la suite corte. Verificá que existen antes de arrancar (sin imprimir sus
  valores).
- **Las 3 verificaciones, en orden (regla #5):** 1) `npm run check` → 2) `npm run test:integracion`
  (la que esta pieza arregla; tiene que cerrar 12/12) → 3) el recorrido completo: levantar
  `npm run dev` contra la base **real** y confirmar que la app sigue mostrando los 3 clientes del
  owner — o sea que la base de prueba no se filtró a la app normal.
- **Test primero:** los criterios #3 y #4 son tests nuevos y tienen que fallar antes de existir la
  guarda. El criterio #6 es al revés: ya hay 13 tests en rojo y la prueba es verlos pasar **sin
  editarlos**.
- **Entregables previstos:** un módulo de arranque de la suite (ej.
  `tests/integracion/entorno-de-prueba.ts`) con las guardas, `vitest.integracion.mts` apuntando a
  él en `setupFiles`, los dos scripts nuevos en `package.json`, y el test de las guardas. **No
  toques** `lib/prisma.ts`, `lib/organizacion.ts`, `lib/env.ts`, ninguna pantalla, ni los dos
  archivos de test del criterio #6.
- **Ojo con el orden de carga:** `lib/cargar-env.ts` ya existe y hace `loadEnvFile`. El reemplazo
  de las variables tiene que pasar **después** de cargar `.env` y **antes** de que se importe
  `lib/prisma.ts`, que lee `DATABASE_URL` al evaluarse. Los `setupFiles` de Vitest corren antes de
  los tests, pero verificá el orden real en lugar de asumirlo.
- **Ojo con los puertos:** apagá todo servidor y navegador propio antes de correr la integración;
  cada archivo levanta su propio `next dev` y un puerto ocupado hace fallar la corrida por una
  razón que no es el código.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/secretos.md` (las dos
  variables nuevas), que ya lo declara. Esta pieza no cubre ninguna condición del PRD — existe
  porque la regla #5 no se puede cumplir sin ella, y eso está dicho en el plan de M4.
