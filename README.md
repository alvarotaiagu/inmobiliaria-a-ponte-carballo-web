# Inmobiliaria A Ponte · Carballo (A Coruña)

Web de una página para **Inmobiliaria A Ponte**, agencia real de Carballo que trabaja en ocho
municipios, de la Costa da Morte a Sanxenxo. Sustituye por completo a su web actual sobre
Inmogesco (plantilla de terceros con texto genérico): esto es front-end propio, sin plataforma
detrás, con la sección de inmuebles conectada a una hoja de cálculo que gestiona la propia agencia.

Primera plantilla del sector inmobiliario en la carpeta. Está pensada para revenderse a otras
agencias: el mapa, las zonas y el listado de inmuebles se cambian por datos, no por código.

---

## 1 · El concepto: "Territorio"

La agencia como **cartógrafa de su comarca**. El hilo conductor no es el catálogo de casas, es el
mapa: de Malpica a Sanxenxo. Por eso:

- La portada es un **mapa editorial dibujado a mano** (SVG propio, trazo de grafito) sobre
  coordenadas reales. Al cargar, una línea naranja **se dibuja** enlazando los ocho municipios en
  orden de recorrido y en cada uno **aparece un pin** con su nombre en versalitas.
- La cabecera lleva una **barra de ruta**: al hacer scroll, la "cámara" avanza de población en
  población y la barra dice en cuál va (`CARBALLO · sede`, `3 / 8 municipios`).
- En la sección **Zonas**, un segundo mapa (una copia del de la portada) **se acerca a cada
  municipio** mientras se lee su bloque, y la ruta se va dibujando hasta ese punto.
- Los inmuebles se ordenan y se filtran **por población primero**, no por tipo de propiedad.
- Pulsar un pin del mapa lleva al listado ya filtrado por esa población.

**El mapa del hero y el de contacto son dos mapas distintos.** El del hero es SVG propio,
generado por `scripts/generate_map.py`. El de contacto es el embed de Google Maps, sin clave de
API y **solo si el visitante lo pide** (patrón `.map-consent`), para no contradecir el aviso de
"sin cookies de terceros".

### Sobre el mapa

- Proyección equirectangular con corrección de coseno, **girada 90°: el norte queda a la
  izquierda**. Es un giro, no un espejo — la geografía se conserva. En norte-arriba, la franja
  Malpica→Sanxenxo es un rectángulo altísimo y estrechísimo que no cabe en una portada; girado es
  una banda apaisada. Lleva rosa de los vientos y escala de 20 km para que no confunda.
- Las **posiciones de los ocho municipios son sus coordenadas reales** (lat/lon), igual que las
  distancias en línea recta a la oficina que aparecen en Zonas (calculadas con haversine).
- La **línea de costa es una síntesis a mano alzada** sobre unos 50 puntos reales (cabos, rías y
  villas, de A Coruña a Cangas), suavizada con Catmull-Rom y con un temblor mínimo determinista
  para que tenga trazo de mano. Es ilustración editorial, no cartografía de precisión.
- El **orden de la ruta** (Malpica → A Laracha → Carballo → Coristanco → Ponteceso → Zas →
  Santa Comba → Sanxenxo) es un recorrido de la franja de norte a sur, no un itinerario de coche.

---

## 2 · Qué es dato real y qué está pendiente

### Real y confirmado por el cliente

| Dato | Valor |
|---|---|
| Nombre | Inmobiliaria A Ponte |
| Municipios | Malpica, A Laracha, Carballo, Coristanco, Ponteceso, Zas, Santa Comba, Sanxenxo |
| Servicios | Venta (viviendas, pisos, suelo urbano), alquiler (viviendas, locales comerciales, hostelería), búsqueda personalizada |
| Valoración Google | **3,5 ★ · 19 reseñas** |
| Horario | L, X, J, V y M: 10:00–14:00 y 17:00–20:00 · S: 11:00–14:00 · D: cerrado |
| Logotipo | Wordmark "a ponte" + INMOBILIARIA, naranja #E8622C |

### Pendiente de confirmar (marcado en pantalla, nunca inventado)

| Hueco | Dónde aparece | Estado |
|---|---|---|
| Dirección | Contacto, pie, embed de Google | Se muestra `Rúa Perú, 2 · 15100 Carballo` **con la marca "DIRECCIÓN A CONFIRMAR"** (viene de su web actual) |
| Teléfono | Contacto, pie, diálogo del formulario | Se muestra `722 21 22 18` **con la marca "TELÉFONO A CONFIRMAR"** (viene de su web actual; su ficha de Google no lo mostraba) |
| Email | Contacto, pie, privacidad | `EMAIL PENDIENTE DE CONFIRMAR` — en la fuente original venía con errores de formato |
| Textos de reseñas | Opiniones | Tres tarjetas con `TEXTO DE RESEÑA PENDIENTE` y `NOMBRE PENDIENTE`. La nota y el número **sí** son reales |
| Qué se vende en cada zona | Zonas (los 8 bloques) | `A CONFIRMAR` en cada municipio |
| Honorarios de "buscamos por usted" | Servicios | `A CONFIRMAR CON EL CLIENTE` |
| Datos fiscales | Aviso legal | `PENDIENTES DE CONFIRMAR` (denominación, NIF, domicilio, registro) |
| Destino del formulario | Contacto | No envía: al validar, avisa de que falta el correo y ofrece el teléfono |

