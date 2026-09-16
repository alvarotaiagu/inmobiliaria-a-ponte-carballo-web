# -*- coding: utf-8 -*-
"""Dibuja el mapa editorial de la portada de A Ponte y lo inyecta en index.html.

QUE ES: un mapa vectorial propio (no es Google Maps; el de Google solo aparece
en Contacto y bajo consentimiento) de la franja de costa que cubre la agencia,
de Malpica a Sanxenxo, con los 8 municipios y la linea de ruta que los enlaza.

COMO ESTA HECHO
  · Coordenadas reales (lat/lon) de los 8 municipios y de ~40 puntos de costa
    (cabos, rias y villas). Proyeccion equirectangular con correccion de
    coseno en la latitud media.
  · El mapa se gira 90 grados: el NORTE queda a la IZQUIERDA. Es un giro, no
    un espejo: la geografia se conserva. Asi la franja Malpica -> Sanxenxo,
    que en norte-arriba es un rectangulo vertical estrechisimo, se convierte
    en una banda apaisada que encaja en una portada. Lleva rosa de los
    vientos indicando el norte para que no confunda.
  · La costa se suaviza con Catmull-Rom y se le mete un temblor minimo
    (deterministico, semilla fija) para que tenga trazo de mano, no de CAD.
  · La ruta enlaza los 8 municipios ordenados de NORTE a SUR, que es como
    se recorre la franja; no es un itinerario de coche.

SALIDA
  assets/map/mapa.svg           el mapa suelto, por si se quiere reutilizar
  assets/map/mapa-datos.json    municipios con su x/y y su punto en la ruta
  index.html                    se sustituye lo que hay entre las marcas
                                <!-- MAPA:INICIO --> y <!-- MAPA:FIN -->

El mapa es ILUSTRACION, no cartografia de precision: la linea de costa es una
sintesis a mano alzada. Las posiciones de los 8 municipios si son sus
coordenadas reales.

Uso: python scripts/generate_map.py
"""
import json
import math
import os

# ---------------------------------------------------------------- proyeccion

LAT0 = 43.47          # borde norte -> x = 0 (mas el margen)
LON0 = -8.40          # borde este  -> y = 0
K = 1299.0            # unidades SVG por grado de latitud
COS = math.cos(math.radians(42.9))
MX = 40.0             # margen izquierdo
ANCHO, ALTO = 1600, 900
KM = K / 111.2        # unidades por kilometro


def proj(lat, lon):
    """Norte a la izquierda, oeste abajo."""
    return ((LAT0 - lat) * K + MX, (LON0 - lon) * COS * K)


# ------------------------------------------------------- municipios (reales)

# El orden de la lista ES el orden de la ruta: se sale de la costa de
# Bergantinos, se entra a la sede de Carballo, se baja por Xallas y se termina
# en Sanxenxo. No es un itinerario de coche: es como se recorre la franja.
MUNICIPIOS = [
    # slug, nombre, lat, lon, dx, dy, anclaje del rotulo
    ("malpica",      "Malpica",      43.3230, -8.8110, -16, -26, "end"),
    ("laracha",      "A Laracha",    43.2500, -8.5860,  30,   8, "start"),
    ("carballo",     "Carballo",     43.2130, -8.6910,  36,  -6, "start"),
    ("coristanco",   "Coristanco",   43.1980, -8.7400,  30,  34, "start"),
    ("ponteceso",    "Ponteceso",    43.2430, -8.8990, -30,   4, "end"),
    ("zas",          "Zas",          43.1040, -8.9170,  16,  38, "start"),
    ("santa-comba",  "Santa Comba",  43.0350, -8.8080,  16, -30, "start"),
    ("sanxenxo",     "Sanxenxo",     42.4000, -8.8070, -18,  34, "end"),
]

# ------------------------------------------------------------- linea de costa
# De la ria de A Coruna a la ria de Pontevedra, siguiendo la costa: cabos,
# rias y villas. Sintesis a mano alzada a partir de coordenadas conocidas.

