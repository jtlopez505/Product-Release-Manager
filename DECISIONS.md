<!--
PLANTILLA — DECISIONS.md (registro de decisiones de diseño)
Captura el "POR QUÉ" que la compactación de contexto suele perder.
Formato mínimo por entrada: qué decisión, por qué, alternativa rechazada, constraint, fecha.
-->

# Decisiones de diseño

## 2026-09-26: Feature se enriquece con los campos del catálogo real (Features Nexus.xlsx)
- **Decisión:** el `Feature` de ReleaseView deja de ser solo nombre+descripción y pasa a tener los mismos campos que el catálogo real del owner (`Features Nexus.xlsx`): código (`F-020`), producto, nombre, qué hace, qué problema resuelve, a quién beneficia, prioridad (Alta/Media/Baja, lista cerrada), estado del feature (Disponible/En desarrollo/Próximamente, lista cerrada), métrica de éxito y observaciones. "Producto" queda como texto libre en el feature, no como tabla nueva. Para no frenar la carga de un cliente, el alta rápida inline sigue pidiendo solo código+nombre; el resto se completa después desde la lista maestra.
- **Razón:** el owner ya gestiona sus features con ese nivel de detalle en un Excel real (22 features de "IWIA - Nexus Go/Pro") — replicar esos campos evita perder información que ya usa, y evita re-diseñar el modelo cuando cargue sus datos reales.
- **Alternativa rechazada:** modelar "Producto" como tabla propia (Cliente/Feature quedarían bajo un Producto, no directo bajo Organización) — se descarta por ahora por falta de evidencia de que un mismo cliente use más de un producto a la vez; queda anotado como posible ampliación futura si aparece esa necesidad.
- **Constraint:** el **estado del feature** (¿existe, se construye, es un plan?) es distinto del **habilitado** por cliente en `ClientFeature` — no confundir los dos al construir las pantallas. Los datos reales del Excel quedan fuera del repo (información del negocio del owner) y se referencian por su ruta local para sembrar la base cuando M1 esté construido.

