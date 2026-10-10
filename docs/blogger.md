# Publicar el atlas en Blogger

El atlas se sirve desde GitHub Pages y se muestra en el blog dentro de un marco (iframe). Así la plantilla del blog y el atlas no se estorban, y cualquier cambio que se suba a GitHub aparece en el blog sin tocarlo.

## 1. Activar GitHub Pages (una sola vez)

En cada uno de los dos repositorios, **ATLAS_FILOSOFIA** y **ATLAS_NUCLEO**:

1. Entra en el repositorio en GitHub y abre **Settings**.
2. En el menú de la izquierda, pulsa **Pages**.
3. En **Source**, elige **Deploy from a branch**.
4. En **Branch**, elige **main** y la carpeta **/ (root)**, y pulsa **Save**.

A los uno o dos minutos, el atlas estará en:

- https://caducidad.github.io/ATLAS_FILOSOFIA/app/

Si se abre y carga el mapa, todo está listo.

## 2. Crear la página en el blog

1. En Blogger, abre **Páginas** y pulsa **Nueva página** (mejor una página fija que una entrada, para que esté siempre en el menú).
2. Ponle título, por ejemplo «Atlas de la Filosofía».
3. Cambia el editor a **vista HTML** (el icono `< >` o el menú del lápiz).
4. Pega este código y publica:

```html
<div style="position:relative;width:100%;height:85vh;min-height:540px;">
  <iframe src="https://caducidad.github.io/ATLAS_FILOSOFIA/app/"
          title="Atlas de la Filosofía"
          style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:8px;"
          allow="fullscreen" allowfullscreen loading="lazy"></iframe>
</div>
<p><a href="https://caducidad.github.io/ATLAS_FILOSOFIA/app/" target="_blank" rel="noopener">Abrir el Atlas de la Filosofía en una pestaña nueva</a></p>
```

## 3. Enlazar a una ficha concreta

Para que una entrada del blog abra el atlas directamente en un autor, una obra o un concepto, añade al final de la dirección del marco una almohadilla y el identificador del nodo:

```html
<iframe src="https://caducidad.github.io/ATLAS_FILOSOFIA/app/#autor.platon" …></iframe>
```

Los identificadores son los de los datos: `autor.confucio`, `obra.republica`, `concepto.ren`…

## Notas

- **Progreso del lector:** se guarda en su navegador, en la dirección de GitHub Pages. Como los cuatro atlas se servirán desde la misma dirección, el lector tendrá un solo progreso para toda la colección.
- **Ancho de la plantilla:** muchas plantillas de Blogger tienen una columna estrecha. El marco se adapta, y el botón «Pantalla completa» de la barra del atlas permite verlo entero.
- **Móvil:** si la plantilla móvil de Blogger da problemas, en **Tema → Personalizar → Móvil** se puede usar la versión de escritorio también en el teléfono.