COSTA = [
    (43.39, -8.38), (43.37, -8.42), (43.34, -8.49), (43.31, -8.52),
    (43.30, -8.62), (43.30, -8.72), (43.31, -8.77), (43.323, -8.805),
    (43.325, -8.872),                                   # Punta Narigа
    (43.27, -8.945),                                    # Corme
    (43.245, -8.893),                                   # fondo de la ria (Ponteceso)
    (43.228, -8.972),                                   # Laxe
    (43.205, -9.030), (43.192, -9.105),                 # Traba, Camelle
    (43.172, -9.192),                                   # cabo Vilan
    (43.130, -9.176),                                   # Camarinas
    (43.092, -9.145),                                   # Ponte do Porto
    (43.105, -9.213),                                   # Muxia
    (43.058, -9.265),                                   # cabo Touriñan
    (43.010, -9.272),                                   # Nemina
    (42.950, -9.282), (42.885, -9.272),                 # cabo da Nave, Fisterra
    (42.918, -9.222),                                   # villa de Fisterra
    (42.952, -9.185),                                   # Cee / Corcubion
    (42.910, -9.130),                                   # Ezaro
    (42.872, -9.108),                                   # O Pindo
    (42.812, -9.092),                                   # Carnota
    (42.760, -9.100),                                   # Louro
    (42.778, -9.052),                                   # Muros
    (42.800, -8.918),                                   # Noia
    (42.752, -8.972), (42.700, -9.002),                 # Portosin, Porto do Son
    (42.600, -9.038),                                   # Corrubedo
    (42.532, -9.010),                                   # Aguino
    (42.562, -8.982),                                   # Ribeira
    (42.632, -8.898),                                   # Boiro
    (42.652, -8.812),                                   # Rianxo
    (42.680, -8.740),                                   # fondo de la ria de Arousa
    (42.600, -8.772),                                   # Vilagarcia
    (42.518, -8.815),                                   # Cambados
    (42.490, -8.878),                                   # O Grove
    (42.442, -8.852),                                   # A Lanzada
    (42.398, -8.808),                                   # Portonovo / Sanxenxo
    (42.420, -8.700),                                   # fondo de la ria de Pontevedra
    (42.412, -8.640),
    (42.400, -8.722),                                   # Marin
    (42.335, -8.785),                                   # Bueu
    (42.318, -8.848),                                   # cabo Udra
    (42.285, -8.822),                                   # ria de Aldan
    (42.262, -8.788),                                   # Cangas
]

# ------------------------------------------------------------------ utilidades


def temblor(puntos, amp=2.6, semilla=7):
    """Temblor deterministico: el trazo parece de mano, no de plotter."""
    s = semilla
    fuera = []
    for i, (x, y) in enumerate(puntos):
        s = (1103515245 * s + 12345) % 2147483648
        a = (s / 2147483648.0 - 0.5) * 2 * amp
        s = (1103515245 * s + 12345) % 2147483648
        b = (s / 2147483648.0 - 0.5) * 2 * amp
        fuera.append((x + a, y + b))
    return fuera


def catmull(puntos, tension=1.0, cerrar=False):
    """Catmull-Rom -> cubicas de Bezier."""
    p = list(puntos)
    if len(p) < 2:
        return ""
    ext = [p[0]] + p + [p[-1]]
    d = ["M %.1f %.1f" % p[0]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0 * tension, p1[1] + (p2[1] - p0[1]) / 6.0 * tension)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0 * tension, p2[1] - (p3[1] - p1[1]) / 6.0 * tension)
        d.append("C %.1f %.1f %.1f %.1f %.1f %.1f" % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]))
    if cerrar:
        d.append("Z")
    return " ".join(d)


def largo_aprox(puntos):
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(puntos, puntos[1:]))


# ------------------------------------------------------------------- el dibujo

costa_xy = temblor([proj(la, lo) for la, lo in COSTA], amp=2.4)
costa_d = catmull(costa_xy, tension=0.92)

# el mar: la costa cerrada por el borde inferior (oeste) del lienzo
mar_d = (costa_d + " L %.1f %.1f L %.1f %.1f L %.1f %.1f Z"
         % (costa_xy[-1][0], ALTO + 60, -60.0, ALTO + 60, -60.0, costa_xy[0][1]))

