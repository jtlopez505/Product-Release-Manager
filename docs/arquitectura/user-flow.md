

# Recorrido del usuario

> **Dueño de:** el camino de punta a punta por ReleaseView, del ingreso al resultado. Borrador
> propuesto por el Diseñador de Producto, consolidado con las decisiones técnicas del Arquitecto.
> **No cubre:** identidad visual (→ [`marca.md`](marca.md)).

Cubre el recorrido único del MVP (`docs/prd.md` §2): cargar un cliente → consultarlo por cliente o
por feature → armar la lista de release. No incluye integración automática con Azure DevOps/Jira
ni login individual — ambos fuera de alcance del MVP (PRD §5).

## 0. Ingreso

Portón compartido, no cuentas individuales (ver [`auth-y-permisos.md`](auth-y-permisos.md)):
pantalla simple con un solo campo (contraseña) y un botón "Entrar". Al validar, redirige a Inicio
y no vuelve a pedirla durante la sesión.

Se sale con **"Cerrar sesión"** (§1, M4), que devuelve a esta misma pantalla con un aviso de que
la sesión se cerró — así no se confunde con "se venció" ni con "nunca entraste".

## 1. Inicio — lista de clientes

Lo primero que se ve al entrar: la lista de clientes cargados, con su versión activa visible en
la misma fila (sin tener que abrir cada uno). Acción principal, siempre visible: **"+ Agregar
cliente"**. Buscador simple por nombre, útil apenas hay más de ~10 clientes.

Navegación de nivel superior: tres pestañas — **"Por cliente"** (esta vista) / **"Por feature"**
(§4) / **"Lista de release"** (§5) — cambiar de ángulo de consulta es un clic. La tercera llega
con M3: la lista de release no tiene otra entrada posible y es el momento de mayor uso del ICP,
así que va en el mismo nivel que las otras dos.

En el mismo encabezado, a la izquierda, el nombre **"ReleaseView"** lleva a Inicio desde
cualquier pantalla que tenga esta barra (M4) — es la convención que cualquiera espera de un
encabezado. La pestaña "Por cliente" no se va: sigue siendo la que marca dónde estás parado.
A la derecha, **"Cerrar sesión"** (M4, ver [`auth-y-permisos.md`](auth-y-permisos.md)): un clic,
sin confirmación — volver a entrar es tipear la contraseña, así que un clic por error cuesta poco
y un diálogo de confirmación en cada salida cuesta más.

- **Estado vacío** (sin clientes todavía): "Todavía no cargaste ningún cliente." + el botón
"+ Agregar cliente" como única acción.
- **Estado de carga:** skeleton de filas, no un spinner centrado en pantalla en blanco.
- **Estado de error:** "No se pudo cargar la lista de clientes." + botón "Reintentar".

## 2. Alta de cliente (M1)

Formulario con carga 100% manual (sin integración externa en el MVP):

1. Nombre del cliente (obligatorio).
2. Versión activa (texto libre, ej. `2.4.1`).
3. Features habilitados: selección múltiple de la lista maestra de features (§2.1). Si el
 feature que hace falta todavía no existe, hay una opción **"+ crear feature nuevo"** ahí
 mismo, sin salir del formulario — la lista maestra se alimenta también desde acá.

Errores de validación in-line junto al campo. Si se navega hacia atrás sin guardar, se pregunta
explícitamente antes de descartar. Al guardar: spinner en el botón (no bloqueo de pantalla
completa) y redirige a la Vista de cliente recién creado. Si falla el guardado, el formulario
conserva lo tipeado + mensaje de error puntual.

### 2.1 Lista maestra de features

Pantalla simple (accesible desde "Por feature", §3) para ver y administrar los features del
producto: nombre y descripción opcional. Un feature se puede crear tanto acá como inline durante
el alta de un cliente (§2) — es la misma lista en los dos lugares.

## 3. Vista de cliente (M1)

Se llega desde la lista de Inicio (clic en una fila) o después de dar de alta.

Encabezado: nombre del cliente + versión activa, en grande — es la respuesta a la pregunta que
más rápido necesita el PM. Lista de features, distinguibles visualmente entre habilitados y no
habilitados (nunca ambigüedad entre "no lo tiene" y "no se cargó"). Acción principal:
**"Editar"** — mismo formulario que el alta, precargado, mismas reglas de no perder datos.

**Historial de versiones:** debajo del encabezado, una lista simple de fecha → versión (más
reciente primero) — cada cambio de versión de ese cliente, incluida la primera carga. Sin
acciones sobre esas filas (no se editan ni se borran): es un registro, no un formulario.

- **Estado vacío** (cliente sin features cargados): "Este cliente todavía no tiene features
cargados."

## 4. Consulta por feature (M2)

Pestaña "Por feature": selector de feature (lista o buscador si crece) y, al elegir uno, dos
listas separadas y legibles de un vistazo — **"Clientes que lo tienen"** / **"Clientes que no lo
tienen todavía"**. Es la pregunta del ICP respondida directamente, sin scroll cruzado.

- **Estado vacío** (feature sin ningún cliente, o ningún feature cargado todavía): mensaje
explícito + salida hacia "+ Agregar cliente" o hacia la lista maestra de features.

## 5. Lista de despliegue para un release (M3)

El momento de mayor dolor del ICP — tiene que sentirse más corto y más seguro que cruzar
herramientas a mano.

Se elige **un** criterio de filtro por vez — por versión destino, o por feature a desplegar (no
combinados con AND en el MVP; mantiene el filtro simple y predecible). El resultado es la lista
de clientes que matchean, con el dato relevante a la vista (su versión actual o si ya tiene el
feature) — literalmente "qué cliente recibe qué".

Antes de exportar, se ve una **vista previa** de la lista completa (reduce el riesgo de error
humano que el ICP ya nombra como dolor validado). Acción principal: **"Exportar CSV"** — genera
el archivo directo en el navegador, sin backend adicional, listo para compartir por correo o
chat.

- **Estado vacío** (el filtro no matchea ningún cliente): "Ningún cliente corresponde a este
filtro todavía" — es información válida, no un error.

## Resumen del recorrido

```
Ingresar (contraseña compartida)
  → Inicio (lista de clientes)
      → + Agregar cliente → formulario (+ crear feature inline) → Vista de cliente     [M1]
      → Vista de cliente → Editar → guarda cambios                                    [M1]
  → Por feature → elegir feature → clientes con / sin ese feature                     [M2]
  → Armar lista de release → filtrar por versión o feature → vista previa → exportar  [M3]
  → Cerrar sesión → vuelve a Ingresar                                                [M4]
```

## Decisiones que resuelven los supuestos del borrador original

- **Ingreso:** sí hay una pantalla, pero es un portón compartido (una contraseña), no login
individual — ver [`auth-y-permisos.md`](auth-y-permisos.md).
- **Lista maestra de features:** existe como pantalla propia y se alimenta también inline desde
el alta de cliente — misma fuente en los dos lugares.
- **Filtro de la lista de release:** un criterio a la vez (versión o feature), no combinado —
mantiene M3 simple para el MVP.
- **Formato de exportación:** CSV generado en el navegador.

