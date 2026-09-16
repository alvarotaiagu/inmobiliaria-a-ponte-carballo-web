/* ==========================================================================
   INMUEBLES · fuente de datos que gestiona el propio cliente
   ==========================================================================

   La sección "Inmuebles destacados" NO lleva los pisos escritos en el código.
   Los lee de una hoja de cálculo de Google publicada como JSON, para que en la
   oficina se pueda dar de alta o quitar una vivienda sin tocar la web.

   --------------------------------------------------------------------------
   1 · LA HOJA
   --------------------------------------------------------------------------
   Cree una hoja de Google con ESTA PRIMERA FILA, exactamente con estos
   nombres de columna (en minúsculas, sin tildes salvo donde se indica):

     titulo | poblacion | tipo | precio | metros | habitaciones | banos |
     fotos  | descripcion | referencia | estado

     titulo ........ "Casa de piedra rehabilitada"
     poblacion ..... una de las ocho: Malpica, A Laracha, Carballo,
                     Coristanco, Ponteceso, Zas, Santa Comba, Sanxenxo.
                     (Si escribe otra, la web la añade sola al filtro.)
     tipo .......... "venta" o "alquiler"
     precio ........ "145.000 €" o "650 €/mes". Se muestra tal cual se escribe.
     metros ........ "160" (solo el número; la web le pone el m²)
     habitaciones .. "3"   (déjelo vacío si no aplica: un local, un terreno)
     banos ......... "2"
     fotos ......... una o varias URL de imagen separadas por COMA.
                     Si la foto está en Google Drive, comparta el archivo como
                     "cualquier persona con el enlace" y pegue el enlace normal
                     (https://drive.google.com/file/d/ID/view...): la web lo
                     convierte sola al formato que se puede mostrar.
     descripcion ... dos líneas como mucho; es lo que se ve al pasar el ratón.
     referencia .... su código interno, "REF. 1042"
     estado ........ déjelo vacío para publicar. Escriba "oculto" (o "no") para
                     que ese inmueble no salga en la web sin borrar la fila.

   --------------------------------------------------------------------------
   2 · PUBLICAR LA HOJA COMO JSON  (opción A, gratis, recomendada)
   --------------------------------------------------------------------------
   En la hoja: Extensiones › Apps Script, pegue esto, Implementar › Nueva
   implementación › Aplicación web › Quién tiene acceso: "Cualquier usuario".
   Copie la URL que le da y péguela abajo en HOJA.url.

       function doGet() {
         const h = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
         const [cab, ...filas] = h.getDataRange().getDisplayValues();
         const datos = filas
           .filter(f => f.join('').trim())
           .map(f => Object.fromEntries(cab.map((c, i) => [c.trim(), f[i]])));
         return ContentService
           .createTextOutput(JSON.stringify(datos))
           .setMimeType(ContentService.MimeType.JSON);
       }

   Opción B: un servicio tipo SheetDB o Sheety. Pegue igualmente su URL abajo;
   la web entiende tanto un array suelto como {datos:[...]} o {inmuebles:[...]}.

   --------------------------------------------------------------------------
   3 · SI LA HOJA FALLA
   --------------------------------------------------------------------------
   Si no hay URL, si tarda más de 7 segundos, si Internet falla o si la hoja
   está vacía, la web muestra los inmuebles de EJEMPLO de más abajo. Nunca se
   queda en blanco ni enseña un error al visitante: el fallo solo se apunta en
   la consola del navegador.

   --------------------------------------------------------------------------
   4 · PARA REUTILIZAR ESTA PLANTILLA EN OTRA AGENCIA
   --------------------------------------------------------------------------
   Cambie las ocho poblaciones en scripts/generate_map.py (coordenadas reales) y
   vuelva a generar el mapa; el filtro de esta sección se construye solo con las
   poblaciones que vengan en la hoja, así que aquí no hay nada que tocar.
   ========================================================================== */

window.A_PONTE_INMUEBLES = {

  /* ---- pegue aquí la URL del JSON de la hoja; vacío = solo ejemplos ---- */
  hoja: {
    url: "",
    corteSegundos: 7
  },

  /* ---- respaldo: se ven si la hoja no contesta o aún no existe ----------
     TODOS estos inmuebles son de ejemplo y así se marcan en pantalla, campo a
     campo: la tarjeta lleva la cinta "EJEMPLO — SUSTITUIR POR INMUEBLE REAL" y
     cada dato lleva su propia marca. Los precios NO son los de su web actual:
     son cifras de muestra para ver el formato de la ficha. */
  ejemplos: [
    {
      titulo: "Casa de piedra rehabilitada",
      poblacion: "Ponteceso",
      tipo: "venta",
      precio: "145.000 €",
      metros: "160",
      habitaciones: "3",
      banos: "2",
      fotos: "assets/img/photos/casa-900.jpg",
      descripcion: "Vivienda de piedra con finca cerrada, a diez minutos de la desembocadura del Anllóns.",
      referencia: "REF. EJEMPLO-01",
      ejemplo: true
    },
    {
      titulo: "Piso reformado en el centro",
      poblacion: "Carballo",
      tipo: "venta",
      precio: "128.000 €",
      metros: "92",
      habitaciones: "3",
      banos: "1",
      fotos: "assets/img/photos/piso-900.jpg",
      descripcion: "Tercero exterior con ascensor, reformado y listo para entrar, junto a la zona de comercio.",
      referencia: "REF. EJEMPLO-02",
      ejemplo: true
    },
    {
      titulo: "Local comercial a pie de calle",
      poblacion: "Carballo",
      tipo: "alquiler",
      precio: "650 €/mes",
      metros: "120",
      habitaciones: "",
      banos: "1",
      fotos: "assets/img/photos/local-900.jpg",
      descripcion: "Diáfano, con escaparate a la calle y salida de humos: vale para hostelería.",
      referencia: "REF. EJEMPLO-03",
      ejemplo: true
    },
    {
      titulo: "Vivienda con vistas al mar",
      poblacion: "Malpica",
      tipo: "venta",
      precio: "210.000 €",
      metros: "140",
      habitaciones: "4",
      banos: "2",
      fotos: "assets/img/photos/vistas-900.jpg",
      descripcion: "Casa de dos plantas sobre la villa, con terreno y vistas abiertas al Atlántico.",
      referencia: "REF. EJEMPLO-04",
      ejemplo: true
    },
    {
      titulo: "Suelo urbano para edificar",
      poblacion: "Coristanco",
      tipo: "venta",
      precio: "48.000 €",
      metros: "800",
      habitaciones: "",
      banos: "",
      fotos: "assets/img/photos/campo-900.jpg",
      descripcion: "Parcela urbana con todos los servicios a pie de parcela y acceso asfaltado.",
      referencia: "REF. EJEMPLO-05",
      ejemplo: true
    },
    {
      titulo: "Apartamento a un paso de la playa",
      poblacion: "Sanxenxo",
      tipo: "alquiler",
      precio: "900 €/mes",
      metros: "70",
      habitaciones: "2",
      banos: "1",
      fotos: "assets/img/photos/cocina-900.jpg",
      descripcion: "Dos habitaciones, cocina reformada y plaza de garaje; alquiler de temporada.",
      referencia: "REF. EJEMPLO-06",
      ejemplo: true
    }
  ]
};
