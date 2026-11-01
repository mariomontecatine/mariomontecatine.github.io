"""Convierte los logos de las webs de clientes en mapas para la nube de puntos.

Cada mapa es una imagen en gris de 220 × 220: cuanto más blanco el píxel, más
probable es que salga un punto ahí. Cada logo se trata a su manera, porque no
dibujan igual: uno es una línea, otro una letra rellena y otro aros de colores.

    python3 tools/build-logos.py

El de Rebeca es un SVG: antes hay que pasarlo a PNG (con fondo blanco) en
REBECA_PNG, por ejemplo con Chrome sin ventana.
"""

import os
from PIL import Image, ImageOps

REPOS = '/Users/mario/repos'
REBECA_PNG = os.environ.get('REBECA_PNG', '/tmp/rebeca.png')  # web/assets/favicon.svg renderizado
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'logos')
SIZE = 220


def square(img):
    """Recorta lo que no es logo y lo centra en un cuadrado con margen."""
    box = img.getbbox()
    img = img.crop(box)
    side = int(max(img.size) * 1.08)
    out = Image.new('L', (side, side), 0)
    out.paste(img, ((side - img.size[0]) // 2, (side - img.size[1]) // 2))
    return out.resize((SIZE, SIZE), Image.LANCZOS)


def rebeca():
    # Una flor de línea negra sobre blanco: el trazo es el punto.
    img = Image.open(REBECA_PNG).convert('L')
    return square(ImageOps.invert(img))


def sara():
    # Una «S» rellena con vetas de mármol: la silueta manda y las vetas
    # oscuras se marcan un poco más.
    img = Image.open(f'{REPOS}/saramontecatine/img/logo-s.png').convert('RGBA')
    alpha = img.getchannel('A')
    lum = img.convert('L')
    data = [int(a * (0.7 + 0.3 * (1 - l / 255))) for a, l in zip(alpha.tobytes(), lum.tobytes())]
    out = Image.new('L', img.size)
    out.putdata(data)
    return square(out)


def alonso():
    # Aros azules y el monograma «AN» en morado: lo oscuro es el dibujo; el
    # relleno azul claro casi no lleva puntos.
    img = Image.open(f'{REPOS}/alonsonieto/img/logo-alonso-nieto.png').convert('RGBA')
    alpha = img.getchannel('A')
    lum = img.convert('L')
    data = []
    for a, l in zip(alpha.tobytes(), lum.tobytes()):
        k = max(0.0, min(1.0, (205 - l) / 110))
        data.append(int(a * k))
    out = Image.new('L', img.size)
    out.putdata(data)
    return square(out)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, build in [('rebeca', rebeca), ('sara', sara), ('alonso', alonso)]:
        build().save(os.path.join(OUT, f'{name}.png'), optimize=True)
        print('ok', name)
