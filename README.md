# Atlas de la Filosofía

Mapa interactivo de la historia de la filosofía. Autores, obras, conceptos y tesis se presentan como una red navegable que el estudiante explora y va «despejando» a su ritmo, como en un juego de exploración.

**Autor:** Juan Domínguez Gallego

> Estado: en desarrollo. Ahora mismo el repositorio contiene los datos del piloto de la Antigüedad para las tradiciones china e india y la documentación del esquema. Grecia y Roma y el Próximo Oriente están en preparación; el código de la aplicación llegará con el primer prototipo.

## Qué es

- **Una red, no una lista.** Cada autor, obra, concepto o tesis es un nodo, y las relaciones entre ellos tienen nombre: «fue maestro de», «critica», «desarrolla», «es paralelo a»…
- **Varias tradiciones en pie de igualdad.** El piloto de la Antigüedad cubre Grecia y Roma, India y China, con un carril de sabidurías del Próximo Oriente.
- **Rigor visible.** Las fechas se dan como horquillas, la historicidad dudosa se indica, cada relación lleva su grado de certeza y cada anécdota su fuente y su fiabilidad.
- **Dos niveles de lectura.** Un resumen accesible para bachillerato y una profundización para universidad y docencia.
- **Juego que orienta, no que bloquea.** Niebla de guerra sobre el mapa, retos generados a partir de las relaciones y anécdotas coleccionables. Todo el contenido es siempre accesible.
- **Sin servidores ni cuentas.** Funciona entero en el navegador; el progreso de cada lector se guarda en su propio navegador y puede exportarse e importarse.

## Estructura del repositorio

```
datos/          Datos de la red, un archivo por tradición y época
  comun.json          Catálogo de tipos de relación y las 14 temáticas
  china-antigua.json  Piloto de la Antigüedad: tradición china
  india-antigua.json  Piloto de la Antigüedad: tradición india
herramientas/   Utilidades de mantenimiento
  validar.py          Comprueba enlaces, relaciones, fechas, referencias e imágenes
docs/           Documentación
  esquema.md          Formato de los datos y guía de redacción
```

## Validar los datos

Antes de subir cambios en `datos/`, ejecuta:

```
python3 herramientas/validar.py
```

Comprueba que todos los enlaces y relaciones apuntan a nodos existentes, que los campos obligatorios están presentes y que las referencias de las anécdotas tienen el formato correcto. Solo necesita Python 3, sin instalar nada más.

## Licencias

- **Textos y datos** (carpetas `datos/` y `docs/`): [Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)](LICENSE-DATOS.md). Puedes reutilizarlos y adaptarlos citando la autoría y compartiendo tus versiones con la misma licencia.
- **Código** (resto del repositorio): [licencia MIT](LICENSE).

## Cómo citar

> Domínguez Gallego, Juan. *Atlas de la Filosofía*. 2026. https://github.com/caducidad/atlas_filosofia
