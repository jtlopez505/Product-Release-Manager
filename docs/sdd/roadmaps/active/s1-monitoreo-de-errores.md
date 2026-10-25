<!--
Plan de una herramienta auxiliar (no es un milestone del PRD): /instalar-sentry.
LA TABLA DE ABAJO ES EL ÚNICO LUGAR DONDE VIVE EL ESTADO de las specs.
-->

# S1 · Monitoreo de errores con Sentry — plan

## 1. Qué logramos con esta pieza

Que cuando algo falle en `https://releaseview.vercel.app` —el servidor, el navegador o una consulta
a la base— el error quede registrado en Sentry con la pantalla donde pasó, y llegue un aviso sin que
nadie tenga que ir a mirar los logs de Vercel. **No es un milestone del PRD:** es una herramienta
auxiliar del método (`CLAUDE.md`, "Herramientas auxiliares"), así que no suma condiciones a
`docs/prd.md`.

## 2. Qué queda afuera

- **Source maps.** Subirlos exige un segundo secreto (`SENTRY_AUTH_TOKEN`) en el build. Sin ellos, los
  stack traces del código publicado salen minificados; el mensaje, la ruta y el contexto sí se ven.
  Se suma después si hace falta (cambio chico y aislado).
- **Trazas de rendimiento, grabación de sesiones y logs.** Gastan cuota y capturan más datos de los
  que un piloto de 1-2 personas necesita. Solo errores.
- **Un túnel propio para esquivar bloqueadores de anuncios.** Los eventos del navegador van directo a
  Sentry; un bloqueador puede cortarlos. Se tolera en un piloto; además un túnel tendría que pasar por
  el portón (`proxy.ts`) y es más superficie.
- **Alertas elaboradas, dashboards, release tracking.** Con el aviso por mail por defecto alcanza.
- **PostHog / analítica de producto.** Es otra herramienta (`/instalar-posthog`).

## 3. Preguntas y riesgos

**Resueltas antes de planear:**

- *¿Sencilla o compleja?* **Sencilla:** un solo framework estándar (Next.js 16), SDK oficial
  (`@sentry/nextjs` 11.x declara soporte para Next `^16`), sin workers ni monorepo. Una sola ficha.
- *¿Cómo se captura el error que la app atrapa?* Es el punto delicado. **17 sitios** hacen
  `try/catch` + `console.error(...)` + un "No se pudo cargar…" en pantalla —incluido el que falló el
  día del primer deploy—, y un Sentry instalado "de fábrica" **no los ve**, porque no son
  excepciones sin atrapar. Se resuelve con la integración de consola de Sentry (todo `console.error`
  llega como evento), **sin tocar esos 17 archivos** (sin refactor colateral).
- *¿Una variable o dos?* **Una:** `NEXT_PUBLIC_SENTRY_DSN`, que sirve al servidor y al navegador. Es
  **opcional**: sin ella Sentry queda apagado y la app funciona igual (no entra en
  `CLAVES_OBLIGATORIAS`).

**Riesgos:**

- **Mandar a un servicio externo algo que no debe salir** (la cookie de sesión, la contraseña, una
  connection string dentro de un mensaje de error). Mitigado con `sendDefaultPii: false` y un filtro
  propio, probado con un evento de ejemplo (criterio #5 de la ficha).
- **Pasarse de la cuota gratuita** (5.000 errores/mes en el plan Developer, a verificar en la
  cuenta). Un error en bucle puede gastarla en horas; con un panel de 1-2 personas es poco probable.
  Se mira en el primer mes.
- **El DSN no es un secreto fuerte** (viaja en el JavaScript del navegador por diseño y solo permite
  *enviar* eventos), pero se trata igual como variable de entorno (regla #2).

## 4. Reglas del proyecto que toca

- **#5** — siempre: terminada = las 3 verificaciones en verde **y un error de prueba visible en
  Sentry**.
- **#2** — el DSN sale de una variable de entorno; nunca va en el código ni en el repo.
- **#3** — Sentry tiene cuota gratuita: se nombra el límite y se cruza con `costos.md`.

## 5. Las piezas de trabajo (ESTA TABLA ES EL ESTADO)

| ID | Pieza | Estado | Depende de | Ficha |
|---|---|---|---|---|
| S1-01 | Sentry captura los errores del servidor, del navegador y los que la app atrapa | 🔵 en curso | — | `docs/sdd/specs/S1-01-sentry-captura-errores.md` |

## 6. Cuándo está terminado

- [ ] La fila de la tabla en ✅ (con sus 3 verificaciones en verde, regla #5).
- [ ] **Un error de prueba apareció en Sentry**, confirmado por el owner con sus ojos.
- [ ] `NEXT_PUBLIC_SENTRY_DSN` cargada en Vercel (Production **y** Build) y el sitio publicado sigue
      respondiendo.
- [ ] `docs/arquitectura/sentry.md` escrito, `README.md`, `secretos.md` y `costos.md` al día.
- [ ] Este plan movido a `docs/sdd/roadmaps/archive/`.
