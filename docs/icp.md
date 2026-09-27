# ICP — ReleaseView

> **Estado: Parcialmente validado (N=1 — experiencia propia del owner).**
> Última actualización: 2026-09-08.
>
> Núcleo únicamente (sin módulos Marketing/Ventas/Social Listening — se agregan si hacen falta más adelante).

---

## 1. Snapshot

| Campo | Valor |
|---|---|
| **Código** | ICP-01 — "El PM que no puede responder qué versión tiene cada cliente" |
| **Perfil en una línea** | PM, Product Owner o líder técnico que gestiona un SaaS o agente de IA desplegado en múltiples clientes con versiones/features divergentes, y hoy depende de búsqueda manual en Azure DevOps + el líder técnico para saber el estado de cada uno. |
| **Estado** | Parcialmente validado (N=1 — experiencia propia del owner) |
| **Roles** | PM, Product Owner, líder técnico |
| **Tipo de organización** | Consultora de IT o empresa de software que gestiona un producto (SaaS o agente de IA) desplegado en múltiples clientes |
| **Nivel de conciencia (Lente A)** | Problem-aware *(Estimado)* — siente y describe el dolor con precisión, pero no mencionó estar evaluando soluciones todavía |

## 2. Perfil y contexto

Es un PM, Product Owner o líder técnico responsable de un producto (SaaS o agente de IA) que corre en múltiples instalaciones/clientes, cada uno con su propia versión y set de features habilitados. Trabaja en una consultora de IT que despliega ese producto para clientes externos, o en una empresa de software que vende su propio SaaS a múltiples cuentas — en ambos casos la unidad real de gestión no es "el producto", es "el producto × cada cliente". Vive rodeado de herramientas de desarrollo (Azure DevOps, Jira) que registran tickets y sprints, pero nunca fueron pensadas para responder "¿en qué estado está cada cliente ahora".

**La trampa que lo define:** es el punto de contacto de negocio para una pregunta que solo tiene respuesta técnica — cuando alguien pregunta "¿qué versión tiene fulano", la respuesta vive en Azure DevOps y en la cabeza del líder técnico, no en un lugar que él controle directamente. Terminó siendo el traductor entre desarrollo y cliente sin que nadie le haya dado las herramientas para traducir. *(Estimado.)*

## 3. Jobs To Be Done (JTBD)

| Tipo | JTBD |
|---|---|
| **Funcional** | "Cuando un cliente pregunta por su versión/features, o se acerca un release, quiero ver de un vistazo qué tiene activo cada cliente, para poder responder o planificar sin cruzar herramientas." |
| **Emocional** | Quiere sentirse en control y no ser sorprendido — dejar de sentir que "no sabe algo que debería saber de memoria". |
| **Social** | Quiere ser visto como quien tiene el producto bajo control, no como quien tiene que "confirmarte después". |

**Priorizado:** el funcional, disparado en dos momentos (pregunta inesperada de cliente + preparación de release). Es el peor resuelto hoy porque, aunque la información técnicamente existe en Azure DevOps, (a) hay que reconstruirla a mano cruzando tickets/sprints, y (b) quien la conoce en detalle es el líder técnico, así que el PM/PO muchas veces depende de él para poder responder. *(Validado — experiencia directa del owner.)*

## 4. Problema núcleo

**La información de qué versión y qué features tiene activo cada cliente vive en Azure DevOps, pero en una forma pensada para gestionar trabajo (tickets, sprints), no estado por cliente — y solo el líder técnico la tiene traducida en la cabeza. Cada vez que alguien más necesita esa respuesta, hay que reconstruirla a mano o esperar a que esa persona esté disponible.**

Error de razonamiento: se asume que si los datos "están en algún lado" (Azure DevOps) el problema es de búsqueda, no de diseño — pero una herramienta de gestión de trabajo nunca va a responder naturalmente "qué tiene activo el cliente X", sin importar cuánto se busque, porque no fue construida para esa pregunta. *(Estimado.)*

## 5. Dolores

**Económicos:**
- 1-2 horas perdidas antes de cada release cruzando información entre Azure DevOps, correos y chats para armar la lista de qué cliente recibe qué. *(Validado.)*
- Riesgo de error humano en esa lista, que puede derivar en desplegar mal (o no desplegar) algo a un cliente. *(Estimado.)*
- Para responder a un cliente hace falta recurrir al líder técnico, porque es quien tiene el detalle fino en la cabeza — esa dependencia ya ocurrió, no es hipotética. *(Validado.)*
- Si esa persona no está disponible en el momento, nadie más puede responder rápido — riesgo latente sobre esa misma dependencia. *(Hipótesis — a validar.)*

