# Stack y deploy

> **Dueño de:** con qué se construye ReleaseView, dónde corre y cómo se publica.
> **No cubre:** el modelo de datos (→ [`modelo-de-datos.md`](modelo-de-datos.md)) · el costo mensual
> detallado (→ `costos.md`, lo escribe `/costo`).

## La elección, en llano

- **La app (frontend + backend en uno):** [Next.js](https://nextjs.org/) con TypeScript. Es un
  framework de React que permite escribir las pantallas y la lógica de servidor (guardar un
  cliente, consultar por feature, armar la lista de release) en el mismo proyecto, sin tener que
  levantar dos servidores separados.
- **Base de datos:** [Supabase](https://supabase.com/) — un Postgres administrado (no hay que
  instalar ni mantener un servidor de base de datos) que además trae, listo para cuando haga
  falta, un sistema de login (útil el día que se agregue autenticación individual, hoy fuera de
  alcance del MVP — ver `docs/prd.md` §5) y una forma de aislar datos por organización a nivel de
  base de datos (Row Level Security), que encaja con la decisión de preparar el modelo de datos
  para multi-tenant (`DECISIONS.md`, 2026-09-14).
- **Acceso a la base de datos desde el código:** [Prisma](https://www.prisma.io/) — define las
  tablas en un archivo legible y genera las consultas ya tipadas, para que sea más difícil
  introducir errores al leer o escribir datos.
- **Deploy:** [Vercel](https://vercel.com/) para la app (conecta directo al repo de GitHub: cada
  cambio publicado se despliega solo) y Supabase aloja la base de datos. Los dos tienen plan
  gratuito que alcanza sin problema para el volumen del MVP (un puñado de clientes internos
  usando el panel).

## Por qué esta combinación

- Es la combinación más común hoy para este tipo de panel interno, lo que significa más
  documentación, más piezas ya resueltas (ej. plantillas de autenticación) y menos piezas
  "hechas a mano" que mantener.
- Next.js + Vercel es deploy sin fricción: no hay servidores que administrar a mano.
- Supabase da Postgres real (una base de datos robusta y estándar) sin la complejidad operativa
  de correrlo uno mismo, y ya trae el camino pavimentado para login y aislamiento por
  organización cuando el proyecto lo necesite — sin tener que migrar de motor de base de datos
  más adelante.

## Costo

El número concreto (con supuestos de uso) lo calcula `/costo` y queda en `costos.md`. En llano
por ahora: con el volumen del MVP (uso interno, pocos usuarios, sin integraciones externas
corriendo todavía), tanto Vercel como Supabase se mantienen dentro de sus planes gratuitos — el
costo esperado en esta etapa es **$0/mes**, hasta que el uso crezca lo suficiente como para pedir
un plan pago.

## Anexo técnico

- Next.js (App Router) + TypeScript, desplegado en Vercel (proyecto conectado al repo de GitHub,
  deploy automático en cada push a `main`).
- Prisma como ORM contra Postgres de Supabase (`DATABASE_URL` — ver
  [`secretos.md`](secretos.md)).
- Sin colas, sin jobs en background, sin websockets: el MVP es CRUD + lectura filtrada, no
  necesita infraestructura adicional.
