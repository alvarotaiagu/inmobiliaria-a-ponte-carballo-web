# -*- coding: utf-8 -*-
"""Descarga y grada la fotografia de la web de Inmobiliaria A Ponte.

El brief pedia "fotografia original generada"; en este entorno no hay
herramienta de generacion de imagen, asi que se usan fotos con licencia Pexels
(uso comercial libre, sin atribucion obligatoria) elegidas a mano de hojas de
contacto (scripts/contact_sheets) buscando el concepto "Territorio": costa
atlantica del norte, aldea de piedra, interiores vacios y luminosos de piso
reformado, calle comercial. NINGUNA es de un inmueble real de la agencia ni de
Carballo, y la web lo dice en cada pie de foto y en el informe final.

  costa    Pexels #13028004  acantilado atlantico, mar gris verdoso    (banda de portada)
  cabo     Pexels #36071256  cabo verde sobre el mar, luz de bruma     (banda entre secciones)
  campo    Pexels #21973805  aldea con iglesia entre campos            (zonas / suelo)
  casa     Pexels #33471617  casa de piedra con puerta verde           (ejemplo: casa de aldea)
  salon    Pexels #7695034   sala vacia con ventanales y plantas       (servicio: venta)
  piso     Pexels #33054909  habitacion reformada vacia, suelo madera  (ejemplo: piso)
  cocina   Pexels #38311094  cocina blanca con luz de ventana          (ejemplo: piso reformado)
  calle    Pexels #37172765  calle comercial con gente                 (servicio: alquiler)
  local    Pexels #13865606  local comercial vacio, mostrador  (ejemplo: local)
  vistas   Pexels #1249074   costa verde y mar abierto                 (ejemplo: casa con vistas)

Gradacion por script (no filtros en el navegador, no presets): balance de
blancos gray-world suave, azules y cianes llevados al azul agua apagado de la
paleta (#A9C4C2) en vez de suprimidos, saturacion contenida, split-toning con
sombras a grafito #2A2A28 y luces a crema #FAF8F4, empujon calido hacia el
naranja de marca #E8622C en los medios altos, curva en S suave, vineteado leve
y grano fino. Salida en assets/img/photos/ a 1600 y 900 px mas un LQIP de 24.

Uso: python scripts/process_photos.py
"""
import concurrent.futures
import os
import urllib.request

import numpy as np
from PIL import Image

