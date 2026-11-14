# ARTEMIS · Portal del equipo (V13) con Firebase

`ARTEMIS_Portal_V13.html` reúne en una sola página tres pestañas, guardadas en la misma base de datos **Cloud Firestore**. Los tres miembros del equipo ven todo en tiempo real.

- **Tablero**: misiones y tareas, igual que el V12.
- **Bitácora**: la bitácora del hackatón, editable. Ahí se agregan las actividades de cada día.
- **GDD V11**: el documento maestro, editable por secciones.

Las versiones anteriores se conservan sin cambios, como pide la bitácora: `ARTEMIS_Tablero_V11.html`, `ARTEMIS_Tablero_V12_Firebase.html` y los dos `.docx` originales.

## Uso

1. Abran **https://artemis-spaceapps-2026.web.app**, en computador o celular. Sin sesión, la página es de solo lectura.
2. Elijan su nombre en **«Soy»**. No hace falta iniciar sesión: con eso ya pueden editar el Tablero, la Bitácora y el GDD. Cada cambio queda registrado con ese nombre y la hora del servidor.
3. **Tablero**: cambien estado, responsable o evidencia. El indicador de arriba muestra *Sincronizado*, *Guardando…* o *Sin conexión*.
4. **Bitácora · nueva entrada**: en «3. Cronología de actividades», pulsen **+ Nueva entrada**. El número (E15, E16…) se asigna solo y no se repite aunque dos personas guarden a la vez. Los campos siguen el formato de la sección 5:
   - fecha y participantes;
   - necesidad, acción e IA o prompt usado;
   - resultado, evidencia, estado, nivel de respaldo y próximo paso;
   - tareas del tablero relacionadas (por ejemplo M01, B7). Estas tareas quedan enlazadas en ambos sentidos.
5. **Editar una sección o entrada**: pulsen **Editar**. Cada vez que alguien guarda, se crea una versión nueva con autor y hora del servidor. Las versiones anteriores y el texto original del Word se ven en **Versiones**, y nadie puede borrarlas.
6. **Formato de las secciones**:
   - una línea en blanco empieza un párrafo nuevo;
   - `### ` crea un subtítulo;
   - `- ` crea una viñeta y `1. ` una lista numerada;
   - `**negrita**` pone el texto en negrita;
   - `| a | b |` arma una tabla;
   - los enlaces `https://…` se activan solos.
7. **Descargar .md** guarda la bitácora o el GDD actual en Markdown, por ejemplo para subirlo a GitHub. **Imprimir / PDF** genera una versión limpia para entregar.
8. En el GDD, la sección 7 muestra además una tabla con el estado en vivo de M01–M20 tomado del tablero.

## Orden del tablero

1. **★ Recursos oficiales del reto · NASA**: las 20 misiones M01–M20, en el orden de la pestaña *Resources* de la página del reto, cada una con su enlace NASA/NSSDCA. El reto pide contar la historia de «parte o todo» este equipo, así que no es una lista obligatoria, pero el equipo la prioriza primero.
2. **Plan de mejoras y tareas de agentes**: tareas A, B, C y D.

## Datos técnicos

| Elemento | Valor |
|---|---|
| Proyecto Firebase | `artemis-spaceapps-2026` (ARTEMIS Space Apps 2026) |
| Datos | `boards/artemis-v11/` → `items` y `history` (tablero) · `sections` y `sectionVersions` (bitácora y GDD) · `log` y `logVersions` (entradas de bitácora) |
| Contenido original | Lo que nadie ha editado se muestra desde el texto del Word, incluido en la página. En Firestore solo se guardan las ediciones |
| Regenerar el portal | `node scripts/build-portal-v13.mjs` (en la raíz del proyecto). Usa el V11 y `scripts/portal/` (`app.js`, `portal.css`, `shell.html`, `data/*.json`) |
| Volver a extraer un Word | `python scripts/docx2md.py <archivo.docx> scripts/portal/data/<nombre>.json` |
| Publicar la web | `firebase deploy --only hosting`. Copia el portal a `tablero-web/index.html` antes de publicar |
| Publicar reglas | `firebase deploy --only firestore:rules` |

## Seguridad

- **Lectura**: abierta. La página tiene `noindex` para que no aparezca en buscadores. Cualquiera con el enlace puede leerla, así que no escriban ahí datos privados.
- **Escritura**: por decisión del equipo, cualquiera con el enlace puede editar eligiendo uno de los cinco nombres del equipo, sin iniciar sesión. La autoría es autodeclarada, así que compartan el enlace solo dentro del equipo.
- **Validación**: las reglas validan IDs, estados, tamaños y la hora del servidor.
- **Historial**: nadie puede borrar elementos, secciones ni entradas, y nadie puede modificar ni borrar el historial o las versiones.
- **Correos**: `firestore.rules` contiene los correos del equipo. **No lo suban a repositorios públicos.**
- **V12**: el `ARTEMIS_Tablero_V12_Firebase.html` quedó como versión histórica; para trabajar se usa el portal V13.
