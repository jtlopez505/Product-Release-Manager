# M1-01 · Base del proyecto: Next.js + Supabase + Prisma, corriendo en local

**Depende de:** nada

## 1. Qué queremos lograr

Tener el proyecto ReleaseView arrancando de cero: una app Next.js que corre en local, conectada a
una base de datos Postgres real en Supabase a través de Prisma, con el schema inicial migrado y
las claves fuera del código. Es la base sobre la que se construyen todas las piezas siguientes de
M1 — sin esto, no hay dónde escribir código ni dónde guardar datos.

## 2. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | Existe un proyecto Next.js (TypeScript, App Router) en el repo y corre en local | `npm install && npm run dev` levanta el servidor sin errores en la terminal, y `http://localhost:3000` responde sin error en el navegador |
| 2 | Existe un proyecto Supabase (Postgres) creado para ReleaseView | El `DATABASE_URL` de ese proyecto está disponible (en `.env.local`) y Prisma puede conectarse con él |
| 3 | El schema inicial de Prisma (`Organization`, `Client`, `Feature`, `ClientFeature`, `ClientVersionHistory`, según `modelo-de-datos.md`) está migrado contra Supabase | `npx prisma migrate dev` (o `db push`) corre sin error y las tablas quedan creadas — verificable con `npx prisma studio` o una consulta directa |
| 4 | Hay al menos una organización sembrada | Después de migrar, una consulta a `Organization` devuelve una fila (seed), lista para que las piezas siguientes (M1-03/M1-04) cuelguen sus datos ahí |
| 5 | Las cuatro claves (`DATABASE_URL`, `DIRECT_URL`, `APP_PASSWORD`, `SESSION_SECRET`) viven en `.env`, fuera del código y fuera de git | `.env` existe con las cuatro claves, `.gitignore` lo excluye, y `git check-ignore .env` confirma que no se trackea |
| 6 | **(no debe pasar)** ningún secreto queda escrito en el código | Buscar en el repo (`grep` sobre `.ts`/`.tsx`/`.js`) la connection string, `APP_PASSWORD` o `SESSION_SECRET` en texto literal no debe dar resultados — solo deben aparecer como `process.env.<NOMBRE>` |
| 7 | **(no debe pasar)** la app no arranca en silencio si falta una variable obligatoria | Borrando `DATABASE_URL` del `.env` y corriendo `npm run dev` (o cualquier operación que use Prisma), el fallo es explícito (error claro en consola), no un cuelgue silencioso ni una página en blanco sin pista del problema |

## 3. Qué queda afuera

- El portón de acceso (contraseña + sesión) — eso es M1-02, aunque `APP_PASSWORD` y
  `SESSION_SECRET` ya queden definidas como variables de entorno acá.
- Cualquier pantalla de negocio (features, clientes, historial) — eso es M1-03 en adelante.
- El deploy real a producción (Vercel) — esta pieza solo corre en local; el deploy es `/deploy`,
  con el OK del owner.

## 4. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#1** — el schema de Prisma ya incluye `organizationId` en `Client` y `Feature` desde esta
  pieza (aunque todavía no haya pantallas que lo usen), para que M1-03/04 no tengan que migrar
  el aislamiento por organización más adelante.
- **#2** — las cuatro claves (`DATABASE_URL`, `DIRECT_URL`, `APP_PASSWORD`, `SESSION_SECRET`)
  salen de `.env` desde el arranque del proyecto, nunca del código; esta pieza deja el patrón
  (`.gitignore`, `process.env.*`) instalado para que todas las piezas siguientes lo hereden.

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter → 2) integración
  (acá, en concreto: la migración de Prisma corre contra Supabase sin error y la organización
  sembrada existe) → 3) el recorrido completo de punta a punta (`npm run dev` levanta y la
  página base responde). No se avanza a una capa con la anterior en rojo; si una falla: causa
  raíz → arreglo mínimo → re-correr.
- **Test primero:** antes de dar la pieza por buena, ver fallar la prueba de la fila #7 (falta de
  variable obligatoria) por la razón correcta, y confirmar que la fila #6 (grep de secretos) da
  vacío antes de cerrar.
- **Entregables:** proyecto Next.js inicial (`package.json`, `app/page.tsx` con una página base
  mínima, `tsconfig.json`), `prisma/schema.prisma` con el modelo inicial de
  `modelo-de-datos.md`, script o archivo de seed para la organización inicial, `.env` con
  las cuatro claves (no commiteado) y `.gitignore` actualizado.
- **Diseño y alcance no se deciden acá:** el cómo va a su doc de `docs/arquitectura/` (`stack.md`,
  `secretos.md`, `modelo-de-datos.md`); el si entra o no, a `docs/prd.md`.