# la tierra: la misma costa cerrada por el borde superior (este) del lienzo.
# Va pintada ENCIMA del rayado de agua, asi que recorta las olas sin
# necesidad de un clipPath con id (el mapa se clona y los id se repetirian).
tierra_d = (costa_d + " L %.1f %.1f L %.1f %.1f L %.1f %.1f Z"
            % (ANCHO + 60, costa_xy[-1][1], ANCHO + 60, -60.0, costa_xy[0][0], -60.0))

# rayado de agua: la misma costa repetida mar adentro (hacia el oeste)
olas = [(desp, catmull(temblor([(x, y + desp) for x, y in costa_xy], amp=1.8, semilla=31 + i)))
        for i, desp in enumerate((20, 42, 68, 98, 132))]

# graticula: paralelos y meridianos cada 0,2 grados, en trazo finisimo
grat = []
la = 42.4
while la <= 43.4001:
    x = proj(la, LON0)[0]
    grat.append(('M %.1f -20 V %.1f' % (x, ALTO + 20), "%.1f N" % la))
    la += 0.2
lo = -9.2
while lo <= -8.4001:
    y = proj(LAT0, lo)[1]
    grat.append(('M -20 %.1f H %.1f' % (y, ANCHO + 20), "%.1f O" % abs(lo)))
    lo += 0.2

pines = []
for slug, nombre, lat, lon, dx, dy, anc in MUNICIPIOS:
    x, y = proj(lat, lon)
    pines.append({"slug": slug, "nombre": nombre, "lat": lat, "lon": lon,
                  "x": round(x, 1), "y": round(y, 1), "dx": dx, "dy": dy, "anclaje": anc})

# la ruta: los 8 municipios de norte a sur, suavizada
ruta_pts = [(p["x"], p["y"]) for p in pines]
ruta_d = catmull(ruta_pts, tension=0.55)

