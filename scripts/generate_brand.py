# -*- coding: utf-8 -*-
"""Recrea el logotipo de Inmobiliaria A Ponte como SVG vectorial limpio.

Partimos de la imagen que pasa el cliente: wordmark "a ponte" en minusculas,
sans geometrica monolineal en negro, con un acento CUADRADO naranja integrado
en la "p", y "INMOBILIARIA" en versalitas pequenas debajo. No se sustituye por
otro diseno: se redibuja el mismo concepto con geometria exacta (circulos de
radio constante, un unico grosor de trazo, reticula de 20 unidades) para que
sea nitido a cualquier tamano y tenga version clara, oscura, isotipo y favicon.

Reticula: linea base 140, altura de x 100 (circulos r=40 + trazo 20),
ascendente 18, descendente 190. El cuadrado naranja de la "p" es su ojo:
100x100 exteriores con contra de 60x60, el mismo grosor 20 que el resto.

Uso: python scripts/generate_brand.py
"""
import os

NEGRO = "#2A2A28"
NARANJA = "#E8622C"
CREMA = "#FAF8F4"

W = 20.0          # grosor del trazo
R = 40.0          # radio del eje de los circulos (exterior 50 = media altura de x)
BASE = 140.0      # linea base
XT = 40.0         # altura de x (arriba)
DESC = 190.0      # descendente
ASC = 18.0        # ascendente de la t
CY = 90.0         # centro vertical de los circulos
GAP = 26.0        # separacion entre letras
ESPACIO = 50.0    # espacio entre palabras


def circulo(cx, cy, r):
    return ("M %.1f %.1f A %.1f %.1f 0 1 1 %.1f %.1f A %.1f %.1f 0 1 1 %.1f %.1f Z"
            % (cx, cy - r, r, r, cx, cy + r, r, r, cx, cy - r))


def letras(x):
    """Devuelve (trazos_negros, cuadrado_naranja, ancho_total)."""
    negro = []
    cur = x

    # a  ·  circulo + asta a la derecha (geometrica de una planta)
    negro.append(circulo(cur + 50, CY, R))
    negro.append("M %.1f %.1f V %.1f" % (cur + 90, XT, BASE))
    cur += 100 + ESPACIO

    # p  ·  asta larga + OJO CUADRADO NARANJA (el acento de la marca)
    px = cur
    naranja = ("M %.1f %.1f H %.1f V %.1f H %.1f Z "
               "M %.1f %.1f V %.1f H %.1f V %.1f Z"
               % (px, XT, px + 100, BASE, px,
                  px + W, XT + W, BASE - W, px + 100 - W, XT + W))
    negro.append("M %.1f %.1f V %.1f" % (px + W / 2, XT, DESC))
    cur += 100 + GAP

    # o
    negro.append(circulo(cur + 50, CY, R))
    cur += 100 + GAP

    # n
    negro.append("M %.1f %.1f V %.1f A %.1f %.1f 0 0 1 %.1f %.1f V %.1f"
                 % (cur + 10, BASE, CY, R, R, cur + 90, CY, BASE))
    cur += 100 + GAP

    # t  ·  asta con pie curvo + travesano
    negro.append("M %.1f %.1f V %.1f A 26 26 0 0 0 %.1f %.1f"
                 % (cur + 30, ASC, BASE - 26, cur + 56, BASE))
    negro.append("M %.1f %.1f H %.1f" % (cur - 4, XT, cur + 64))
    cur += 74 + GAP

    # e  ·  travesano + arco de 315 grados
    ecx = cur + 50
    negro.append("M %.1f %.1f H %.1f" % (ecx - R, CY, ecx + R))
    negro.append("M %.1f %.1f A %.1f %.1f 0 1 0 %.1f %.1f"
                 % (ecx + R, CY, R, R, ecx + R * 0.707, CY + R * 0.707))
    cur += 100

    return negro, naranja, cur - x


# ---------- versalitas: alfabeto capital monolineal para INMOBILIARIA ----------

CH = 40.0       # altura de capital
CW = 8.0        # grosor
TRACK = 13.0    # prosa entre versalitas