# nombre: (id de Pexels, proporcion ancho/alto, anclaje vertical 0..1, ancho maximo)
PHOTOS = {
    "costa":  ("13028004", 21 / 9, 0.52, 1600),
    "cabo":   ("36071256", 21 / 9, 0.50, 1600),
    "campo":  ("21973805", 4 / 3, 0.50, 1300),
    "casa":   ("33471617", 4 / 3, 0.52, 1300),
    "salon":  ("7695034", 4 / 3, 0.46, 1300),
    "piso":   ("33054909", 4 / 3, 0.50, 1300),
    "cocina": ("38311094", 4 / 3, 0.50, 1300),
    "calle":  ("37172765", 4 / 3, 0.48, 1300),
    "local":  ("13865606", 4 / 3, 0.50, 1300),
    "vistas": ("1249074", 4 / 3, 0.50, 1300),
}

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "photos_src")
OUT = os.path.join(HERE, "..", "assets", "img", "photos")
os.makedirs(SRC, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

GRAFITO = np.array([0x2A, 0x2A, 0x28]) / 255.0
CREMA = np.array([0xFA, 0xF8, 0xF4]) / 255.0
NARANJA = np.array([0xE8, 0x62, 0x2C]) / 255.0
AGUA = np.array([0xA9, 0xC4, 0xC2]) / 255.0
LUMA = np.array([0.299, 0.587, 0.114])

# alguna llega demasiado saturada para una pagina de papel tecnico
SATURACION = {"vistas": 0.52, "costa": 0.62, "cabo": 0.58, "campo": 0.66}

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")


def descargar(nombre, pid):
    destino = os.path.join(SRC, "%s-%s.jpg" % (nombre, pid))
    if os.path.exists(destino) and os.path.getsize(destino) > 40000:
        return destino
    url = ("https://images.pexels.com/photos/%s/pexels-photo-%s.jpeg"
           "?auto=compress&cs=tinysrgb&w=2400" % (pid, pid))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(destino, "wb") as f:
        f.write(r.read())
    return destino


def recortar(im, prop, anclaje):
    w, h = im.size
    if w / h > prop:
        nw = int(round(h * prop))
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = int(round(w / prop))
        y = int(round((h - nh) * anclaje))
        im = im.crop((0, y, w, y + nh))
    return im


def gradar(a, nombre):
    """a: float32 RGB en 0..1. Devuelve la misma forma, ya gradada."""
    # 1 · balance de blancos gray-world suave
    medias = a.reshape(-1, 3).mean(0)
    a = np.clip(a * (medias.mean() / np.maximum(medias, 1e-4)) ** 0.55, 0, 1)

    # 2 · exposicion y curva en S suave (mas aire, negros que no se cierran)
    a = np.clip(a * 1.045, 0, 1)
    a = np.clip(a + 0.42 * (a - 0.5) * (1 - np.abs(a - 0.5) * 2) * 0.5, 0, 1)

    l = a @ LUMA

    # 3 · saturacion contenida; los cianes van al azul agua de la paleta
    sat = SATURACION.get(nombre, 0.74)
    gris = np.repeat(l[..., None], 3, axis=2)
    a = np.clip(gris + (a - gris) * sat, 0, 1)

    azulez = np.clip((a[..., 2] - (a[..., 0] + a[..., 1]) / 2) * 2.4, 0, 1)[..., None]
    a = np.clip(a * (1 - azulez * 0.5) + AGUA * azulez * 0.5, 0, 1)

    # 4 · split-toning: sombras a grafito, luces a crema, medios altos al naranja
    sombras = np.clip((0.5 - l) * 2, 0, 1)[..., None]
    luces = np.clip((l - 0.55) * 2.2, 0, 1)[..., None]
    calidos = np.clip(1 - np.abs(l - 0.62) * 3.4, 0, 1)[..., None]
    a = np.clip(a * (1 - sombras * 0.16) + GRAFITO * sombras * 0.16, 0, 1)
    a = np.clip(a * (1 - luces * 0.2) + CREMA * luces * 0.2, 0, 1)
    a = np.clip(a * (1 - calidos * 0.075) + NARANJA * calidos * 0.075, 0, 1)

    # 5 · vineteado muy leve
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    a = np.clip(a * (1 - np.clip(r - 0.72, 0, None) * 0.2)[..., None], 0, 1)

    # 6 · grano fino (semilla fija: la misma imagen sale igual cada vez)
    rng = np.random.default_rng(11)
    a = np.clip(a + rng.normal(0, 0.0055, a.shape), 0, 1)
    return a


def procesar(nombre, cfg):
    pid, prop, anclaje, ancho_max = cfg
    ruta = descargar(nombre, pid)
    im = Image.open(ruta).convert("RGB")
    im = recortar(im, prop, anclaje)

    grande = im.resize((ancho_max, int(round(ancho_max / prop))), Image.LANCZOS)
    a = gradar(np.asarray(grande, dtype=np.float32) / 255.0, nombre)
    grande = Image.fromarray((a * 255 + 0.5).astype(np.uint8))

    grande.save(os.path.join(OUT, "%s-1600.jpg" % nombre), quality=82, optimize=True, progressive=True)
    medio = grande.resize((900, int(round(900 / prop))), Image.LANCZOS)
    medio.save(os.path.join(OUT, "%s-900.jpg" % nombre), quality=80, optimize=True, progressive=True)
    lqip = grande.resize((24, max(1, int(round(24 / prop)))), Image.LANCZOS)
    lqip.save(os.path.join(OUT, "%s-lqip.jpg" % nombre), quality=42)
    return "%-7s %s  %dx%d" % (nombre, pid, grande.size[0], grande.size[1])


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(5) as ex:
        for linea in ex.map(lambda kv: procesar(*kv), PHOTOS.items()):
            print(linea)
