# Modelo de datos

> **Dueño de:** qué datos existen, dónde viven y cómo se aíslan entre organizaciones — numera la
> **regla #1**. **No cubre:** el stack (→ [`stack.md`](stack.md)) · el login (→
> [`auth-y-permisos.md`](auth-y-permisos.md)).

## En llano

ReleaseView guarda tres cosas: **clientes**, **features** y qué combinación de cliente+feature
está habilitada. Todo, desde el día 1, queda etiquetado con a qué **organización** pertenece —
aunque el MVP solo va a tener una organización cargada (la tuya). Esto es la decisión de
"multi-tenant desde el arranque" (`DECISIONS.md`, 2026-09-14): el día que haya una segunda
organización usando ReleaseView, sus datos no se mezclan con los tuyos porque el aislamiento ya
está en la base, no hay que rediseñar nada.

## Las tablas

- **Organización** — quién usa ReleaseView. El MVP arranca con una sola fila (sembrada al
  desplegar). Todo lo demás cuelga de acá.
- **Cliente** — un cliente de la organización, con su **versión activa** (texto, ej. `2.4.1`).
- **Historial de versión** — cada vez que la versión de un cliente cambia (incluida la primera
  carga), queda una fila nueva con la versión y la fecha. No se sobreescribe ni se borra nada —
  así se puede mirar atrás y saber qué versión tenía un cliente en un momento dado (PRD M1,
  cerrado el 2026-09-16). Esto **no** es un historial operativo completo (no guarda quién lo
  cargó ni notas de release) — solo versión + fecha, que es lo que el PRD pide.
- **Feature** — la lista maestra de features del producto que se gestiona. Se gestiona igual que
  los clientes: hay una pantalla simple para verla/editarla, y también se puede crear un feature
  nuevo sin salir del formulario de alta de cliente (ver `user-flow.md`), para no frenar la carga.
  Los campos de un feature salen directo de tu catálogo real (`Features Nexus.xlsx`, 2026-09-26):
  código (ej. `F-020`), producto al que pertenece, nombre, qué hace, qué problema resuelve, a
  quién beneficia, prioridad, estado del feature, métrica de éxito y observaciones. Ver detalle
  en el Anexo técnico.
  - **Ojo con no confundir dos "estados" distintos:** el **estado del feature** (¿ya existe? ¿está
    en desarrollo? ¿todavía es una idea?) es una propiedad del feature en sí, igual para todos los
    clientes. El **habilitado** de Cliente↔Feature es otra cosa: si UN cliente en particular lo
    tiene prendido, independientemente de si el feature ya está disponible en general.
- **Cliente↔Feature** — qué features tiene habilitados cada cliente. Es la tabla que responde las
  dos preguntas de negocio del ICP: "¿qué tiene este cliente?" (M1) y "¿qué clientes tienen este
  feature?" (M2).

Ninguna otra entidad hace falta para el MVP: no hay tabla de "usuarios" (el acceso es una
contraseña compartida, no cuentas — ver [`auth-y-permisos.md`](auth-y-permisos.md)) ni de
"despliegues pasados" (fuera de alcance, PRD §5). La "lista de release" (M3) no se guarda: se
calcula al vuelo filtrando clientes por versión o por feature, y se exporta — no necesita su
propia tabla.

## Regla #1 — aislamiento de datos

**Todo dato de cliente o de feature pertenece a una organización; ninguna consulta puede
devolver datos de una organización que no sea la que está usando la app.** En el MVP hay una
sola organización, así que la regla no se "ve" en uso — pero el código igual filtra siempre por
`organization_id`, para que agregar la segunda organización el día de mañana sea una migración de
datos, no una reescritura de queries.

## Abierto

- Si más adelante se suma histórico de despliegues (fuera del MVP), va a ser una tabla nueva que
  referencia Cliente — no afecta el diseño actual.
- Datos reales para sembrar la lista de features cuando M1 esté construido: `Features Nexus.xlsx`
  (22 features de "IWIA - Nexus Go/Pro", con código, producto, prioridad y estado ya cargados) —
  no se copia al repo por ser información del negocio del owner; queda como referencia en
  `C:\Users\Jaime\Documents\INTI\Features Nexus.xlsx`.

## Anexo técnico

Esquema (Prisma, Postgres vía Supabase — ver [`stack.md`](stack.md)):

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())

  clients  Client[]
  features Feature[]
}

model Client {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  currentVersion String
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  features        ClientFeature[]
  versionHistory  ClientVersionHistory[]

  @@index([organizationId])
}

// Una fila por cada cambio de versión (incluida la primera carga) — nunca se edita ni se
// borra, es el registro de "qué versión tuvo este cliente y desde cuándo".
model ClientVersionHistory {
  id        String   @id @default(cuid())
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id])
  version   String
  recordedAt DateTime @default(now())

  @@index([clientId])
}

enum Prioridad {
  ALTA
  MEDIA
  BAJA
}

// Estado del feature en sí (¿existe, se está construyendo, o todavía es un plan?) —
// NO es si un cliente puntual lo tiene prendido, eso vive en ClientFeature.enabled.
enum EstadoFeature {
  DISPONIBLE
  EN_DESARROLLO
  PROXIMAMENTE
}

model Feature {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  code           String?       // ej. "F-020" — el identificador legible de tu catálogo
  producto       String?       // ej. "IWIA - Nexus Go/Pro" — texto libre, no una tabla propia
  name           String        // "Nombre del Feature"
  queHace              String? @db.Text
  queProblemaResuelve  String? @db.Text
  aQuienBeneficia      String? @db.Text
  prioridad      Prioridad?
  estado         EstadoFeature @default(DISPONIBLE)
  metricaExito   String? @db.Text
  observaciones  String? @db.Text
  createdAt      DateTime @default(now())

  clients ClientFeature[]

  @@index([organizationId])
  @@unique([organizationId, code])
}

model ClientFeature {
  clientId  String
  featureId String
  enabled   Boolean  @default(true)
  updatedAt DateTime @updatedAt

  client  Client  @relation(fields: [clientId], references: [id])
  feature Feature @relation(fields: [featureId], references: [id])

  @@id([clientId, featureId])
}
```

**Regla de acceso a datos:** toda query de `Client`/`Feature`/`ClientFeature`/`ClientVersionHistory` se hace a través de
funciones que reciben `organizationId` explícito y lo agregan al `where` — nunca una query sin
ese filtro, aunque hoy solo exista una organización sembrada. Esto es lo que hace la regla #1
verificable en code review, no solo una intención.