**No se ha inventado nada más:** ni años de actividad, ni equipo, ni premios, ni testimonios, ni
número de operaciones. Donde no había dato, hay hueco marcado.

### Los precios de su web actual no están aquí

Su inventario (viviendas de 90.000 € a 299.900 €, suelo de 35.000 € a 230.000 €…) cambia todo el
rato, así que no se ha fijado en el código. En su lugar hay **seis inmuebles de ejemplo**, con
todos los campos marcados (cinta naranja en la tarjeta + subrayado punteado en cada dato +
aviso para lector de pantalla), que solo se ven mientras la hoja de cálculo no esté conectada.

### Fotografía

El brief pedía fotografía original generada; en este entorno no hay herramienta de generación de
imagen. Se han usado **fotos con licencia Pexels** (uso comercial libre, sin atribución
obligatoria), elegidas a mano de hojas de contacto y **gradadas por script** a la paleta de marca
(crema, grafito, naranja y el azul agua del mar). **Ninguna es de un inmueble de la agencia ni de
Carballo**, y la web lo dice en cada pie de foto y en el aviso legal. Los identificadores de cada
foto están documentados en `scripts/process_photos.py`.

---

## 3 · La sección de inmuebles: cómo la lleva la agencia

La instrucción completa, con el código de Apps Script listo para pegar, está en
**`js/inmuebles-datos.js`**. En resumen:

1. Una hoja de Google con una fila por inmueble y estas columnas:
   `titulo · poblacion · tipo · precio · metros · habitaciones · banos · fotos · descripcion ·
   referencia · estado`.
2. Se publica como JSON (Apps Script gratis, o SheetDB/Sheety) y se pega la URL en
   `js/inmuebles-datos.js` → `hoja.url`.
3. Al añadir una fila aparece una ficha nueva. Sin tocar la web.

Detalles que ya están resueltos:

- **Fotos de Google Drive**: se pega el enlace normal de "compartir" y la web lo convierte sola al
  formato que sí se puede mostrar en un `<img>`.
- **Ocultar sin borrar**: escriba `oculto` en la columna `estado`.
- **El filtro se construye solo** con las poblaciones que haya en la hoja, en el orden de la ruta;
  si aparece una población nueva, se añade al final.
- **Si la hoja falla** (sin URL, sin Internet, más de 7 segundos, JSON roto o cero filas) se ven
  los seis ejemplos. El visitante **nunca** ve un error ni una sección en blanco: el fallo solo se
  apunta en la consola. Verificado con Playwright cortando la conexión a la hoja.
- Los ejemplos se pintan **antes** de pedir la hoja, así que la sección nunca parpadea vacía.

---

## 4 · Estructura

```
index.html                 una sola página; el mapa va inline (se anima y se clona)
css/style.css              tokens, mapa, secciones y adaptación (hasta 400 px)
js/inmuebles-datos.js      LA HOJA DEL CLIENTE + los 6 ejemplos + el manual
js/main.js                 mapa, cámara, inmuebles, movimiento, cookies, formulario
assets/img/logo/           logotipo recreado en SVG + iconos + og.png
assets/img/photos/         fotografía gradada (1600 / 900 / LQIP)
assets/map/                mapa.svg suelto + mapa-datos.json (coordenadas y ruta)
scripts/                   generadores y verificación (ver abajo)
screenshots/               capturas de la verificación
```

### Secciones

1. **Portada** · mapa a sangre con la ruta de los 8 municipios, wordmark flotando, titular con
   char-reveal, CTA magnética y contadores (8 municipios · 3,5 ★ · 19 reseñas).
2. **Qué hacemos** · venta, alquiler y búsqueda personalizada, en pila de fichas (sticky-stack).
3. **Inmuebles destacados** · tarjetas desde la hoja, filtro por población, hover que revela la
   descripción.
4. **Zonas** · los ocho municipios, con el mapa acercándose a cada uno mientras se lee.
5. **Opiniones** · 3,5 ★ y 19 reseñas reales, textos pendientes.
6. **Contacto** · datos, horario con el día de hoy resaltado, formulario "busco una propiedad" y
   mapa de Google bajo consentimiento.

---

