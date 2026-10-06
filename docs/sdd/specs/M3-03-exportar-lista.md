# M3-03 · Exportar la lista de release para Excel

**Depende de:** M3-01, M3-02

## 1. Qué queremos lograr

Que la lista de release que el PM ve en pantalla —por versión destino o por feature— se baje como
archivo y se abra bien en Excel en español: cada dato en su columna y los acentos correctos, listo
para compartir con el equipo por correo o chat. Cierra la segunda condición de M3 ("esa lista se
puede ver u exportar para compartir con el equipo") y el recorrido completo del MVP.

## 2. Qué hay hoy

M3-01 y M3-02 dejaron la pantalla "Lista de release" con sus dos criterios y la vista previa:
cada cliente con su versión actual. Lo único que falta es sacar esa lista de la pantalla. Hoy
habría que copiarla a mano.

Lo que está decidido con el owner (plan §3): el archivo se abre en **Excel en español**. Ese Excel
separa columnas con punto y coma, no con coma, y para leer bien los acentos de un CSV necesita una
marca al principio del archivo (el BOM de UTF-8). Un CSV "estándar" con coma se le abre todo en una
sola columna, y sin esa marca muestra "VersiÃ³n" en lugar de "Versión".

## 3. Qué tiene que hacer (y cómo comprobamos cada cosa)

| # | Qué hace | Cómo se comprueba |
|---|---|---|
| 1 | Cuando hay una lista con al menos un cliente, se ve un botón "Exportar CSV" junto a la vista previa | Con la lista por versión de M3-01 y con la lista por feature de M3-02, el botón aparece en los dos |
| 2 | El archivo trae exactamente los clientes de la vista previa, en el mismo orden: ni uno más, ni uno menos | Con 3 clientes en pantalla, el archivo tiene una fila de encabezado y 3 filas de datos, en el orden de la pantalla |
| 3 | Dos columnas, con encabezado: `Cliente` y `Versión actual` | La primera fila del archivo es `Cliente;Versión actual` |
| 4 | Se abre en columnas en Excel en español: el separador es punto y coma | Las filas usan `;` entre columnas; ninguna usa coma como separador |
| 5 | Los acentos se leen bien en Excel: el archivo empieza con la marca de UTF-8 | Los primeros 3 bytes del archivo son `EF BB BF`; un cliente "Peñalolén Logística" sale con sus acentos y su eñe |
| 6 | Un dato con punto y coma, comillas o salto de línea no rompe las columnas | Un cliente `Acme; "Sur"` sale en una sola celda: `"Acme; ""Sur"""` |
| 7 | **(no debe pasar)** Un dato que empieza como fórmula no se ejecuta en Excel | Un cliente llamado `=HYPERLINK("http://x")` (o que empieza con `+`, `-`, `@`, tabulador o retorno) sale con un apóstrofo adelante y Excel lo muestra como texto |
| 8 | El nombre del archivo dice qué se exportó y cuándo, y es válido en Windows | Por versión: `release-version-2.5.0-2026-10-07.csv`; por feature: `release-feature-<código, o el nombre si no tiene>-2026-10-07.csv`. Los caracteres que Windows no acepta en un nombre (`\ / : * ? " < > \|`) se reemplazan |
| 9 | El archivo se arma en el navegador, con los datos que ya están en pantalla: exportar no hace ningún pedido al servidor | Al apretar el botón no sale ningún request de red, y el archivo coincide con la vista previa aunque la base haya cambiado después de cargar la pantalla |
| 10 | Sin lista no hay botón: sin criterio elegido, con una lista vacía, sin clientes, con un feature inexistente o ante un error de carga | En cada uno de esos estados de M3-01 y M3-02, el botón no aparece |
| 11 | **(no debe pasar)** Regla #1: el archivo no puede traer datos de otra organización | El archivo sale de la misma lista que la pantalla, que M3-01 y M3-02 ya filtran por organización: se prueba que el contenido del archivo es igual a la vista previa, con dos organizaciones cargadas |
| 12 | El botón se usa con teclado y deja claro qué hace | Tab llega al botón con el foco visible y Enter descarga el archivo |
| 13 | Cumple `marca.md`: botón secundario con los tokens existentes, ningún hex suelto | `tests/estilos-de-marca.test.ts` cubre los archivos nuevos y pasa |

## 4. Qué ve el usuario

**Pantallas.** Cambia "Lista de release": suma el botón de exportar. No hay pantallas nuevas.

**El recorrido.**
1. Arma la lista como en M3-01 o M3-02 y la revisa en pantalla: esa es la vista previa.
2. Aprieta **"Exportar CSV"**, junto al título de la lista.
3. El navegador descarga, por ejemplo, `release-version-2.5.0-2026-10-07.csv`.
4. Lo abre con Excel: dos columnas, "Cliente" y "Versión actual", con los acentos bien. Si en la
   lista había un cliente que no corresponde (por ejemplo, uno ya más adelante que la versión
   destino), lo borra ahí antes de compartir.

**Estados.** El botón existe solo cuando hay lista para exportar (fila 10); los estados de carga,
error y vacío son los de M3-01 y M3-02. La descarga es inmediata: no hay estado de espera.

## 5. Qué queda afuera

- Un archivo `.xlsx` de verdad: decidido CSV generado en el navegador (`user-flow.md` §5,
  `modelo-de-datos.md`).
- Más columnas (notas, features del cliente, fecha del último cambio de versión).
- Copiar la lista al portapapeles, o enviarla por correo o chat desde la app (eso sería una
  acción hacia afuera, regla #4, que el MVP no necesita).
- Exportar sin JavaScript: el archivo se arma en el navegador, por decisión de arquitectura. Es el
  único elemento de la app que lo necesita; el resto de la pantalla sigue funcionando sin JS.
- Elegir o quitar clientes antes de exportar: se exporta la vista previa completa y se edita en
  Excel.

## 6. Reglas del proyecto que toca

- **#5** — terminada = las 3 verificaciones en verde (ver anexo).
- **#1** — el archivo se arma con la misma lista que ya muestra la pantalla, filtrada por
  organización en el servidor. Exportar no consulta nada por su cuenta, así que no tiene por dónde
  traer datos de otra organización (fila 11).

---

## Anexo técnico (para los agentes)

- **Las 3 verificaciones, en orden (regla #5):** 1) tests unitarios + linter → 2) integración (la
  pantalla servida con los dos criterios y dos organizaciones cargadas, comprobando que los datos
  que viajan al botón son los de la vista previa) → 3) el recorrido completo en un navegador real:
  descargar el archivo de verdad y leer sus bytes. Si una falla: causa raíz → arreglo mínimo →
  re-correr.
- **Test primero:** el test se escribe antes y se lo ve fallar por la razón correcta.
- **Entregables:**
  - `lib/exportar-lista.ts` (+ su test), **puro, sin base ni navegador**: dado el criterio y las
    filas (nombre, versión), devuelve el contenido del archivo y su nombre. Ahí viven el BOM, el
    separador, el escapado de `;`, comillas y saltos de línea (fila 6), la neutralización de
    fórmulas (fila 7) y el nombre seguro para Windows (fila 8). Es donde está todo el riesgo de la
    pieza, y así se prueba entero en la verificación 1.
  - El botón, en `app/lista-de-release/`: un componente de cliente que recibe las filas que la
    página ya calculó, arma el archivo con `lib/exportar-lista.ts` y lo descarga con un `Blob` y
    un link temporal. Sin ruta de API nueva ni consulta extra (fila 9).
  - El botón se integra en la vista previa compartida que dejaron M3-01 y M3-02, una sola vez,
    no una por criterio.
  - `tests/estilos-de-marca.test.ts`: extenderlo para los archivos nuevos.
- **Para la verificación 3:** con Chrome headless por CDP, `Browser.setDownloadBehavior` con
  `behavior: "allow"` y una carpeta de descarga deja bajar el archivo de verdad; después se leen
  sus bytes (BOM incluido) en lugar de confiar en lo que muestra la pantalla.
- **La fecha del nombre del archivo** es la del navegador de quien exporta: es su día de release.
- **Diseño y alcance no se deciden acá:** el cómo va a `docs/arquitectura/` (`user-flow.md` §5,
  `marca.md`); el si entra o no, a `docs/prd.md`.
