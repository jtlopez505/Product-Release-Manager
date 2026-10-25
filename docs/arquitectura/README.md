# Arquitectura — el *cómo* del proyecto

> **Dueño de:** las decisiones técnicas del proyecto — **un documento por tema**, escritos por
> `/arquitectura`. **No cubre:** el alcance (→ [`../prd.md`](../prd.md)) · el proceso de trabajo
> (→ [`../sdd/README.md`](../sdd/README.md)).

## Mapa tema → documento

| Tema | Documento | Reglas que numera |
|---|---|---|
| Stack y deploy | [`stack.md`](stack.md) | — |
| Modelo de datos (y aislamiento entre organizaciones) | [`modelo-de-datos.md`](modelo-de-datos.md) | #1 |
| Secretos y claves | [`secretos.md`](secretos.md) | #2 |
| Recorrido del usuario | [`user-flow.md`](user-flow.md) | — |
| Marca: identidad visual y tono | [`marca.md`](marca.md) | — |
| Integraciones con IA + techo de gasto | *no aplica — ReleaseView no consume ningún modelo de IA; gestiona productos que pueden ser agentes de IA, pero eso no requiere que la app misma llame a un LLM* | #3 |
| Integraciones con otros sistemas | *no aplica en el MVP — la integración con Azure DevOps/Jira está explícitamente fuera de alcance del MVP (`docs/prd.md` §5); se crea este doc cuando se construya* | #4 |
| Autenticación y permisos | [`auth-y-permisos.md`](auth-y-permisos.md) — portón compartido (una contraseña), sin cuentas individuales | — |
| Costo mensual estimado | [`costos.md`](costos.md) | — |
| Monitoreo de errores — Sentry | [`sentry.md`](sentry.md) | — |
| Analítica de producto — PostHog *(si se instala, `/instalar-posthog`)* | `posthog.md` | — |

*(`/arquitectura` actualiza esta tabla al escribir: los condicionales que no aplican quedan
marcados acá con una línea de por qué, sin crear el archivo.)*

Reglas de esta carpeta:
- **Un hecho, un dueño:** si algo ya está explicado en un doc, se linkea, no se copia.
- Las reglas innegociables se numeran en [`../sdd/constitucion.md`](../sdd/constitucion.md) y se
  citan por `#<n>`.
- El porqué de cada decisión durable va a [`DECISIONS.md`](../../DECISIONS.md); lo que queda sin
  resolver, a la sección `## Abierto` del doc dueño.
