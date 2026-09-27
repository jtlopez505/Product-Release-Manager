# M1-05 · Inicio (lista de clientes) + Vista de cliente

**Depende de:** M1-04

## 1. Qué queremos lograr

Que al entrar a ReleaseView se vea la lista de todos los clientes de la organización, y que
eligiendo uno se vea su versión activa, sus features habilitados y el historial completo de
cambios de versión — la respuesta que hoy el PM no puede dar sin cruzar herramientas. Es la
última pieza de M1: al terminarla, todo el recorrido de carga → consulta queda demostrable de
punta a punta.

## 2. Qué hay hoy

Ya existen el proyecto base y el portón de acceso (M1-01, M1-02), la lista maestra de features
(M1-03), y el alta/edición de cliente con su historial de versión guardándose en cada cambio
(M1-04). Lo que falta — y es lo que agrega esta pieza — es cualquier pantalla para **ver** esos
datos: hoy un cliente se puede cargar y editar, pero no hay lista de inicio ni vista de detalle.

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | La pantalla de Inicio muestra todos los clientes de la organización actual, con nombre y versión activa visibles en la misma fila | Con N clientes cargados para la organización, la lista muestra las N filas, cada una con nombre y versión activa, sin tener que abrir el detalle |
| 2 | Elegir un cliente de la lista lleva a su Vista de cliente | Clic en una fila navega a la vista de detalle de ese cliente específico (verificable por su identificador en la URL o equivalente) |
| 3 | La Vista de cliente muestra el nombre del cliente y su versión activa de forma destacada | Al abrir el detalle, nombre y versión activa son lo primero visible, sin scroll |
| 4 | La Vista de cliente muestra la lista de features del cliente, distinguiendo visualmente los habilitados de los no habilitados | Un cliente con features mixtos (algunos habilitados, otros no) muestra ambos grupos diferenciados, sin ambigüedad entre "no lo tiene" y "no se cargó" |
| 5 | La Vista de cliente muestra el historial completo de cambios de versión de ese cliente, ordenado de más reciente a más antiguo | Un cliente con varios cambios de versión (incluida la primera carga) muestra todas las filas del historial en ese orden, sin que falte ninguna |
| 6 | **(no debe pasar)** un cliente de otra organización no aparece en la lista de Inicio | Con datos de dos organizaciones en la base, la lista de Inicio de la organización actual no incluye ni un nombre de la otra |
| 7 | **(no debe pasar)** un cliente de otra organización no es accesible por URL directa | Armando a mano la URL de detalle con el ID de un cliente de otra organización, la app no muestra sus datos (404 o equivalente, no la vista de cliente) |

## 4. Qué ve el usuario

- **Pantallas o vistas:**
  - **Inicio** — lista de clientes de la organización, con nombre y versión activa por fila, y
    la acción "+ Agregar cliente" siempre visible (lleva al alta de M1-04).
  - **Vista de cliente** — encabezado con nombre + versión activa, lista de features
    (habilitados vs. no habilitados), historial de versiones (fecha → versión, más reciente
    primero), y la acción "Editar" (lleva al formulario de M1-04, precargado).
- **El recorrido:** el usuario entra (portón de M1-02) → llega a Inicio → ve la lista de
  clientes → elige uno → ve su Vista de cliente con versión, features e historial → opcionalmente
  toca "Editar" y sale hacia el formulario de M1-04.
- **Los tres estados** (para cada pantalla, ver fila correspondiente en §3):
  - **Carga:** mientras se trae la lista de clientes o el detalle de uno, se ve un esqueleto de
    filas (Inicio) o de secciones (Vista de cliente), no un spinner centrado en pantalla en
    blanco.
  - **Error:** si falla la consulta, "No se pudo cargar la lista de clientes." o el equivalente
    para el detalle, con un botón "Reintentar" — nunca un mensaje técnico crudo.
  - **Vacío:**
    - Inicio sin ningún cliente cargado todavía: "Todavía no cargaste ningún cliente." + el
      botón "+ Agregar cliente" como única acción.
    - Vista de cliente sin features cargados: "Este cliente todavía no tiene features cargados."

## 5. Qué queda afuera

- Editar los datos del cliente desde acá — la edición ya existe en M1-04; el botón "Editar" de
  esta vista solo navega al formulario de M1-04, no duplica su lógica.
- Consulta por feature ("qué clientes tienen el feature X") — eso es M2.
- Exportar o filtrar la lista para un release — eso es M3.
- Buscador de clientes por nombre — se puede sumar después si la lista crece; no es requisito de
  esta pieza.

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#1** — esta es la pantalla de consulta: tanto la lista de Inicio como la Vista de cliente
  filtran siempre por `organizationId`, y el acceso directo por URL a un cliente de otra
  organización se rechaza (filas #6 y #7 de §3) en vez de confiar en que "no se linkeó".

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter → 2) integración
  (acá, en concreto: la prueba de que un cliente de otra organización no aparece en la lista ni
  es accesible por URL directa, filas #6 y #7) → 3) el recorrido completo de punta a punta
  (entrar → Inicio → elegir cliente → ver versión, features e historial). No se avanza a una capa
  con la anterior en rojo; si una falla: causa raíz → arreglo mínimo → re-correr.
- **Test primero:** el test de aislamiento por organización (filas #6 y #7) se escribe antes de
  la implementación y se lo ve fallar por la razón correcta antes de darlo por bueno.
- **Entregables:** la pantalla de Inicio (lista de clientes) y la Vista de cliente (versión,
  features, historial), incluidas las consultas a datos filtradas por `organizationId` y los
  tres estados (carga, error, vacío) de cada pantalla.
- **Diseño y alcance no se deciden acá:** el cómo va a su doc de `docs/arquitectura/`
  (`modelo-de-datos.md`, `user-flow.md`, `marca.md`); el si entra o no, a `docs/prd.md`.
