# Secretos y claves

> **Dueño de:** qué claves necesita ReleaseView, de dónde salen y cómo nunca tocan el código —
> numera la **regla #2**.

## En llano

ReleaseView necesita cuatro claves para funcionar. Ninguna se escribe en el código ni se sube al
repo: viven como **variables de entorno**, configuradas directo en Vercel (para producción) y en
un archivo local `.env` que nunca se commitea (para desarrollo).

| Clave | Para qué | De dónde sale |
|---|---|---|
| `DATABASE_URL` | Conectar la app a la base de datos (pooler en modo transacción, puerto 6543) | La da Supabase: botón **Connect** → pestaña **ORM → Prisma** |
| `DIRECT_URL` | Correr las migraciones de Prisma (pooler en modo sesión, puerto 5432) — el pooler de `DATABASE_URL` no soporta las sentencias que usa `prisma migrate` | Misma pantalla que `DATABASE_URL` |
| `APP_PASSWORD` | La contraseña compartida para entrar a la app (ver [`auth-y-permisos.md`](auth-y-permisos.md)) | La elegís vos al configurar el deploy — no es un secreto que "genera" un servicio externo |
| `SESSION_SECRET` | Firma la sesión de quien ya entró, para que la app sepa que sigue autenticado sin pedir la contraseña en cada clic | Se genera una vez (una cadena aleatoria larga) al configurar el proyecto |

## Las dos de prueba (la app no las necesita)

Desde M4-00, `npm run test:integracion` corre contra **una base de datos aparte**, no contra la
real. Eso suma dos variables más, que son de la suite y no de la app:

| Clave | Para qué | De dónde sale |
|---|---|---|
| `DATABASE_URL_TEST` | La base contra la que corre la integración (mismo rol que `DATABASE_URL`, pooler en modo transacción) | Un **segundo proyecto de Supabase**, separado del real. Misma pantalla: **Connect** → **ORM → Prisma** |
| `DIRECT_URL_TEST` | Migrar y sembrar esa base de prueba (`npm run db:migrate:test`, `npm run db:seed:test`) | Misma pantalla que la anterior |

**Por qué existen, y por qué una base aparte y no la misma:** hasta M4-00 los tests de integración
sembraban y borraban en la base real del owner. Eso tenía dos costos: los tests de pantalla se
rompían cada vez que el owner cargaba datos de verdad (pasó: 13 fallas al cargar 3 clientes), y
una limpieza que fallara a mitad dejaba datos de prueba mezclados con los reales.

**No van en `CLAVES_OBLIGATORIAS` de `lib/env.ts` a propósito.** Esa lista es lo que la app
necesita para arrancar; si sumáramos estas dos, el deploy en Vercel fallaría por una variable que
solo usa la suite de tests. En producción no existen y no tienen que existir.

**Las dos guardas que las acompañan** (criterios #3 y #4 de M4-00): si `DATABASE_URL_TEST` falta,
la suite **corta nombrándola** y no corre nada — nunca cae de vuelta a la base real por omisión,
porque eso daría una sensación de aislamiento sin tenerlo. Y si es **igual** a `DATABASE_URL`,
también corta: protege contra pegar la connection string de producción por error.

## Regla #2

**Ninguna clave va en el código ni en el repo, nunca.** Todas salen de variables de entorno. Si
alguna vez aparece una clave escrita directo en un archivo `.ts`/`.tsx`, es un bug de seguridad
que se corrige antes de seguir — sin excepciones, aunque sea "solo para probar".

## Cómo se configuran

- **Local (desarrollo):** archivo `.env` en la raíz del proyecto, con las cuatro claves de la app
  — más las dos de prueba si vas a correr `npm run test:integracion` (ver arriba; son seis en
  total en una máquina de desarrollo). Ese
  archivo está en `.gitignore` desde el arranque — nunca se commitea. **Va en `.env` y no en
  `.env.local` a propósito:** Next.js lee los dos, pero el CLI de Prisma solo lee `.env`, y una
  migración que no encuentra `DIRECT_URL` falla con un error que no dice cuál es la causa. Un
  solo archivo evita esa clase de bug.
- **Producción (Vercel):** las mismas cuatro claves se cargan en el panel de Vercel (Project
  Settings → Environment Variables). Vercel las inyecta en cada deploy; nunca quedan visibles en
  el código publicado.

## Anexo técnico

- `DATABASE_URL` / `DIRECT_URL`: connection strings de Postgres que da Supabase (incluyen
  usuario/contraseña de la base — por eso también son secretas, no solo endpoints). Las dos
  apuntan a la misma base: `DATABASE_URL` pasa por el pooler en modo transacción (6543, con
  `?pgbouncer=true`) y la usa la app; `DIRECT_URL` pasa por el pooler en modo sesión (5432) y la
  usa `prisma migrate`.
- **Dónde se declara cada una (Prisma 7):** el bloque `datasource` de `schema.prisma` ya no acepta
  `url` ni `directUrl` — Prisma 7 lo rechaza con `P1012`. En su lugar: `DIRECT_URL` se configura
  en `prisma.config.ts` (lo usan las migraciones) y `DATABASE_URL` se pasa al driver adapter
  `@prisma/adapter-pg` en `lib/prisma.ts` (lo usa la app). Las dos se leen de `.env`; ninguna
  aparece en el código.
- `SESSION_SECRET`: usada para firmar una cookie httpOnly de sesión tras validar `APP_PASSWORD`
  (ver detalle del flujo en [`auth-y-permisos.md`](auth-y-permisos.md)). Generarla con
  `openssl rand -base64 32` o equivalente — no un string corto ni adivinable.
- `APP_PASSWORD` nunca se compara en texto plano contra lo que el usuario tipea sin al menos
  usar una comparación de tiempo constante (evita timing attacks triviales); no hace falta
  hashearla en base de datos porque no vive en la base de datos, vive solo como variable de
  entorno.