# fraccion de recorrido de cada municipio sobre la poligonal (aproxima la curva)
acum, total = [0.0], largo_aprox(ruta_pts)
for a, b in zip(ruta_pts, ruta_pts[1:]):
    acum.append(acum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
for p, t in zip(pines, acum):
    p["t"] = round(t / total, 4)

PIN = "M -9 -9 H 9 V 7 H 3 L 0 13 L -3 7 H -9 Z"     # cuadrado de la marca, con punta


def svg_pines():
    """El translate va en el <g> exterior y la animacion de rebote en el
    interior: si GSAP escribiera el transform sobre el exterior, se llevaria
    por delante la posicion del pin en el mapa."""
    fuera = []
    for p in pines:
        sede = ' sede' if p["slug"] == "carballo" else ''
        fuera.append(
            '      <g class="pin%s" data-muni="%s" data-t="%.4f" transform="translate(%.1f %.1f)"\n'
            '         role="button" tabindex="0" aria-label="Ver inmuebles en %s">\n'
            '        <g class="pin-cuerpo">\n'
            '          <circle class="pin-halo" r="26"/>\n'
            '          <path class="pin-marca" d="%s"/>\n'
            '        </g>\n'
            '        <text class="pin-nombre" x="%d" y="%d" text-anchor="%s">%s</text>\n'
            '      </g>'
            % (sede, p["slug"], p["t"], p["x"], p["y"], p["nombre"], PIN,
               p["dx"], p["dy"], p["anclaje"], p["nombre"].upper()))
    return "\n".join(fuera)


def svg_olas():
    return "\n".join(
        '      <path class="mar-ola" d="%s" style="--i:%d"/>' % (d, i)
        for i, (desp, d) in enumerate(olas))


def svg_graticula():
    return "\n".join('    <path class="graticula" d="%s"/>' % d for d, _ in grat)


ESCALA_KM = 20
escala_x, escala_y = 1186.0, 640.0
escala_ancho = ESCALA_KM * KM

# La portada usa el mapa a sangre: "slice" para que cubra la banda. Todo lo
# que tiene que verse si, pase lo que pase, vive entre y=120 e y=700.
MAPA = '''<svg class="mapa" viewBox="0 -60 %(W)d %(H)d" preserveAspectRatio="xMidYMid slice"
     role="img" aria-labelledby="mapa-titulo" focusable="false">
  <title id="mapa-titulo">Mapa de la franja de costa entre Malpica y Sanxenxo con los ocho municipios en los que trabaja Inmobiliaria A Ponte</title>

  <g class="mapa-mar" aria-hidden="true">
    <path class="mar-fondo" d="%(MAR)s"/>
%(OLAS)s
  </g>

  <path class="mapa-tierra" d="%(TIERRA)s" aria-hidden="true"/>

  <g class="mapa-graticula" aria-hidden="true">
%(GRAT)s
  </g>

  <path class="mapa-costa" d="%(COSTA)s" aria-hidden="true"/>

  <g class="mapa-rotulos" aria-hidden="true">
    <text class="rot-mar" x="118" y="616" transform="rotate(-4 118 616)">OCÉANO ATLÁNTICO</text>
    <text class="rot-tierra" x="690" y="140">TERRA DE SONEIRA · XALLAS</text>
    <text class="rot-tierra" x="980" y="292">RÍAS BAIXAS</text>
  </g>

  <path class="mapa-ruta" d="%(RUTA)s" pathLength="1000" aria-hidden="true"/>

  <g class="mapa-pines">
%(PINES)s
  </g>

  <g class="mapa-brujula" transform="translate(%(BX).0f %(BY).0f)" aria-hidden="true">
    <path class="brujula-aguja" d="M 0 0 H 54"/>
    <path class="brujula-punta" d="M 0 0 L 13 -6 L 13 6 Z"/>
    <text class="brujula-n" x="-8" y="5">N</text>
  </g>

  <g class="mapa-escala" transform="translate(%(EX).0f %(EY).0f)" aria-hidden="true">
    <path class="escala-regla" d="M 0 0 H %(EW).1f M 0 -6 V 6 M %(EW).1f -6 V 6 M %(EM).1f -4 V 4"/>
    <text class="escala-txt" x="%(EW).1f" y="24" text-anchor="end">%(KM)d km</text>
  </g>
</svg>''' % {
    "W": ANCHO, "H": ALTO,
    "MAR": mar_d, "OLAS": svg_olas(), "COSTA": costa_d, "RUTA": ruta_d,
    "TIERRA": tierra_d, "GRAT": svg_graticula(),
    "PINES": svg_pines(),
    "BX": 1338, "BY": 596,
    "EX": escala_x, "EY": escala_y, "EW": escala_ancho, "EM": escala_ancho / 2.0,
    "KM": ESCALA_KM,
}

# ------------------------------------------------------------------- escritura

HERE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(HERE, "..")
MAPDIR = os.path.join(RAIZ, "assets", "map")
os.makedirs(MAPDIR, exist_ok=True)

with open(os.path.join(MAPDIR, "mapa.svg"), "w", encoding="utf-8") as f:
    f.write(MAPA.replace('<svg class="mapa"', '<svg xmlns="http://www.w3.org/2000/svg" class="mapa"') + "\n")

datos = {"viewBox": [0, 0, ANCHO, ALTO], "unidadesPorKm": round(KM, 3),
         "municipios": [{k: p[k] for k in ("slug", "nombre", "x", "y", "t", "lat", "lon")} for p in pines]}
with open(os.path.join(MAPDIR, "mapa-datos.json"), "w", encoding="utf-8") as f:
    json.dump(datos, f, ensure_ascii=False, indent=1)

INDEX = os.path.join(RAIZ, "index.html")
if os.path.exists(INDEX):
    with open(INDEX, encoding="utf-8") as f:
        html = f.read()
    ini, fin = "<!-- MAPA:INICIO -->", "<!-- MAPA:FIN -->"
    if ini in html and fin in html:
        a, b = html.index(ini) + len(ini), html.index(fin)
        html = html[:a] + "\n" + MAPA + "\n" + html[b:]
        with open(INDEX, "w", encoding="utf-8") as f:
            f.write(html)
        print("index.html: mapa inyectado")
    else:
        print("index.html: no encuentro las marcas MAPA:INICIO / MAPA:FIN")

print("mapa.svg %d bytes · %d municipios · ruta de %.0f unidades (%.0f km aprox)"
      % (len(MAPA), len(pines), total, total / KM))
for p in pines:
    print("   %-12s x=%-7.1f y=%-7.1f t=%.3f" % (p["slug"], p["x"], p["y"], p["t"]))