def capital(c, x):
    if c == "I":
        return ["M %.1f 0 V %.1f" % (x + 4, CH)], 8.0
    if c == "N":
        return (["M %.1f %.1f V 0" % (x + 4, CH),
                 "M %.1f 0 L %.1f %.1f" % (x + 4, x + 26, CH),
                 "M %.1f %.1f V 0" % (x + 26, CH)], 30.0)
    if c == "M":
        return (["M %.1f %.1f V 0 L %.1f %.1f L %.1f 0 V %.1f"
                 % (x + 4, CH, x + 19, CH * 0.62, x + 34, CH)], 38.0)
    if c == "O":
        return (["M %.1f %.1f A 15 16 0 1 1 %.1f %.1f A 15 16 0 1 1 %.1f %.1f Z"
                 % (x + 19, CH / 2 - 16, x + 19, CH / 2 + 16, x + 19, CH / 2 - 16)], 38.0)
    if c == "B":
        return (["M %.1f 0 V %.1f" % (x + 4, CH),
                 "M %.1f 0 H %.1f A 10 10 0 0 1 %.1f %.1f H %.1f"
                 % (x + 4, x + 18, x + 18, CH / 2, x + 4),
                 "M %.1f %.1f H %.1f A 10 10 0 0 1 %.1f %.1f H %.1f"
                 % (x + 4, CH / 2, x + 20, x + 20, CH, x + 4)], 32.0)
    if c == "L":
        return (["M %.1f 0 V %.1f H %.1f" % (x + 4, CH, x + 26)], 30.0)
    if c == "A":
        return (["M %.1f %.1f L %.1f 0 L %.1f %.1f" % (x + 2, CH, x + 17, x + 32, CH),
                 "M %.1f %.1f H %.1f" % (x + 8, CH * 0.68, x + 26)], 36.0)
    if c == "R":
        return (["M %.1f 0 V %.1f" % (x + 4, CH),
                 "M %.1f 0 H %.1f A 10 10 0 0 1 %.1f %.1f H %.1f"
                 % (x + 4, x + 18, x + 18, CH / 2, x + 4),
                 "M %.1f %.1f L %.1f %.1f" % (x + 15, CH / 2, x + 32, CH)], 36.0)
    raise ValueError(c)


def versalitas(texto):
    trazos, x = [], 0.0
    for c in texto:
        d, w = capital(c, x)
        trazos += d
        x += w + TRACK
    return trazos, x - TRACK


NEGROS, NARANJA_D, ANCHO = letras(0)
VERS, ANCHO_VERS = versalitas("INMOBILIARIA")

ESCALA_VERS = 0.62
ANCHO_VERS_ESC = ANCHO_VERS * ESCALA_VERS
DX_VERS = (ANCHO - ANCHO_VERS_ESC) / 2.0
DY_VERS = 226.0


def wordmark(color_texto, con_versalitas=True):
    alto = 300.0 if con_versalitas else 210.0
    partes = ['<path d="%s" fill="%s"/>' % (NARANJA_D, NARANJA)]
    partes.append('<g fill="none" stroke="%s" stroke-width="%.0f" stroke-linecap="round" '
                  'stroke-linejoin="round">' % (color_texto, W))
    for d in NEGROS:
        partes.append('  <path d="%s"/>' % d)
    partes.append('</g>')
    if con_versalitas:
        partes.append('<g transform="translate(%.1f %.1f) scale(%.3f)" fill="none" stroke="%s" '
                      'stroke-width="%.1f" stroke-linecap="round" stroke-linejoin="round">'
                      % (DX_VERS, DY_VERS, ESCALA_VERS, color_texto, CW))
        for d in VERS:
            partes.append('  <path d="%s"/>' % d)
        partes.append('</g>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 4 %.0f %.0f" '
            'role="img" aria-label="Inmobiliaria A Ponte">\n  %s\n</svg>\n'
            % (ANCHO + 24, alto, "\n  ".join(partes)))


def isotipo(fondo=None, color=NEGRO):
    """La 'p' sola: asta + ojo cuadrado naranja. Vale de favicon y de sello."""
    cuadrado = ("M 0 0 H 100 V 100 H 0 Z M %.1f %.1f V %.1f H %.1f V %.1f Z"
                % (W, W, 100 - W, 100 - W, W))
    asta = "M %.1f 0 V 150" % (W / 2)
    fondo_svg = ('<rect x="-42" y="-48" width="200" height="250" rx="18" fill="%s"/>\n  ' % fondo) if fondo else ""
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-42 -48 200 250" '
            'role="img" aria-label="A Ponte">\n  %s'
            '<path d="%s" fill="%s"/>\n'
            '  <path d="%s" fill="none" stroke="%s" stroke-width="%.0f" stroke-linecap="round"/>\n'
            '</svg>\n' % (fondo_svg, cuadrado, NARANJA, asta, color, W))


HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "img", "logo")
os.makedirs(OUT, exist_ok=True)


def escribir(nombre, contenido):
    with open(os.path.join(OUT, nombre), "w", encoding="utf-8") as f:
        f.write(contenido)
    print(nombre, len(contenido), "bytes")


if __name__ == "__main__":
    escribir("logo.svg", wordmark(NEGRO))
    escribir("logo-claro.svg", wordmark(CREMA))
    escribir("logo-solo.svg", wordmark(NEGRO, con_versalitas=False))
    escribir("logo-solo-claro.svg", wordmark(CREMA, con_versalitas=False))
    escribir("marca.svg", isotipo())
    escribir("marca-clara.svg", isotipo(color=CREMA))
    escribir("icon.svg", isotipo(fondo=CREMA))