## 2026-09-16: PRD — se cierran las 2 preguntas abiertas; se suma historial simple de versión
- **Decisión:** se cierran las dos preguntas abiertas del PRD. (1) Cadencia real de cambios de versión/features: ~cada 2 semanas, en el peor caso 1 sprint semanal — confirma que la carga manual (riesgo #1) es manejable a ese ritmo. (2) Sí hace falta guardar historial, pero acotado: cada cambio de versión de un cliente (incluida la primera carga) queda registrado con fecha, para poder mirar atrás qué versión tenía un cliente en un momento dado. Se suma como condición de M1 y como tabla `ClientVersionHistory` en el modelo de datos.
- **Razón:** el owner necesita poder responder "qué se le entregó a este cliente y cuándo" mirando hacia atrás (hasta 2 meses mencionado como ejemplo) — sin esto, el dato se pierde apenas se edita la versión activa.
- **Alternativa rechazada:** historial operativo completo (quién lo cargó, notas de release, tickets asociados) — no fue lo que se pidió; guardar solo versión+fecha es la pieza mínima que resuelve la necesidad real sin construir de más ("base primero"). Sigue fuera de alcance (PRD §5).
- **Constraint:** `ClientVersionHistory` es de solo-append (nunca se edita ni se borra una fila) — es un registro, no un dato editable. No aplica a features todavía (solo se pidió para versión); si más adelante hace falta lo mismo para features habilitados/deshabilitados, es una decisión de scope nueva, no una extensión automática de esta.

## 2026-09-15: Arquitectura de ReleaseView — Next.js + Supabase, portón compartido
- **Decisión:** stack = Next.js + TypeScript, Postgres administrado vía Supabase, ORM Prisma, deploy en Vercel — costo esperado $0/mes en esta etapa. Modelo de datos: `Organization` / `Client` / `Feature` / `ClientFeature`, todo aislado por `organizationId` desde el día 1 (regla #1). Acceso: portón compartido con una sola contraseña (`APP_PASSWORD` + cookie de sesión firmada), sin cuentas individuales ni roles — decisión del owner al confirmar "contraseña compartida simple" sobre dejar la URL sin ninguna protección. Reglas #3 y #4 de la constitución: no aplican (sin IA ni integraciones externas en el MVP).
- **Razón:** Next.js+Vercel+Supabase es deploy sin fricción y sin servidores que administrar; Supabase deja pavimentado el camino a login real (Supabase Auth) y Row Level Security el día que se sume una segunda organización, sin migrar de motor. El portón compartido resuelve la exposición pública de datos de clientes reales sin construir un sistema de cuentas que el equipo actual (1-2 personas) todavía no necesita.
- **Alternativa rechazada:** dejar la URL sin protección (expone datos de clientes reales sin necesidad) · login individual desde el MVP (más trabajo de base antes de validar el panel, ya descartado en el PRD).
- **Constraint:** cuando el equipo crezca o haga falta trazabilidad de quién cambió qué (riesgo #2 del PRD), se reemplaza el portón compartido por Supabase Auth — es agregar una pieza que el stack ya soporta, no un cambio de proveedor.

## 2026-09-14: Modelo de datos preparado para multi-tenant desde el arranque
- **Decisión:** aunque el MVP se sigue probando con una sola organización (sin login individual — ver PRD §3/§5), el modelo de datos se diseña en `/arquitectura` con aislamiento por organización desde el día 1 (ej. todo registro con su `organization_id`), para que sumar una segunda organización más adelante sea agregar filas, no rediseñar tablas.
- **Razón:** el owner confirmó la intención de vender ReleaseView a más de una organización a futuro (ya alineado con el cobro "por organización" de `docs/solucion.md`); rehacer el modelo de datos después de tener datos reales cargados es más caro que diseñarlo bien ahora.
- **Alternativa rechazada:** modelo de datos de una sola organización sin previsión de tenant — más simple hoy, pero forzaría una migración de datos cuando llegue el segundo cliente-organización.
- **Constraint:** esto es una decisión de arquitectura (modelo-de-datos.md + auth-y-permisos.md), no cambia el alcance del MVP ni reintroduce login individual — el acceso simple sin login por persona (PRD §3) sigue vigente para M1-M3.

## 2026-09-09: PRD de ReleaseView — MVP con carga manual, sin login individual
- **Decisión:** el MVP es un recorrido completo (cargar cliente → consultar por cliente/feature → generar lista de release) con **carga manual** de datos (sin integración automática con Azure DevOps/Jira) y **acceso simple sin login por persona**. Tres milestones: M1 carga+consulta por cliente, M2 consulta por feature, M3 lista de despliegue para un release.
- **Razón:** "base primero" — la integración automática y el login/permisos son la parte técnicamente más cara y no son necesarios para validar si el panel resuelve el problema real; carga manual + acceso compartido alcanza para probar el recorrido de valor completo con el equipo actual (owner + líder técnico).
- **Alternativa rechazada:** integración automática con Azure DevOps/Jira desde el MVP — más trabajo antes de validar; login individual desde el arranque — no hace falta con un equipo tan chico todavía.
- **Constraint:** si la carga manual falla en un release real, o el equipo crece y hace falta trazabilidad de cambios, se prioriza sumar integración automática o login/permisos como milestone nuevo (ver riesgos #1 y #2 del PRD) — no se mete "de paso" en M1-M3. Esto ajusta la integración híbrida-desde-el-arranque que planteaba `docs/solucion.md`: para el MVP se pospone la parte automática, sin cambiar la visión de producto de largo plazo.

## 2026-09-08: Solución de ReleaseView — SaaS interno, integración híbrida, cobro por organización
- **Decisión:** ReleaseView es un producto tipo SaaS de uso **interno** (lo usa el equipo del PM/PO/líder técnico, no el cliente final). La integración con Azure DevOps/Jira es **híbrida desde el arranque** (no por fases): trae automáticamente lo que existe en esas herramientas y se completa a mano lo que no rastrean (ej. features de negocio habilitados por cliente). Modelo de cobro: suscripción mensual **por organización**, no por asiento ni por cliente gestionado. Precio ancla queda como supuesto abierto hasta `/costo`.
- **Razón:** el ICP usa Azure DevOps/Jira pero no toda la información de negocio vive ahí (confirmado por el owner); un portal para el cliente final habría cambiado el alcance a multi-tenant sin evidencia de que se necesite; cobrar por organización es más simple de vender que por cliente gestionado y no penaliza a quien gestiona muchos clientes.
- **Alternativa rechazada:** integración 100% automática (no cubre lo que DevOps no rastrea) · portal con acceso para el cliente final (fuera de alcance, no pedido) · cobro por cliente gestionado (más complejo de comunicar en esta etapa).
- **Constraint:** `docs/solucion.md` deja 3 supuestos abiertos 🔴 — el detalle campo-por-campo de la integración se resuelve en `/arquitectura`, y el número de precio en `/costo`.

## 2026-09-08: ICP de ReleaseView — un solo perfil, solo núcleo
- **Decisión:** un único ICP (`ICP-01`) para PM/PO/líder técnico que gestiona un SaaS o agente de IA desplegado en múltiples clientes, en vez de separar consultora de IT vs. empresa de software — comparten rol, JTBD priorizado y lenguaje. Se construye solo el núcleo (sin módulos Marketing/Ventas/Social Listening) por ahora. Estado: Parcialmente validado (N=1 — experiencia propia del owner).
- **Razón:** el disparador, el dolor (vergüenza operativa + estrés de release) y la dependencia del líder técnico como única fuente de detalle son idénticos en ambos tipos de organización — el tipo de organización no cambia el perfil, solo el contexto contractual.
- **Alternativa rechazada:** dos ICPs separados (consultora vs. empresa de software) — se descarta por ahora; queda anotado como supuesto abierto a revisar si en la práctica sus prioridades divergen.
- **Constraint:** `docs/icp.md` sigue el núcleo de 8 secciones; si más adelante hace falta calificar leads o correr ads, se agregan los módulos Ventas/Marketing sin rehacer el documento.

## 2026-08-18: Arquitectura multi-documento + el PRD como mapa
- **Decisión:** `/arquitectura` vuelve a escribir un documento por tema en `docs/arquitectura/` — siempre: `stack.md` (incluye deploy y costo mensual), `modelo-de-datos.md` (#1), `secretos.md` (#2), `user-flow.md`, `marca.md`; condicionales (si no aplican, no se crean y el índice lo marca): `integraciones-ia.md` (#3), `integraciones.md` (#4), `auth-y-permisos.md`. Al terminar, el Arquitecto completa la sección §7 "El cómo técnico" de `docs/prd.md` con los links. Sigue sin subagentes (todo en la misma pasada).
- **Razón:** un archivo único mezclaba temas de peso muy distinto; documentos separados permiten linkear con precisión desde specs y constitución, y el PRD como mapa le da al owner un solo punto de entrada. La lista se alineó con la slide 20 de la masterclass (stack · modelo de datos · user flow · marca · IA · autenticación · deploy), sumando marca y auth que faltaban en la lista inicial.
- **Alternativa rechazada:** mantener `decisiones.md` único (mezclaba todo) · un doc por tema con fan-out a subagentes (lento, ya descartado en v2).
- **Constraint:** los condicionales no se rellenan con "N/A" largos — no se crean; el índice de `docs/arquitectura/README.md` y el §7 del PRD son quienes registran el descarte en una línea.

## 2026-08-18: Alinear los comandos al workflow de la masterclass
- **Decisión:** el harness adopta los 8 comandos del mapa público de la masterclass (slide 18): `/icp` · `/solucion` · `/prd` · `/arquitectura` · `/roadmap` · `/specs` · `/implementar` · `/deploy`. Renombres: `/new-prd`→`/prd`, `/new-architecture`→`/arquitectura`, `/deploy-check`→`/deploy` (ahora con GO + confirmación ejecuta el deploy real). `/new-plan` se parte en `/roadmap` (el plan) y `/specs` (las fichas), ambos orquestando la misma skill `planner`. Nuevo `/implementar <ID>` como wrapper del despacho a `builder`. `/empezar` y `/save-point` siguen como transversales.
- **Razón:** un solo vocabulario entre la charla, el curso y el harness — lo que el alumno ve en las slides es exactamente lo que tipea en el repo.
- **Alternativa rechazada:** mantener `/new-plan` fusionado y ajustar las slides — el material público manda; la fusión se conserva a nivel doctrina (una skill), solo se parte la orquestación.
- **Constraint:** la skill `planner` sigue siendo la única dueña de la doctrina de plan+specs; los dos comandos solo ejecutan fases distintas de ella.

## 2026-08-17: Harness v2.1 — optimización 80/20 para founders no técnicos
- **Decisión:** cuatro mejoras a la interfaz con el founder: (1) `/empezar` como puerta de entrada humana (dónde está el proyecto + el único paso siguiente); (2) "probalo vos" al cerrar cada milestone — el agente levanta la app, sirve el link y el milestone no se archiva sin la confirmación del owner (nunca a nivel spec: sería mucho); (3) toda pregunta técnica se sirve digerida — qué significa en llano, pros/contras y una opción sugerida; (4) borrar `QUALITY.md`.
- **Razón:** análisis de primeros principios + Pareto: el núcleo del método ya estaba; los gaps eran de interfaz humana — el founder no puede leer código, solo puede juzgar usando la app y con explicaciones en llano, y no sabe levantar servers.
- **Alternativa rechazada:** ritual de "cuando algo se rompe" (descartado por el owner) · renombrar los comandos a verbos de founder (se mantienen los nombres actuales por el material del curso) · "probalo vos" por spec (demasiada fricción).
- **Constraint:** la regla de trade-offs vive en las skills (doctrina); el "probalo vos" en CLAUDE.md y las plantillas (flujo) — sin duplicar entre capas.

## 2026-08-17: Simplificar el harness (v2 — rápido y en llano)
- **Decisión:** reducir el equipo de 11 a 6 roles (el Programador `builder` implementa Y verifica; el Planificador `planner` hace plan + specs en un comando `/new-plan`; DevOps absorbe el chequeo de costo), dejar 2 rondas de preguntas en todo el flujo, un solo archivo de arquitectura (`decisiones.md`), estado en un solo lugar (la tabla del plan), plantillas cortas cuyas secciones no aplicables se borran, y todos los documentos visibles en lenguaje llano con anexos técnicos para los agentes. Tres capas con responsabilidad única: skill = CÓMO, agente = QUIÉN, command = ejecución — sin duplicar contenido entre capas.
- **Razón:** en la demo en vivo el harness v1 era lentísimo: ~22.500 palabras de instrucciones, ~18 subagentes mayormente en serie, hasta 11 rondas de preguntas y estado por triplicado. Y el usuario final no es técnico.
- **Alternativa rechazada:** mantener el harness completo y agregar un modo `--fast` aparte — doble mantenimiento; y eliminar las skills moviendo la doctrina a los commands — rompía la separación CÓMO/QUIÉN/ejecución.
- **Constraint:** toda doctrina vive en su skill y se referencia (no se copia) desde commands y agentes; el punto de retorno pre-cambio es el commit `42eb607`.

## <AAAA-MM-DD>: <Título corto de la decisión>
- **Decisión:** <qué se decidió>
- **Razón:** <por qué>
- **Alternativa rechazada:** <qué se descartó y por qué>
- **Constraint / consecuencia:** <restricción que esto impone hacia adelante>

## 2026-01-15: Usar Redis para cachear preferencias de usuario
- **Decisión:** cachear las preferencias de usuario en Redis.
- **Razón:** alta frecuencia de lectura (cada llamada de API), datos chicos.
- **Alternativa rechazada:** vista materializada en PostgreSQL — la alta frecuencia de cambio no justifica el costo de mantenimiento.
- **Constraint:** TTL de cache de 5 minutos, invalidación activa al escribir.
