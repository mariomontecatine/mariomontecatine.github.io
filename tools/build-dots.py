"""Convierte la foto de carnet en los mapas de densidad de la nube de puntos.

Canal R = probabilidad de que ese pixel sea un punto.
Canal G = tinta, que el motor usa como tamaño y opacidad del punto.

Salen dos mapas, porque un punto claro y uno oscuro no dibujan lo mismo:

  claro   los puntos son oscuros sobre papel, así que van donde la foto es
          oscura: el pelo lleno y la piel apenas insinuada.
  oscuro  los puntos son claros sobre negro, así que van donde la foto es
          clara: la piel llena y el pelo reducido a su silueta. Las cejas, los
          ojos y la boca salen como huecos, y es eso lo que les da la forma.

Todo el trabajo fino (recorte, contraste local, desvanecido del cuello) se hace
aquí, no en el navegador: así se puede mirar el resultado antes de publicarlo.

    python3 tools/build-dots.py [carpeta_destino] [carpeta_simulaciones]
"""

import os
import sys
from PIL import Image, ImageOps, ImageFilter, ImageDraw
import random

SRC = '/Users/mario/Documents/Documentación/Imagenes/Foto_Carnet_2024.jpg'
CROP = (190, 98, 740, 702)   # cabeza y cuello: la camiseta queda fuera
W = 300


def smooth(a, b, v):
    t = max(0.0, min(1.0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


def source():
    src = Image.open(SRC).convert('L').crop(CROP)
    H = round(W * src.size[1] / src.size[0])
    g = src.resize((W, H), Image.LANCZOS)
    g = ImageOps.autocontrast(g, cutoff=1)
    return g.filter(ImageFilter.UnsharpMask(radius=3, percent=130, threshold=2))


def build(g, mode):
    H = g.size[1]

    # La media local a dos escalas: lo que hace falta para saber si un pixel es
    # un rasgo (distinto de lo que lo rodea) o solo piel. Sin esto la cara, que
    # esta iluminada de frente y plana, sale como una mancha.
    near = g.filter(ImageFilter.GaussianBlur(5))
    far = g.filter(ImageFilter.GaussianBlur(16))

    # La silueta, erosionada un pixel: sin esto el grano del fondo deja motas
    # sueltas flotando alrededor de la cabeza.
    mask = g.point(lambda v: 255 if (1 - v / 255) >= 0.2 else 0).filter(ImageFilter.MinFilter(3))
    # Franja interior de dos píxeles: sigue la silueta real del pelo.
    inner_mask = mask.filter(ImageFilter.MinFilter(5)).load()

    gp, np_, fp, mk = g.load(), near.load(), far.load(), mask.load()

    out = Image.new('RGB', g.size)
    op = out.load()
    for y in range(H):
        fade = 1 - max(0.0, (y / H - 0.70) / 0.30)
        for x in range(W):
            # Zona de los dientes en esta foto, con borde suave. Los brillos
            # interiores no son fondo y deben sobrevivir al recorte por tono.
            sx = CROP[0] + x * (CROP[2] - CROP[0]) / W
            sy = CROP[1] + y * (CROP[3] - CROP[1]) / H
            tooth_radius = ((sx - 450) / 57) ** 2 + ((sy - 559) / 14) ** 2
            teeth = (1 - smooth(0.65, 1.15, tooth_radius)) * smooth(0.28, 0.48, gp[x, y] / 255)
            if not mk[x, y] and not (mode == 'dark' and teeth > 0):
                op[x, y] = (0, 0, 0)
                continue
            lum = gp[x, y] / 255
            dn = (np_[x, y] - gp[x, y]) / 255
            df = (fp[x, y] - gp[x, y]) / 255
            if mode == 'light':
                detail = max(0.0, dn) * 0.6 + max(0.0, df) * 0.8
                d = 0.26 * smooth(0.42, 0.90, 1 - lum) + 2.3 * detail
                ink = 1 - lum
            else:
                # Tu cara esta iluminada de frente, asi que el tono solo no la
                # modela: hace falta comparar cada pixel con su entorno. Lo que
                # sobresale de la media lejana son los brillos (frente, nariz,
                # pomulos); por debajo quedan las sombras que se vacían.
                highlight = max(0.0, -df)
                contour = max(0.0, dn)
                # Las sombras restan puntos: rellenarlas en blanco convierte
                # los ojos y los labios en ruido en lugar de conservarlos.
                skin = smooth(0.18, 0.64, lum)
                d = max(0.003, 0.003 + skin ** 1.4 * 0.64 + highlight * 1.5 - contour * 1.2)
                # Un contorno tenue conserva el peinado sin llenar su interior.
                if y / H < 0.30:
                    d = max(d, 0.022 + contour * 0.45)
                ink = min(1.0, 0.35 + lum)
                hair_rim = (1 - inner_mask[x, y] / 255) * (1 - smooth(0.46, 0.55, y / H))
                if hair_rim > 0:
                    d = max(d, 0.82 * hair_rim)
                    ink = max(ink, 0.9 * hair_rim)
            d = min(1.0, d) * fade
            if mode == 'dark':
                # Mantener despejados los ojos, sin tocar cejas ni párpados.
                eye_radius = min(
                    ((sx - 370) / 47) ** 2 + ((sy - 414) / 18) ** 2,
                    ((sx - 529) / 47) ** 2 + ((sy - 409) / 18) ** 2,
                )
                d *= 1 - 0.25 * (1 - smooth(0.3, 1.1, eye_radius))
            if mode == 'dark' and teeth > 0:
                d = d * (1 - teeth) + 0.98 * teeth
                ink = max(ink, 0.95 * teeth)
            op[x, y] = (round(d * 255), round(min(1.0, ink) * 255), 0)
    return out


def preview(m, budget, radius, path, paper, dot):
    W, H = m.size
    mp = m.load()
    scale = 520 / W
    cand = []
    random.seed(7)
    for y in range(H):
        for x in range(W):
            d = mp[x, y][0] / 255
            if d <= 0.01 or random.random() > d:
                continue
            cand.append((x, y, mp[x, y][1] / 255))
    random.shuffle(cand)
    out = Image.new('L', (520, round(H * scale)), paper)
    draw = ImageDraw.Draw(out)
    for x, y, ink in cand[:budget]:
        r = radius * (0.6 + ink * 0.7)
        draw.ellipse([x * scale - r, y * scale - r, x * scale + r, y * scale + r], fill=dot)
    out.save(path)
    print(os.path.basename(path), 'candidatos', len(cand), '->', min(budget, len(cand)))


dest = sys.argv[1] if len(sys.argv) > 1 else 'assets'
photo = source()
for mode in ('light', 'dark'):
    m = build(photo, mode)
    m.save(os.path.join(dest, f'portrait-dots-{mode}.png'))
    # El segundo argumento, si se pasa, es donde dejar una simulación de la
    # nube: conviene mirarla antes de publicar, porque el mapa no se entiende.
    if len(sys.argv) > 2:
        paper, dot = (250, 20) if mode == 'light' else (18, 240)
        preview(m, 8000, 1.05, os.path.join(sys.argv[2], f'sim-{mode}.png'), paper, dot)
