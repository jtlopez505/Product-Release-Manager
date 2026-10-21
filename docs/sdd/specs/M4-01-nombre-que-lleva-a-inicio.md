# M4-01 · El nombre "ReleaseView" del encabezado lleva a Inicio

**Depende de:** nada

## 1. Qué queremos lograr

Que el nombre **"ReleaseView"** del encabezado sea clickeable y lleve a Inicio, desde cualquier
pantalla que tenga la barra de navegación. Es la convención que cualquiera espera de un encabezado
web: la vuelta a casa sin pensar y sin buscar la pestaña correcta.

## 2. Qué hay hoy

`app/navegacion.tsx` es la barra de nivel superior: el nombre de la app y las tres pestañas ("Por
cliente", "Por feature", "Lista de release"). El nombre es un **`<span>` inerte** (línea 49) —
se ve como encabezado pero no hace nada al hacerle clic.

La barra es un componente de servidor y no está en `app/layout.tsx` a propósito: la reciben las
pantallas que corresponden, pasándole por `prop` cuál pestaña está activa. **No está** en el
portón (`/ingresar`) ni en los formularios de alta/edición de cliente — ver §5.

Inicio es `/` (`app/page.tsx`), que es también el destino de la pestaña "Por cliente".

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | El nombre "ReleaseView" del encabezado es un link a `/` | En el markup servido de una pantalla con barra, el texto "ReleaseView" está dentro de un `<a href="/">`. Integración sobre la pantalla de Inicio. |
| 2 | Funciona desde cualquier pantalla que tenga la barra | Integración: el encabezado de `/por-feature` y de `/lista-de-release` trae ese mismo `<a href="/">`. Dos pantallas distintas de Inicio, para que no pase por venir del mismo árbol. |
| 3 | Al hacerle clic, se llega a Inicio | Recorrido completo en navegador real: desde `/lista-de-release`, clic en el nombre → la URL queda en `/` y se ve la lista de clientes. |
| 4 | Se comporta como un control clickeable | Lleva el tinte de hover de `marca.md` (`hover:bg-hover`) y queda alcanzable por teclado con el anillo de foco de la regla global. "Hover solo donde hay clic" se cumple en la dirección correcta: ahora hay clic, así que corresponde el hover. |
| 5 | **NO duplica la "página actual"** | En el encabezado hay **exactamente un** elemento con `aria-current="page"` — la pestaña activa. El link del nombre **no** lo lleva. Se cuenta en el markup servido de `/` (donde el nombre y la pestaña "Por cliente" apuntan los dos a `/`, que es el caso donde el error aparecería). |
| 6 | **NO aparece donde la barra no está** | `/ingresar` sigue sin barra de navegación: su `<h1>ReleaseView</h1>` sigue sin ser link y en esa pantalla no hay ningún `<a href="/">`. El portón no gana una salida lateral. |
| 7 | No se cuela ningún color suelto | `tests/estilos-de-marca.test.ts` sigue en verde: el hover usa el token de `marca.md`, no un hex escrito a mano. |

## 4. Qué ve el usuario

**Pantallas que cambian:** ninguna pantalla nueva. Cambia el encabezado compartido, y por lo tanto
las cuatro pantallas que lo llevan: Inicio (`/`), Por feature (`/por-feature`), Lista de release
(`/lista-de-release`) y la lista maestra de features (`/features`).

**El recorrido:** estoy armando la lista de release, quiero volver al listado de clientes, hago
clic en "ReleaseView" arriba a la izquierda y estoy en Inicio. Sin pasar por la pestaña correcta
ni por el botón de atrás del navegador.

**Los tres estados:** esta pieza **no agrega superficie asíncrona** — es un link a una ruta que ya
existe. No tiene estado de carga, de error ni vacío propios; los tres los define Inicio, que es el
destino, y ya están construidos y probados en M1-05. Lo que sí tiene son los dos estados de
interacción del criterio #4: hover y foco visible.

## 5. Qué queda afuera

- **Poner la barra en las pantallas donde hoy no está** (el portón y los formularios de cliente).
  La ausencia es deliberada: salir de un formulario por un link costaría lo tipeado, y de ahí se
  sale con "Cancelar", que pregunta antes de descartar.
- **Quitar la pestaña "Por cliente"** aunque apunte al mismo lugar. El nombre es la vuelta a casa;
  la pestaña es la que marca dónde estás parado. Son dos trabajos distintos.
- **Un logo o una marca gráfica.** Sigue siendo el nombre en texto, con la tipografía que ya tiene.
- **"Cerrar sesión"**, que es la otra mitad del encabezado y va en M4-02.

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter → 2) integración → 3)
  el recorrido completo de punta a punta. No se avanza a una capa con la anterior en rojo; si una
  falla: causa raíz → arreglo mínimo → re-correr. Esta pieza no toca datos de usuarios, así que la
  integración no suma prueba de aislamiento.
- **Test primero:** el test se escribe antes de la implementación y se lo ve fallar por la razón
  correcta antes de darlo por bueno. El de los criterios #1 y #5 tiene que fallar hoy contra el
  `<span>`.
- **Entregables:** `app/navegacion.tsx` (el `<span>` de la línea 49 pasa a `<Link href="/">`) y el
  test de integración del encabezado. Nada más: el resto de la barra no se toca.
- **Verificar el markup real antes de escribir el test** — es el tropiezo que ya costó corridas en
  este proyecto. Mirar qué sirve `/` hoy, no asumir nombres de clase ni estructura.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/user-flow.md` §1, que ya
  lo declara; el si entra o no, a `docs/prd.md` §3 · M4.
