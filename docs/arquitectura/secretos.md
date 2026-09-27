# Secretos y claves

> **Dueño de:** qué claves necesita ReleaseView, de dónde salen y cómo nunca tocan el código —
> numera la **regla #2**.

## En llano

ReleaseView necesita tres claves para funcionar. Ninguna se escribe en el código ni se sube al
repo: viven como **variables de entorno**, configuradas directo en Vercel (para producción) y en
un archivo local `.env` que nunca se commitea (para desarrollo).

| Clave | Para qué | De dónde sale |
|---|---|---|
| `DATABASE_URL` | Conectar la app a la base de datos | La da Supabase al crear el proyecto (Settings → Database → Connection string) |
| `APP_PASSWORD` | La contraseña compartida para entrar a la app (ver [`auth-y-permisos.md`](auth-y-permisos.md)) | La elegís vos al configurar el deploy — no es un secreto que "genera" un servicio externo |
| `SESSION_SECRET` | Firma la sesión de quien ya entró, para que la app sepa que sigue autenticado sin pedir la contraseña en cada clic | Se genera una vez (una cadena aleatoria larga) al configurar el proyecto |

## Regla #2

**Ninguna clave va en el código ni en el repo, nunca.** Todas salen de variables de entorno. Si
alguna vez aparece una clave escrita directo en un archivo `.ts`/`.tsx`, es un bug de seguridad
que se corrige antes de seguir — sin excepciones, aunque sea "solo para probar".

## Cómo se configuran

- **Local (desarrollo):** archivo `.env.local` en la raíz del proyecto, con las tres claves.
  Ese archivo está en `.gitignore` desde el arranque — nunca se commitea.
- **Producción (Vercel):** las mismas tres claves se cargan en el panel de Vercel (Project
  Settings → Environment Variables). Vercel las inyecta en cada deploy; nunca quedan visibles en
  el código publicado.

## Anexo técnico

- `DATABASE_URL`: connection string de Postgres que da Supabase (incluye usuario/contraseña de
  la base — por eso también es secreto, no solo un endpoint).
- `SESSION_SECRET`: usada para firmar una cookie httpOnly de sesión tras validar `APP_PASSWORD`
  (ver detalle del flujo en [`auth-y-permisos.md`](auth-y-permisos.md)). Generarla con
  `openssl rand -base64 32` o equivalente — no un string corto ni adivinable.
- `APP_PASSWORD` nunca se compara en texto plano contra lo que el usuario tipea sin al menos
  usar una comparación de tiempo constante (evita timing attacks triviales); no hace falta
  hashearla en base de datos porque no vive en la base de datos, vive solo como variable de
  entorno.
