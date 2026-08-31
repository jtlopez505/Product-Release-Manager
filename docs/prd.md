<!-- PLANTILLA — PRD (el *qué*: alcance, orden y qué significa «terminado»). Copiá y completá los placeholders <...>. Borrá las notas «› guía:» al terminar. -->

# <Nombre del producto> — PRD

> **Este documento manda sobre el *qué*: qué construimos, en qué orden, y qué significa
> «terminado».** El *cómo* técnico vive en `docs/arquitectura/` (un documento por tema) y no se decide acá.
>
> **Última revisión:** `<AAAA-MM-DD>`

---

## 1. Qué es `<el producto>`

**`<El producto>` es `<qué es, en una frase>`.**

- **Para quién:** `<quién lo usa>`.
- **Qué promete:** `<el cambio concreto en la vida del usuario — antes/después>`.
- **Qué problema resuelve:** `<el dolor real>`.

## 2. El MVP — un recorrido completo, no una lista de features

› guía: el MVP se acepta por UN recorrido de valor que corre de punta a punta, una vez. Todo lo
demás son condiciones necesarias.

```
<paso 1 — lo que hace el usuario>
  → <paso 2>
  → <paso 3 — el resultado visible>
```

Si eso corre de punta a punta **una vez**, el MVP está probado.

## 3. Milestones (en orden)

› guía: cada milestone existe porque el siguiente lo necesita. Está terminado cuando TODAS sus
condiciones son verdaderas y demostrables — alguien lo ve funcionar, no alguien dice que está.
Replicá el patrón por cada milestone.

### M1 — `<nombre>`

**Objetivo:** `<qué cierra, en una línea>`.
**Por qué primero:** `<qué se rompería si empezaras por otro lado>`.

**Está terminado cuando:**
- [ ] `<condición demostrable 1>`
- [ ] `<condición demostrable 2>`

## 4. Riesgos, con su límite aceptado

› guía: un riesgo sin límite es una preocupación. Cada uno se acepta HASTA un punto explícito;
pasado ese punto, se actúa.

| # | Riesgo | Hasta dónde se tolera / qué se hace al cruzarlo |
|---|---|---|
| 1 | `<riesgo>` | `<límite y acción>` |

## 5. Fuera de alcance

Lo de abajo **no se construye en el MVP**. Es la lista explícita de lo que alguien va a pedir y
hay que saber decir que no.

- `<feature que queda para después>`
- `<lo que no se compromete>`

## 6. Preguntas abiertas

› guía: las que no bloquean el arranque pero hay que responder antes de tener usuarios reales.
Cada una con el milestone antes del cual se cierra.

1. **`<pregunta>`** — *cerrar antes de `<M#>`.*

## 7. El cómo técnico (lo completa `/arquitectura`)

› guía: esta sección la llena el Arquitecto al terminar — es el mapa de entrada a los documentos
de `docs/arquitectura/`. No la completes a mano al escribir el PRD; dejala con los placeholders.

- **Stack, deploy y costo:** `<link a docs/arquitectura/stack.md>`
- **Modelo de datos:** `<link>`
- **Secretos:** `<link>`
- **Recorrido del usuario:** `<link>`
- **Marca:** `<link>`
- **Integraciones IA / otros sistemas / auth y permisos:** `<links, o "no aplica — <por qué>">`

## 8. La regla de gestión

> **El alcance se achica quitando features (que quedan visibles en §5), nunca bajando la vara de
> «terminado».** Un milestone con condiciones recortadas parece cerrado y no lo está: la deuda
> queda escondida en un checkbox tildado.

Si algo se posterga, se anota con milestone destino y dueño, y el porqué va a
[`DECISIONS.md`](../DECISIONS.md). Lo que toque la regla #1 de la
[constitución](sdd/constitucion.md) (datos de usuarios) no se posterga nunca.