**Emocionales:**
- Vergüenza operativa: no poder responder en el momento a un cliente y tener que decir "te confirmo después". *(Validado.)*
- Estrés/fatiga los días previos a un release — "trabajo que nadie quiere hacer al final de la semana". *(Validado.)*

**Sociales / identidad:**
- Queda mal frente al cliente como alguien que debería saber el estado de su propio producto de memoria y no puede. *(Validado.)*

## 6. Situación disparadora

Dos triggers concretos *(Validado — experiencia directa del owner)*:
1. **Un cliente pregunta directamente** qué versión/features tiene activos, o cuándo recibe el próximo despliegue — dispara la vergüenza operativa, en el momento, y la necesidad de recurrir al líder técnico.
2. **Se acerca una fecha de release** — dispara el cruce manual de información para armar la lista de qué cliente recibe qué, con el estrés de saber que es propenso a error.

## 7. Barreras y creencias

| Creencia errónea | Verdad que ofrecemos | Microacción |
|---|---|---|
| "Esto ya está en Azure DevOps, solo hay que mirar bien" | Azure DevOps registra trabajo (tickets, sprints), no estado desplegado por cliente — nunca va a responder "qué tiene activo el cliente X" sin trabajo manual de alguien que sepa traducirlo | Cronometrar en vivo cuánto tarda alguien (que no sea el líder técnico) en responder esa pregunta usando solo las herramientas actuales |
| "Mientras el líder técnico esté, no hay problema" | La dependencia de una sola persona no escala con el número de clientes ni sobrevive a que esa persona esté ocupada, de vacaciones o se vaya | Contar cuántas veces en el último mes alguien tuvo que "esperar" a esa persona para responder algo |
| "Necesito una herramienta enterprise de release management" | El problema es específico (visibilidad de versión/features por cliente), no gestión de releases end-to-end — se resuelve con un panel simple, no con una suite | Mapear las 3 preguntas de negocio que hoy no se pueden responder rápido sin esa persona |

**Barrera de entrada:** falta de tiempo para "parar a poner esto en orden" cuando hay que seguir apagando incendios de release en release. *(Estimado.)*

## 8. Lenguaje que resuena

**Frases reales** *(lenguaje supuesto — a validar; son formulaciones propias del owner, todavía no citas textuales de terceros)*:
- "te confirmo después"
- "qué cliente recibe qué"
- "cruzar información entre herramientas, correos y chats"

**Conceptos que conectan:** "una sola fuente de verdad del estado por cliente"; "que no dependa de una sola persona"; "que no dependa de la memoria de nadie".

**Registro/tono:** directo, operativo, orientado a evitar quedar mal frente al cliente — no growth, no "plataforma enterprise".

**Nunca usar con este ICP:** jerga de release management enterprise pesada (ITIL, change advisory board, CMDB) — el ICP no se identifica con proceso corporativo grande, se identifica con "necesito responder esto rápido, hoy".

---

## Los tres tests

1. **Reconocimiento:** sí — el dolor descrito (vergüenza al no poder responder en el momento, 1-2 horas de cruce manual antes de cada release, dependencia de una sola persona) es específico y reconocible. No es "gente ocupada" genérico.
2. **Evidencia:** gran parte del núcleo está validado por experiencia directa del owner (N=1). Ver "Supuestos abiertos" abajo para lo que falta confirmar con más casos.
3. **Accionabilidad:** sí — el lenguaje es copiable a copy ("que no dependa de una sola persona"), las señales son chequeables en una conversación (cronometrar cuánto tarda alguien en responder sin el líder técnico), y los dolores son convertibles en hooks directos.

## Supuestos abiertos

🔴 **Generalización más allá del caso propio:** todo lo "Validado" acá es evidencia de un solo caso (el del owner). Falta confirmar que el mismo patrón (dependencia del líder técnico + cruce manual antes de release) se repite en otras organizaciones antes de asumirlo como universal del ICP.

🔴 **Un solo ICP para consultora y empresa de software:** se decidió tratarlos como un mismo perfil porque comparten rol y JTBD, pero si en la práctica sus prioridades divergen (ej. la consultora gestiona relación contractual con terceros, la empresa de software gestiona su propio roadmap), podría haber dos ICPs escondidos en uno.

🔴 **Nivel de consciencia real:** se marcó "Problem-aware" como estimación. Si el cliente objetivo ya está evaluando herramientas de release management, sería "Solution-aware" y cambiaría el copy (agitar el dolor vs. comparar soluciones).