## 5 · Marca

El logotipo del cliente se ha **recreado como SVG limpio** a partir de la imagen de referencia, no
sustituido: mismo concepto (wordmark "a ponte" en minúsculas, sans geométrica monolineal, acento
cuadrado naranja integrado en la "p", INMOBILIARIA en versalitas debajo) redibujado sobre una
retícula exacta —círculos de radio constante, un único grosor de trazo de 20 unidades— para que sea
nítido a cualquier tamaño. Se genera con `scripts/generate_brand.py` en seis variantes: wordmark
oscuro y claro, con y sin versalitas, isotipo y favicon.

**Paleta** (sin colores nuevos): crema `#FAF8F4`, grafito `#2A2A28`, naranja de marca `#E8622C`
(`#C44E1C` cuando hace de texto pequeño, por contraste) y azul agua `#A9C4C2` **solo para el mar**.
**Tipografía**: Sora para todo, sin serif. Los nombres de población van siempre en versalitas
pequeñas junto a su pin. Modo claro; no se fuerza oscuro.

---

## 6 · Regenerar y verificar

```bash
# marca (logo, isotipo, favicon)
python scripts/generate_brand.py

# mapa editorial: lo dibuja y lo inyecta entre <!-- MAPA:INICIO --> y <!-- MAPA:FIN -->
python scripts/generate_map.py

# fotografía: descarga de Pexels y gradación a la paleta
python scripts/process_photos.py

# iconos PNG y la imagen social (que reutiliza el propio mapa)
NODE_PATH=/c/Users/alvar/node_modules node scripts/generate_icons.js

# verificación: 56 pruebas con Playwright
python -m http.server 8991
NODE_PATH=/c/Users/alvar/node_modules node scripts/verify.js
```

`scripts/contact_sheets.js` monta las hojas de contacto de Pexels para elegir foto a mano
(Pexels bloquea el headless "limpio": un navegador nuevo por consulta, UA realista y ~9 s de espera).

### Qué comprueba la verificación (56/56)

- La ruta **se dibuja** (a los 900 ms va por la mitad) y los pines **van saliendo** por el camino;
  al final, los 8 están visibles y dentro de la banda del mapa.
- El wordmark flotante no pisa ningún rótulo del mapa.
- La cámara avanza con el scroll y el visor de zonas **encuadra las coordenadas reales** del
  municipio que se está leyendo.
- **La hoja de inmuebles**: que responde (sustituye a los ejemplos, respeta `oculto`, reconstruye
  el filtro, convierte los enlaces de Drive) y **que no responde** (vuelve a los seis ejemplos, con
  sus cintas y sus 30 campos marcados, sin un solo error a la vista).
- Filtrar por población, y que pulsar un pin lleve al listado filtrado.
- La pila de servicios: que las fichas sean `sticky` y que **ninguna se transparente al salir**
  (si bajara la opacidad se leería a través de ella la ficha de debajo).
- Cookies: que el aviso salga, que **el botón de cerrar funcione de verdad** (`display` acaba en
  `none`) y que no vuelva a salir.
- Google Maps: **cero peticiones a Google hasta que se pulsa**, y sin clave de API.
- El formulario no finge un envío que no existe.
- A **400 px** el trazado se sustituye por la lista de poblaciones, sin desbordes.
- `prefers-reduced-motion`: ruta y pines ya en su posición final y sin scroll suave.
- Sin GSAP (CDN caído) y **sin JavaScript**: la página sigue completa y legible.
- Accesibilidad básica: alt en todas las imágenes, un solo `h1`, pines usables con teclado, título
  accesible en el mapa, **ningún id repetido al clonar el mapa**, etiquetas en todos los campos.
- Rendimiento: ninguna tarea larga durante el recorrido y ~690 KB transferidos.

---

## 7 · Reutilizar la plantilla en otra agencia

1. **Zonas**: cambie la lista `MUNICIPIOS` de `scripts/generate_map.py` (slug, nombre, lat, lon y el
   desplazamiento del rótulo) y, si la comarca está en otro sitio, los puntos de `COSTA` y las
   constantes de proyección. Ejecute el script: el mapa se redibuja y se inyecta solo.
2. **Ruta**: el orden de esa lista es el orden en que se dibuja la ruta. Ajuste también `MUNIS` en
   `js/main.js` (mismos slugs, más una nota corta: "sede", "costa", "interior"…).
3. **Inmuebles**: nada que tocar. El filtro se construye con lo que traiga la hoja.
4. **Marca**: `scripts/generate_brand.py` para el wordmark; si el logo del nuevo cliente no es
   monolineal, sustituya el SVG y deje el resto.
5. **Textos**: `index.html` está comentado por secciones y los huecos pendientes usan siempre la
   clase `.pend`, así que se localizan de un vistazo.
