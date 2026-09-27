# Marca — identidad visual y tono

> **Dueño de:** colores, tipografía y voz de los textos de ReleaseView. Propuesto por el Diseñador
> de Producto a partir de `docs/icp.md` §8 (Lenguaje que resuena), consolidado sin cambios de
> fondo por el Arquitecto.

Herramienta interna B2B, de uso diario bajo presión operativa (día de release, cliente
preguntando en el momento). El tono transmite control y claridad — no "producto que se vende":
quien la usa ya la tiene, no hay que convencerlo de nada. Se asume uso en desktop/navegador
(contexto de trabajo), no mobile-first.

## Personalidad de marca

ReleaseView se comporta como **el compañero que sí sabe la respuesta**. No impresiona, responde.
Cada pantalla se siente como abrir una libreta bien ordenada, no como entrar a un dashboard de
ventas. Referencia de categoría: herramientas internas de ingeniería (Linear, paneles de status,
admin panels bien hechos) — no herramientas de marketing/growth ni landing pages de SaaS consumer.

**Lo que ReleaseView es:** directo, calmo, con autoridad tranquila.
**Lo que ReleaseView NO es:** entusiasta, "amigable" de forma forzada, corporativo pesado (cero
jerga ITIL/CAB — el ICP la rechaza explícitamente, `docs/icp.md` §8).

## Paleta de color

| Uso | Color | Hex | Justificación |
|---|---|---|---|
| Primario / acciones | Azul petróleo oscuro | `#1E3A5F` | Estabilidad y control operativo, sin ser el azul de stock (`#007BFF`). |
| Fondo base | Gris muy claro | `#F7F8FA` | Neutro — no compite con los datos; esto es lectura rápida, no vidriera. |
| Superficie / tarjetas | Blanco puro | `#FFFFFF` | Contraste limpio contra el fondo gris. |
| Texto principal | Gris carbón | `#1A1D21` | Más suave que negro puro — menos fatiga en uso diario. |
| Texto secundario | Gris medio | `#5B6470` | Metadatos, timestamps, ayuda contextual. |
| Éxito / "lo tiene" | Verde bosque (apagado) | `#2F6B4F` | Deliberadamente no saturado — coherente con el tono calmo, no "celebratorio". |
| Alerta / "no lo tiene todavía" | Ámbar terroso | `#B5762B` | Señala sin gritar "error" — la ausencia de un feature es información, no una falla. |
| Error real | Rojo ladrillo | `#B3392E` | Reservado a errores técnicos, para no confundirse con "cliente sin feature". |

**Evitar:** gradientes violeta-a-celeste (el default visual de generador de landing de IA),
azules de framework sin tocar, cualquier "vibrant/gradient mesh" — es lo primero que delata un
template sin decisiones propias.

## Tipografía

- **Interfaz / texto general:** **Inter** (Google Fonts) — pensada para UI densa de datos,
  legible en tamaños chicos (filas de tabla, listas de clientes).
- **Datos tabulares / versiones:** **IBM Plex Mono** (Google Fonts) para números de versión
  (`2.4.1`) e identificadores — el monoespaciado ayuda a comparar versiones de un vistazo entre
  filas.
- **Evitar:** fuentes decorativas o "friendly-rounded" (Poppins, Quicksand) — restan la seriedad
  operativa que el ICP necesita sentir.

## Voz y tono de los textos

1. **Directo, sin relleno.** "Este cliente no tiene el feature X" en vez de "Parece que todavía
   no hemos podido confirmar la disponibilidad de este feature para este cliente."
2. **Vocabulario del ICP, no genérico.** "Qué cliente recibe qué", "versión activa", "features
   habilitados" — nunca "deployment matrix" ni "feature flags rollout status".
3. **Nunca jerga enterprise pesada.** Cero "change advisory board", "CMDB", "ITIL".
4. **Los estados vacíos y de error hablan como una persona, no como un log.** "No se pudo cargar
   la lista de clientes" en vez de "Error 500: fetch failed."
5. **Confianza sin exceso.** Sin "¡Todo en orden!" con signos de exclamación — tono calmo y
   factual, refuerza que el usuario tiene el control.

| Situación | Evitar | Usar |
|---|---|---|
| Estado vacío inicial | "¡Empecemos! Agregá tu primer cliente 🎉" | "Todavía no cargaste ningún cliente." |
| Error de carga | "Oops, algo salió mal" | "No se pudo cargar la lista de clientes. Reintentar." |
| Confirmación de guardado | "¡Genial! Cliente guardado con éxito" | "Cliente guardado." |
| Filtro sin resultados | "No hay resultados :(" | "Ningún cliente corresponde a este filtro todavía." |

## Qué hace que NO parezca un prototipo genérico de IA

Señales a vigilar en la auditoría de UX antes de publicar (`ux-reviewer`, modo auditor):
- Sin gradientes violeta/celeste ni emojis decorativos en botones o headers.
- Sin ilustraciones de stock en estados vacíos — solo texto claro + una acción.
- Densidad de información real, no espaciado tipo landing page — es una tabla de trabajo.
- Sin copy motivacional ni signos de exclamación en cascada.
- Paleta y tipografía consistentes en toda la app — nada de mezclar la fuente por defecto del
  framework en una pantalla y la elegida en otra.
