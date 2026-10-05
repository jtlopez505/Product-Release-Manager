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

## Regla #2

**Ninguna clave va en el código ni en el repo, nunca.** Todas salen de variables de entorno. Si
alguna vez aparece una clave escrita directo en un archivo `.ts`/`.tsx`, es un bug de seguridad
que se corrige antes de seguir — sin excepciones, aunque sea "solo para probar".

## Cómo se configuran

- **Local (desarrollo):** archivo `.env` en la raíz del proyecto, con las cuatro claves. Ese
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
