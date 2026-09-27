# M1-03 · Lista maestra de features

**Depende de:** M1-01 (base del proyecto), M1-02 (portón de acceso)

## 1. Qué queremos lograr

Una pantalla donde se puede crear, ver y editar los features del catálogo del producto —la lista
maestra que después usa M1-04 para que un cliente elija cuáles tiene habilitados. Sin esta pieza,
no hay features de qué elegir al dar de alta un cliente.

## 2. Qué hay hoy

El proyecto base corre en local (Next.js + Prisma + Supabase, M1-01) y el portón de acceso protege
las rutas de la app (M1-02). Todavía no hay ninguna pantalla de negocio: esta es la primera. El
esquema de `Feature` ya está definido en
[`modelo-de-datos.md`](../../arquitectura/modelo-de-datos.md) (no hace falta migrarlo de nuevo,
ya vive en el `schema.prisma` que dejó M1-01).

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | Crear un feature con nombre (obligatorio) y, opcionalmente, el resto de los campos del catálogo (código, producto, qué hace, qué problema resuelve, a quién beneficia, prioridad, estado, métrica de éxito, observaciones) lo persiste asociado a la organización actual. Si no se elige estado, queda en "Disponible" (default del esquema). | Se completa el formulario con nombre y se guarda → el feature aparece de inmediato en la lista, sin recargar la página a mano. |
| 2 | La lista maestra muestra todos los features de la organización actual — ninguno de otra organización. | Con dos organizaciones sembradas, cada una con features propios, la lista logueado como una organización solo muestra los suyos (regla #1). |
| 3 | Editar un feature existente guarda los cambios. | Se cambia el nombre (o cualquier otro campo) de un feature ya creado, se guarda, y tanto la lista como el feature reflejan el valor nuevo. |
| 4 | Crear un feature sin nombre no se guarda. | Se envía el formulario con el campo nombre vacío → error inline junto al campo, no se crea ninguna fila nueva y la lista queda igual. |
| 5 | Crear un feature con un nombre que ya existe en la misma organización no se guarda. Criterio de duplicado: mismo nombre comparado sin distinguir mayúsculas/minúsculas ni espacios al borde, dentro de la misma organización (dos organizaciones distintas sí pueden tener un feature con el mismo nombre, regla #1). | Se crea "Login SSO", después se intenta crear "login sso " (mismo nombre, otra capitalización) → se rechaza con "Ya existe un feature con ese nombre.", no se duplica la fila. |

## 4. Qué ve el usuario

- **Pantallas o vistas:** una pantalla nueva, protegida por el portón de acceso (M1-02) —
  la lista maestra de features, con un formulario de alta/edición (puede ser modal o ruta propia,
  a criterio de quien construye). Todavía no existe "Inicio" (lista de clientes, M1-05) ni la
  navegación de pestañas "Por cliente" / "Por feature" ([`user-flow.md`](../../arquitectura/user-flow.md)
  §1) — esta pantalla se integra a esa navegación cuando esas piezas existan; por ahora alcanza con
  que sea una ruta propia y protegida (ej. `/features`).
- **El recorrido:**
  1. El usuario, ya logueado, llega a la lista maestra de features.
  2. Ve la lista: por fila, al menos nombre, código (si tiene), prioridad y estado — el resto de
     los campos se ve al abrir el detalle/edición, no hace falta en la fila.
  3. Clic en **"+ Agregar feature"** abre el formulario con el campo nombre (obligatorio) y el
     resto de los campos del catálogo (opcionales).
  4. Guarda: spinner en el botón, no bloqueo de pantalla completa. Si se guarda bien, vuelve a la
     lista con el feature nuevo visible.
  5. Si falla la validación (nombre vacío o duplicado) o el guardado, el formulario conserva lo
     tipeado y muestra el error puntual — no se pierde lo que el usuario ya cargó.
  6. Clic en un feature de la lista abre el mismo formulario, precargado, en modo edición; guardar
     aplica los cambios y vuelve a la lista actualizada.
- **Los tres estados:**
  - **Carga:** skeleton de filas mientras trae la lista (mismo criterio que Inicio en
    `user-flow.md` — no un spinner centrado en pantalla en blanco).
  - **Error:** si falla traer la lista, "No se pudo cargar la lista de features." + botón
    "Reintentar"; si falla guardar, el formulario conserva lo tipeado + mensaje de error puntual
    (fila 4 y 5 de §3).
  - **Vacío:** sin ningún feature cargado todavía, "Todavía no cargaste ningún feature." + el
    botón "+ Agregar feature" como única acción.

## 5. Qué queda afuera

- Asociar un feature a un cliente en particular (tabla y pantalla Cliente↔Feature) — es M1-04.
- Crear un feature "inline" desde el formulario de alta de cliente (`user-flow.md` §2, la opción
  "+ crear feature nuevo" ahí mismo) — se conecta cuando exista M1-04; esta pieza solo construye
  la lista maestra como pantalla independiente.
- Borrado de un feature — el modelo de datos no contempla eliminarlo (no hay operación de borrado
  en `modelo-de-datos.md`); si un feature deja de estar vigente, se le cambia el campo `estado`,
  no se borra.
- Historial de cambios de un feature (quién lo editó, cuándo, valores anteriores) — no existe en
  el modelo de datos; el único historial del MVP es el de versión de cliente (`ClientVersionHistory`,
  M1-04).
- La navegación superior de pestañas "Por cliente" / "Por feature" — se arma cuando existan esas
  pantallas (M1-05 y M2).
- Importar el catálogo real (`Features Nexus.xlsx`) de una sola vez — la carga en el MVP es
  manual, feature por feature, desde esta pantalla.

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#1** — toda consulta y escritura de `Feature` pasa por una función que recibe el
  `organizationId` explícito y lo agrega al `where`/al registro nuevo (`modelo-de-datos.md`,
  "Regla de acceso a datos"); la prueba de integración de la fila 2 de §3 confirma que un feature
  de otra organización no aparece en la lista ni es editable por su id desde otra organización.

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter → 2) integración
  (incluye la prueba de que un feature de otra organización no aparece, fila 2 de §3) → 3) el
  recorrido completo de punta a punta (crear → ver en la lista → editar → ver el cambio). No se
  avanza a una capa con la anterior en rojo; si una falla: causa raíz → arreglo mínimo → re-correr.
- **Test primero:** el test se escribe antes de la implementación y se lo ve fallar por la razón
  correcta antes de darlo por bueno.
- **Entregables:** rutas concretas de archivos nuevos/modificados, incluida la interfaz. Sugerido
  (Next.js App Router, ver `stack.md`): pantalla y formulario bajo `app/features/`, las funciones
  de acceso a datos (filtradas por `organizationId`, ver regla #1) en algo como `lib/features.ts`,
  y el endpoint o server action correspondiente. El `schema.prisma` de `Feature` ya existe (viene
  de M1-01) — esta pieza no lo modifica, solo lo consume. La pieza cierra con la pantalla real
  funcionando en local, no solo con código.
- **Diseño y alcance no se deciden acá:** el cómo va a su doc de `docs/arquitectura/`; el si
  entra o no, a `docs/prd.md`.
