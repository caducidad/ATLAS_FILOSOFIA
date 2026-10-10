# Atlas de la Filosofía

Mapa interactivo de la historia de la filosofía. Autores, obras, conceptos y tesis se presentan como una red navegable que el estudiante explora y va «despejando» a su ritmo, como en un juego de exploración.

**Autor:** Juan Domínguez Gallego

> Estado: en desarrollo. Ahora mismo el repositorio contiene los datos del piloto de la Antigüedad completo: tradiciones china, india y grecorromana y sabidurías del Próximo Oriente y doce grandes preguntas con las respuestas de cada tradición (365 nodos y 596 relaciones), además de la documentación del esquema. El primer prototipo de la app está en `app/`.

## Qué es

- **Una red, no una lista.** Cada autor, obra, concepto o tesis es un nodo, y las relaciones entre ellos tienen nombre: «fue maestro de», «critica», «desarrolla», «es paralelo a»…
- **Varias tradiciones en pie de igualdad.** El piloto de la Antigüedad cubre Grecia y Roma, India y China, con un carril de sabidurías del Próximo Oriente.
- **Rigor visible.** Las fechas se dan como horquillas, la historicidad dudosa se indica, cada relación lleva su grado de certeza y cada anécdota su fuente y su fiabilidad.
- **Dos niveles de lectura.** Un resumen accesible para bachillerato y una profundización para universidad y docencia.
- **Juego que orienta, no que bloquea.** Niebla de guerra sobre el mapa, retos generados a partir de las relaciones y anécdotas coleccionables. Todo el contenido es siempre accesible.
- **Sin servidores ni cuentas.** Funciona entero en el navegador; el progreso de cada lector se guarda en su propio navegador y puede exportarse e importarse.

## Estructura del repositorio

```
atlas.json      Configuración del atlas y sus extensiones del esquema común
app/            Prototipo de la app (motor común en pruebas): index.html, motor.js y estilo.css
datos/          Datos de la red, un archivo por tradición y época
  tematicas.json      Las 14 temáticas
  china-antigua.json  Piloto de la Antigüedad: tradición china
  india-antigua.json  Piloto de la Antigüedad: tradición india
  grecorromana-antigua.json  Piloto de la Antigüedad: Grecia y Roma
  proximo-oriente-antiguo.json  Piloto de la Antigüedad: Egipto, Mesopotamia, Irán e Israel
herramientas/
  validar.py          Ejecuta el validador común del núcleo sobre este atlas
docs/           Documentación
  esquema.md          Lo propio de la filosofía (el resto está en el esquema base del núcleo)
  navegacion.md       Puntos de vista, pantallas y qué necesita cada uno de los datos
  blogger.md          Cómo publicar el atlas en Blogger con GitHub Pages
```

## La colección Atlas

Este atlas forma parte de una colección (Filosofía, Psicología, Sociología y Antropología) que comparte un núcleo común: el esquema base, el catálogo de relaciones, el validador y, más adelante, el motor de la app. Está en [ATLAS_NUCLEO](https://github.com/caducidad/ATLAS_NUCLEO).

## Validar los datos

Antes de subir cambios en `datos/`, ejecuta:

```
python3 herramientas/validar.py
```

Usa el validador del núcleo, así que necesita el repositorio ATLAS_NUCLEO clonado junto a este (en una carpeta `atlas_nucleo` o `ATLAS_NUCLEO`) o su ruta en la variable de entorno `ATLAS_NUCLEO`. Comprueba campos obligatorios, valores admitidos, fechas, enlaces, relaciones, referencias de las anécdotas e imágenes. Solo necesita Python 3, sin instalar nada más.

## Licencias

- **Textos y datos** (carpetas `datos/` y `docs/`): [Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)](LICENSE-DATOS.md). Puedes reutilizarlos y adaptarlos citando la autoría y compartiendo tus versiones con la misma licencia.
- **Código** (resto del repositorio): [licencia MIT](LICENSE).

## Cómo citar

> Domínguez Gallego, Juan. *Atlas de la Filosofía*. 2026. https://github.com/caducidad/atlas_filosofia
