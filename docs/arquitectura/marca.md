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

**Todos los valores de este documento son de modo claro**, derivados sobre `#FFFFFF`. El MVP no
tiene modo oscuro y no es una decisión pendiente: si alguna vez se agrega, estos valores se
recalculan completos.

### Bordes y divisores

| Uso | Color | Hex | Justificación |
|---|---|---|---|
| Borde sutil / divisor entre filas | Gris neutro claro | `#E6E8EA` | Separa filas sin dibujar una grilla. |
| Borde marcado / límite de tarjeta, pie del encabezado de tabla | Gris neutro | `#D6D8DB` | Cierra bloques y ancla el encabezado; un paso por encima del divisor, no dos. |
| Borde de control (input, select, botón secundario) | Gris medio | `#7E8691` | 3.68:1 sobre superficie — el único borde con mínimo de contraste exigible, porque es lo que identifica dónde se escribe. |

Los dos primeros son decorativos y no tienen mínimo de contraste; el tercero es funcional y por
eso rompe la escala. **No se usan colores con transparencia para bordes:** el alfa deriva su
resultado del fondo, así que el mismo divisor cambiaría de valor entre una fila normal, una en
hover y el encabezado — se lee como inconsistencia justo donde más se nota.

### Estados de interacción

| Uso | Color | Hex | Justificación |
|---|---|---|---|
| Hover de fila clickeable y de control secundario | Primario al 8% | `#EDEFF2` | Un solo tinte para todo lo clickeable; escanear una lista larga no debería requerir fijar la vista. |
| Fila seleccionada / control presionado | Primario al 14% | `#DFE3E9` | Un paso por encima del hover, misma familia: marca "esta es la fila que miro" sin color nuevo. |
| Primario — hover | Azul petróleo claro | `#27496F` | Aclara en vez de oscurecer: el primario ya es oscuro y bajarlo no se percibe. |
| Primario — active / presionado | Azul petróleo profundo | `#16293F` | El par del hover hacia abajo; da la sensación de botón hundido. |
| Anillo de foco (teclado) | = Primario | `#1E3A5F` | 11.50:1 sobre superficie y 8.93:1 sobre la fila seleccionada: visible en todos los fondos de la app sin un token aparte. |

### Semánticos para texto y chips

| Uso | Color | Hex | Justificación |
|---|---|---|---|
| Ámbar cuando es **texto** | Ámbar terroso oscuro | `#8F5A1C` | `#B5762B` da 3.76:1 y no alcanza para texto. Mismo tono, un paso más oscuro: 5.76:1. |
| Fondo de chip — "lo tiene" | Éxito al 10% | `#EAF0ED` | Chip legible sin borde; el verde encima da 5.45:1. |
| Fondo de chip — "no lo tiene todavía" | Ámbar al 10% | `#F4EFE8` | El ámbar oscuro encima da 5.03:1. |
| Fondo de chip — error técnico | Error al 10% | `#F7EBEA` | El rojo encima da 5.09:1. |
| Relleno de skeleton (filas cargando) | = Borde sutil | `#E6E8EA` | Reusa el borde sutil en vez de sumar un token. |

`#B5762B` **no se retira**: sigue siendo el ámbar para puntos de estado, íconos y gráficos, donde
3.76:1 sí cumple. El cambio aplica solo cuando el ámbar es texto.

## Reglas de interfaz

- **Filas alternadas (zebra): no.** Las tablas del MVP tienen 3-4 columnas; el zebra sirve para
  seguir la línea en tablas anchas y acá no hay ancho que seguir. Lo que sí hace es competir con
  el hover y con la fila seleccionada. La densidad se resuelve con divisor de 1px y alto de fila.
- **Hover solo donde hay clic.** El historial de versiones es registro, no lista navegable: sin
  hover y sin `cursor-pointer`. Un hover que no lleva a ningún lado es una promesa falsa.
- **Foco visible, una sola regla global:** `outline: 2px solid #1E3A5F; outline-offset: 2px` en
  `:focus-visible`, nunca anulada sin reemplazo. El offset es lo que la hace funcionar también
  sobre el botón primario. Sin transición: instantáneo. En listas, la fila toma el tinte de
  seleccionada con `:focus-within`, para que recorrer con teclado se vea igual que con mouse.
- **"Deshabilitado" y "ocupado" son estados distintos.** Deshabilitado: `opacity: .6` y
  `cursor: not-allowed`. Ocupado (guardando, verificando): **color pleno**, con `aria-busy` y los
  clics bloqueados — el label comunica estado y el usuario necesita poder leerlo.
- **Radios:** 6px controles e inputs · 8px tarjetas y paneles · 4px chips · 0 en celdas de tabla.
- **Elevación:** las tarjetas se delimitan con **borde, no con sombra**. La sombra queda para lo
  que flota sobre contenido (dropdowns, popovers, confirmaciones):
  `0 4px 12px -2px rgb(26 29 33 / 0.12)` más borde marcado. Sombra en tarjetas estáticas es el
  gesto que las hace ver como cards de landing.
- **Densidad de tabla:** fila 40px (padding 10px vertical / 16px horizontal), encabezado 36px.
  Celda 14px; encabezado 12px medium en texto secundario, **sin mayúsculas ni letter-spacing** —
  el header espaciado en mayúsculas es marca de template.
- **Transiciones:** 120ms ease-out para fondo y borde, nada más. Sin animación de entrada de
  filas y sin shimmer en diagonal en el skeleton (pulso lento de opacidad) — el shimmer es
  exactamente el tell que este documento manda evitar.
- **El color nunca va solo.** "Lo tiene" y "no lo tiene todavía" llevan además glifo o palabra:
  verde y ámbar se diferencian muy poco en luminancia para quien tiene deuteranopia.

**Supuesto de layout sobre el que se derivaron estos valores:** las tablas viven sobre
`superficie` (`#FFFFFF`), dentro de un panel con borde, apoyado sobre el `fondo` (`#F7F8FA`). Si
alguna pantalla usa tabla a sangre directamente sobre el fondo, los divisores hay que
recalcularlos — `#E6E8EA` sobre `#F7F8FA` casi desaparece.

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
