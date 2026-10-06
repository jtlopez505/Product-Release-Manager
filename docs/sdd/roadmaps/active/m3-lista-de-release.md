# M3 · Lista de despliegue para un release — plan

## 1. Qué logramos con este milestone

El día del release, se elige qué se va a desplegar —una versión destino o un feature— y la app
dice a qué clientes, con la versión que tiene cada uno hoy, en una lista que se ve antes de
exportar y se baja como archivo para compartir con el equipo. Cierra el recorrido completo del
MVP (`docs/prd.md` §2): cargar → consultar → armar la lista de release.

## 2. Qué queda afuera

Ya está en `docs/prd.md` §5: integración automática con Azure DevOps/Jira, login individual,
notificaciones, y el historial operativo de despliegues. Además, específico de este plan:

- **Combinar criterios** (versión Y feature a la vez). Un criterio por vez, como define
  `user-flow.md` §5: mantiene el filtro simple y predecible.
- **Excluir clientes a mano dentro de la app.** Si un cliente aparece y no corresponde (por
  ejemplo, uno que ya está más adelante que la versión destino), se ve en la columna de versión
  actual y se quita en el archivo exportado.
- **Marcar clientes como desplegados o actualizarles la versión desde la lista.** La versión se
  cambia en la Vista de cliente (M1-04), que es donde queda el historial.
- **Guardar listas de release.** La lista se calcula al vuelo y no se guarda
  (`modelo-de-datos.md`).
- **Enviar la lista por correo o chat desde la app.** Se baja el archivo y se comparte por fuera;
  mandarlo desde acá sería una acción hacia afuera (regla #4) que el MVP no necesita.
- El deploy real a producción (Vercel) — eso es `/deploy`, con el owner dando el OK.

## 3. Preguntas y riesgos

**Resueltas antes de planear:**
- *¿M2 está cerrado?* Sí: el owner lo probó y confirmó. Plan archivado en
  `docs/sdd/roadmaps/archive/`.
- *Al filtrar por versión destino, ¿qué clientes aparecen?* **Todos los que no están en esa
  versión.** No interpreta los números de versión (son texto libre: `2.4.1`, `v2.4`,
  `1.0.0-RC1`), así que nunca deja afuera a un cliente por un formato raro — el peor error posible
  el día de release. Lo que se acepta a cambio: un cliente que ya está *más adelante* también
  aparece; se ve en su versión actual y se quita del archivo.
- *¿Dónde se abre el archivo exportado?* **Excel en español.** Ese Excel separa columnas con punto
  y coma y necesita los acentos codificados de una forma particular; un CSV "estándar" con coma se
  abre todo en una sola columna.

**Heredado para las fichas** (decidido acá, no se re-pregunta):
- **Una tercera pestaña, "Lista de release"**, al lado de "Por cliente" y "Por feature". No hay
  otra entrada posible y es el momento de mayor uso. `user-flow.md` §1 decía "dos pestañas": quedó
  corregido.
- **Un criterio por vez**, elegido dentro de la pantalla: "Por versión destino" o "Por feature".
  Lo que se está mirando lo dice la URL, como en todas las pantallas de M1 y M2.
- **Por versión destino:** se escribe la versión (es texto libre: casi siempre es una versión que
  ningún cliente tiene todavía). La comparación es la misma que usa el historial de M1-04: ignora
  espacios al borde y no ignora mayúsculas.
- **Por feature:** reciben el feature los clientes que todavía no lo tienen — la misma regla y la
  misma partición de M2 (`particionarClientesPorFeature`). El feature se elige con la misma lista
  desplegable que M2.
- **Nadie desaparece sin aviso.** Además de la lista, la pantalla dice cuántos clientes quedaron
  afuera y por qué: "3 clientes ya están en 2.5.0" o "5 clientes ya tienen este feature".
- **La vista previa es la lista en pantalla**: cada cliente (que lleva a su Vista de cliente) con
  su versión actual en monoespaciada, y la cantidad total. Se ve completa antes de exportar
  (`user-flow.md` §5).
- **Exportar:** archivo generado en el navegador, sin backend adicional (`user-flow.md`), con punto
  y coma como separador y los acentos codificados para Excel. Una fila por cliente con su versión
  actual; el nombre del archivo dice el criterio y la fecha.

**Riesgos** (heredados del PRD, ver `docs/prd.md` §4, con su límite ya definido ahí):
- **Riesgo #1 (carga manual desactualizada) pega justo acá:** la lista de release es tan confiable
  como lo cargado a mano, y es el día en que un dato viejo cuesta más. El PRD ya define el límite:
  si en un release real los datos manuales fallan, se prioriza la integración automática.
- **El criterio "distinta de la destino" incluye a los clientes adelantados.** Aceptado por el
  owner a cambio de no interpretar versiones; mitigado porque la versión actual de cada cliente se
  ve en pantalla y en el archivo.

Sin preguntas abiertas que bloqueen.

## 4. Reglas del proyecto que toca este milestone

- **#1** — la lista cruza clientes y features de la organización: solo aparecen los de la
  organización actual, en pantalla y en el archivo. Un `?feature=<id>` de otra organización se
  trata igual que uno inexistente, como en M2.
- **#5** — siempre: cada pieza cierra con sus 3 verificaciones en verde.

## 5. Las piezas de trabajo (ESTA TABLA ES EL ESTADO)

| ID | Pieza | Estado | Depende de | Ficha |
|---|---|---|---|---|
| M3-01 | Lista de release por versión destino: la pestaña nueva, escribir la versión y ver qué clientes la reciben | ⬜ pendiente | — | `docs/sdd/specs/M3-01-lista-por-version.md` |
| M3-02 | Lista de release por feature: elegir el feature y ver qué clientes lo reciben | ⬜ pendiente | M3-01 | `docs/sdd/specs/M3-02-lista-por-feature.md` |
| M3-03 | Exportar la lista a un archivo para Excel en español | ⬜ pendiente | M3-01, M3-02 | `docs/sdd/specs/M3-03-exportar-lista.md` |

**Por qué este orden:** primero la pantalla con el criterio más simple —por versión, que no
depende del catálogo de features— porque trae la pestaña, la vista previa y los estados que las
otras dos usan. El criterio por feature se suma a esa misma pantalla. La exportación va al final
porque exporta lo que esté elegido, sea cual sea el criterio: con los dos construidos, se prueba
completa de una sola vez en lugar de volver a abrirla.

**Cobertura de las condiciones de M3 (`docs/prd.md` §3):**
- "Se puede filtrar los clientes que corresponden a la próxima versión o feature a desplegar" →
  M3-01 (versión) + M3-02 (feature).
- "Esa lista se puede ver u exportar lista para compartir con el equipo" → M3-01 y M3-02 (verla:
  la vista previa) + M3-03 (exportarla).

## 6. Cuándo está terminado el milestone
- [ ] Todas las filas de la tabla en ✅ (cada una con sus 3 verificaciones en verde, regla #5).
- [ ] Las condiciones del milestone en `docs/prd.md` se cumplen y se pueden demostrar.
- [ ] **El owner lo probó con sus ojos:** el agente le dejó la app levantada y el link servido,
      y él confirmó que lo que ve está bien.
- [ ] Este plan movido a `docs/sdd/roadmaps/archive/`.
