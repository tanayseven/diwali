"""Draws the street's other houses, by night, in the main house's palette, in scene
units, each with its bottom edge where it stands on the ground. Writes each SVG, and
prints what the game needs to know of each, as JSON: its size, porch floor, door,
eaves and pots, which src/street.ts holds. Change both together.

Usage: python3 scripts/art/houses.py public/sprites/houses
"""
import json
import sys

LIT = "#FFC94A"
LIT_ROOM = "#FFE08A"
WALL = "#37293b"
WALL_2 = "#3e2b3b"
WALL_LIGHT = "#4c3946"
WALL_PALE = "#5a4a5e"
TRIM = "#4e3b48"
DARK = "#292036"
FRAME = "#2c2135"
ROOF = "#653d49"
ROOF_DARK = "#4a2c3a"
WOOD = "#5c3a2e"
WOOD_DARK = "#4a2d26"
FLOOR = "#5e3a46"
FLOOR_LINE = "#4a2d3a"
STEP = "#3d273b"
LEAF = ["#31564b", "#2c504b", "#274b4b", "#33584c"]
POT = "#57323f"


def rect(x, y, w, h, fill, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"{extra}/>'


def poly(points, fill):
    return f'<polygon points="{" ".join(f"{x},{y}" for x, y in points)}" fill="{fill}"/>'


def line(x1, y1, x2, y2, stroke, width=1.5):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{width}"/>'


def window(x, y, w, h, panes=2, rows=1, frame=FRAME, grille=False):
    out = [rect(x - 3, y - 3, w + 6, h + 6, frame), rect(x, y, w, h, LIT)]
    for i in range(1, panes):
        out.append(line(x + w * i / panes, y, x + w * i / panes, y + h, frame, 3))
    for j in range(1, rows):
        out.append(line(x, y + h * j / rows, x + w, y + h * j / rows, frame, 2.5))
    if grille:
        for i in range(1, 6):
            out.append(line(x + w * i / 6, y, x + w * i / 6, y + h, frame, 1))
    return "".join(out)


def shutters(x, y, w, h):
    """A pair of slatted shutters either side of a window"""
    out = []
    for sx in (x - w * 0.5 - 4, x + w + 4):
        out.append(rect(sx, y, w * 0.5, h, WALL_2))
        for k in range(1, int(h / 5)):
            out.append(line(sx + 2, y + k * 5, sx + w * 0.5 - 2, y + k * 5, DARK, 1))
    return "".join(out)


def door(x, y, w, h):
    """An open front door, the lit room beyond with a picture and a little table, the
    leaves swung open inside"""
    leaf = w * 0.28
    return "".join([
        rect(x - 5, y - 6, w + 10, h + 6, FRAME),
        rect(x, y, w, h, LIT_ROOM),
        rect(x + w * 0.3, y + h * 0.18, w * 0.4, h * 0.22, "#c99a3a"),
        rect(x + w * 0.34, y + h * 0.21, w * 0.32, h * 0.16, LIT),
        rect(x + w * 0.22, y + h * 0.62, w * 0.56, 3, "#6b4a3a"),
        line(x + w * 0.27, y + h * 0.62, x + w * 0.27, y + h * 0.8, "#6b4a3a", 2),
        line(x + w * 0.73, y + h * 0.62, x + w * 0.73, y + h * 0.8, "#6b4a3a", 2),
        rect(x, y + h * 0.86, w, h * 0.14, "#e8c873"),
        poly([(x, y), (x + leaf, y + 6), (x + leaf, y + h - 4), (x, y + h)], WOOD_DARK),
        poly([(x + w, y), (x + w - leaf, y + 6), (x + w - leaf, y + h - 4), (x + w, y + h)], WOOD_DARK),
        rect(x - 8, y + h, w + 16, 6, STEP),
    ])


ROOFS = [0]


def tiles(points, top, bottom, left, right, fill=ROOF):
    """A tiled roof: its shape, with rows of scallops across it, kept within it"""
    ROOFS[0] += 1
    clip = f"roof-{ROOFS[0]}"
    shape = " ".join(f"{x},{y}" for x, y in points)
    out = [poly(points, fill), f'<clipPath id="{clip}"><polygon points="{shape}"/></clipPath><g clip-path="url(#{clip})">']
    y = top + 9
    while y < bottom - 3:
        x = left + 6
        while x < right - 10:
            out.append(f'<path d="M{x} {y} q6 5 12 0" stroke="{ROOF_DARK}" stroke-width="1.3" fill="none"/>')
            x += 14
        y += 10
    out.append("</g>")
    return "".join(out)


def railing(x1, x2, y, h, colour=FRAME, every=10):
    out = [line(x1, y, x2, y, colour, 2.5), line(x1, y + h, x2, y + h, colour, 2)]
    x = x1
    while x <= x2:
        out.append(line(x, y, x, y + h, colour, 1.5))
        x += every
    return "".join(out)


def pot(x, y, size=1.0, tall=False):
    """A pot of leaves, by the middle of its foot"""
    s = size
    out = [poly([(x - 14 * s, y - 26 * s), (x + 14 * s, y - 26 * s), (x + 10 * s, y), (x - 10 * s, y)], POT)]
    blobs = [(-10, -36), (0, -44), (10, -36), (-5, -30), (6, -30)] if not tall else \
        [(-8, -60), (6, -66), (0, -52), (-10, -44), (10, -46), (0, -38)]
    for idx, (bx, by) in enumerate(blobs):
        out.append(f'<circle cx="{x + bx * s}" cy="{y + by * s}" r="{10 * s}" fill="{LEAF[idx % len(LEAF)]}"/>')
    return "".join(out)


def porch(width, gy, fy, inset=24, flare=16):
    """The tiled porch floor along the front, from the foot of the walls out to its
    front edge, and the step down from it"""
    x0, x1 = inset, width - inset
    points = [(x0, gy), (x1, gy), (x1 + flare, fy), (x0 - flare, fy)]
    out = [poly(points, FLOOR)]
    for k in range(1, 3):
        y = gy + (fy - gy) * k / 3
        t = k / 3
        out.append(line(x0 - flare * t, y, x1 + flare * t, y, FLOOR_LINE, 1))
    n = 10
    for i in range(1, n):
        top = x0 + (x1 - x0) * i / n
        bottom = (x0 - flare) + (x1 - x0 + 2 * flare) * i / n
        out.append(line(top, gy, bottom, fy, FLOOR_LINE, 1))
    out.append(poly([(x0 - flare, fy), (x1 + flare, fy), (x1 + flare, fy + 20), (x0 - flare, fy + 20)], STEP))
    return "".join(out), points


def svg(width, height, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}">\n{body}\n</svg>\n')


houses = {}


def house(slug, width, height, body, porch_points, door_rect, eaves, pots):
    x, y, w, h = door_rect
    houses[slug] = {
        "size": {"width": width, "height": height},
        "porch": [{"x": px, "y": py} for px, py in porch_points],
        "door": {"left": x, "right": x + w, "top": y, "bottom": y + h},
        "eaves": [[{"x": a, "y": ey}, {"x": b, "y": ey}] for a, b, ey in eaves],
        "pots": [{"x": px, "y": py} for px, py in pots],
    }
    return svg(width, height, body)


def lakshmi_sadan():
    # Two storeys over shops: the family's door beside three rolling shutters, a
    # balcony and a vertical frame in front, railings on the roof
    W, H = 640, 440
    gy, fy = H - 100, H - 20
    floor, points = porch(W, gy, fy)
    b = [
        rect(40, 190, 560, 150, WALL),
        rect(30, 180, 580, 13, TRIM),
        rect(50, 70, 540, 112, WALL_2),
        rect(40, 60, 170, 130, WALL_LIGHT),
        window(70, 92, 110, 62, panes=3),
        railing(300, 590, 150, 30),
        window(325, 92, 60, 52), window(425, 92, 60, 52), window(520, 92, 52, 52),
        rect(250, 26, 40, 176, WALL_PALE), rect(262, 40, 16, 140, LIT),
        rect(50, 55, 540, 15, TRIM),
        railing(110, 245, 30, 25),
        rect(470, 18, 120, 38, WALL_2), *[rect(490 + i * 18, 28, 8, 18, LIT) for i in range(5)],
        rect(150, 120, 6, 6, LIT), rect(380, 122, 6, 6, LIT),
    ]
    for sx in (190, 325, 460):
        b.append(rect(sx, 222, 120, 10, "#422d3b"))
        b.append(rect(sx, 232, 120, 108, "#57323f"))
        for k in range(1, 14):
            b.append(line(sx, 232 + k * 8, sx + 120, 232 + k * 8, ROOF_DARK, 1.2))
    b.append(window(66, 248, 20, 40, panes=1))
    b.append(door(95, 225, 62, 115))
    pots = [(60, gy + 14), (176, gy + 14)]
    body = floor + "".join(b) + "".join(pot(x, y) for x, y in pots)
    return house("lakshmi-sadan", W, H, body, points, (95, 225, 62, 115), [(30, 610, 193)], pots)


def thulasi_mana():
    # A Kerala house: a wide sloping roof of red tiles over a verandah of wooden
    # pillars, and an upper floor under a steep gable with a wooden panel
    W, H = 620, 450
    gy, fy = H - 100, H - 20
    floor, points = porch(W, gy, fy)
    b = [
        rect(70, 232, 480, 118, WALL_2),
        window(110, 262, 70, 55, panes=2, frame=WOOD_DARK, grille=True),
        window(355, 262, 70, 55, panes=2, frame=WOOD_DARK, grille=True),
        window(465, 262, 60, 55, panes=2, frame=WOOD_DARK, grille=True),
        door(258, 235, 58, 115),
        *[rect(px - 5, 238, 10, 112, WOOD) for px in (82, 220, 440, 540)],
        rect(150, 95, 330, 104, WALL),
        tiles([(20, 240), (600, 240), (552, 192), (68, 192)], 192, 240, 20, 600),
        rect(16, 238, 588, 5, ROOF_DARK),
        window(262, 118, 82, 64, panes=3, rows=2, frame=WOOD_DARK),
        window(385, 118, 26, 56, panes=1, frame=WOOD_DARK),
        window(428, 118, 26, 56, panes=1, frame=WOOD_DARK),
        railing(160, 230, 160, 32, WOOD_DARK, 8),
        rect(160, 120, 70, 40, DARK),
        tiles([(110, 108), (305, 14), (505, 108), (485, 114), (305, 34), (130, 114)], 20, 110, 130, 480),
        poly([(195, 100), (305, 42), (415, 100)], WOOD_DARK),
        *[line(195 + i * 22, 100, 195 + i * 22, max(42, 100 - min(i * 22, 220 - i * 22) * 0.53), WOOD, 3) for i in range(1, 10)],
        rect(298, 60, 14, 24, LIT),
    ]
    pots = [(48, gy + 12), (575, gy + 12)]
    body = floor + "".join(b) + "".join(pot(x, y) for x, y in pots)
    return house("thulasi-mana", W, H, body, points, (258, 235, 58, 115), [(20, 600, 243), (130, 485, 114)], pots)


def sai_krupa():
    # A modern duplex: slabs and balconies with glass railings, a slatted fin
    # panel, a car porch, and a room on the terrace
    W, H = 600, 470
    gy, fy = H - 100, H - 20
    floor, points = porch(W, gy, fy)
    b = [
        rect(60, 240, 500, 130, WALL_PALE),
        rect(360, 250, 190, 120, DARK), rect(360, 250, 190, 8, FRAME),
        rect(546, 240, 14, 130, WALL_LIGHT),
        window(110, 272, 92, 58, panes=2),
        door(250, 255, 58, 115),
        rect(40, 226, 540, 15, TRIM),
        rect(60, 110, 500, 116, WALL_2),
        window(95, 136, 62, 52, panes=2),
        railing(60, 228, 194, 32, "#7a6a7e", 12),
        rect(332, 130, 42, 92, "#a8743a"), rect(336, 134, 34, 84, LIT),
        window(412, 136, 70, 52, panes=2),
        railing(312, 560, 194, 32, "#7a6a7e", 12),
        rect(232, 88, 70, 160, "#3a3040"),
        *[rect(238 + i * 12, 96, 6, 144, "#5b4a5a") for i in range(5)],
        rect(40, 96, 540, 15, TRIM),
        rect(200, 40, 200, 56, WALL_PALE),
        window(240, 56, 60, 28, panes=2),
        railing(60, 195, 70, 26, "#7a6a7e", 12),
        rect(190, 32, 220, 9, TRIM),
    ]
    pots = [(84, gy + 14), (336, gy + 14)]
    body = floor + "".join(b) + "".join(pot(x, y) for x, y in pots)
    return house("sai-krupa", W, H, body, points, (250, 255, 58, 115), [(40, 580, 241), (40, 580, 111)], pots)


def ganesh_kunj():
    # A white single-storey house: an arched verandah with brick-clad pillars and the
    # front door at its back, a window under a pediment, motifs along the parapet,
    # and a stair room on the roof
    W, H = 560, 400
    gy, fy = H - 100, H - 20
    floor, points = porch(W, gy, fy)
    b = [
        rect(70, 50, 120, 62, WALL_PALE), window(108, 66, 40, 26, panes=2), rect(62, 44, 136, 9, TRIM),
        rect(50, 130, 460, 170, WALL_PALE),
        rect(40, 110, 480, 24, "#6a5a6e"),
        railing(230, 330, 88, 22, "#8a7a8e", 10),
        '<path d="M66 300 L66 190 Q166 130 266 190 L266 300 Z" fill="#2c2135"/>',
        rect(66, 196, 200, 104, "#3a2e40"),
        door(140, 196, 56, 104),
        window(212, 222, 40, 40, panes=2),
        *[rect(px, 160, 20, 140, "#7a4a3a") for px in (48, 264)],
        *[line(px, 165 + k * 10, px + 20, 165 + k * 10, "#5c3a2e", 1) for px in (48, 264) for k in range(14)],
        poly([(330, 176), (395, 142), (460, 176)], "#6a5a6e"),
        *[line(395, 172, 395 + dx, 152 + abs(dx) * 0.35, "#8a7a8e", 1.5) for dx in (-40, -20, 0, 20, 40)],
        rect(330, 176, 130, 6, "#8a7a8e"),
        rect(330, 182, 12, 84, "#c8902a"), rect(448, 182, 12, 84, "#c8902a"),
        window(350, 186, 90, 76, panes=2, rows=2, frame=WOOD_DARK),
        *[f'<path d="M{x - 9} {128} q9 -16 18 0 z" fill="#e8890c"/><circle cx="{x}" cy="{116}" r="3.5" fill="#ffb347"/>' for x in (80, 280, 480)],
        rect(310, 280, 190, 20, "#5c3a2e"),
        *[f'<circle cx="{318 + i * 15}" cy="{278}" r="5.5" fill="{["#e8890c", "#d6336c", "#f2c14e"][i % 3]}"/>' for i in range(13)],
    ]
    pots = [(38, gy + 14)]
    body = floor + "".join(b) + "".join(pot(x, y) for x, y in pots)
    return house("ganesh-kunj", W, H, body, points, (140, 196, 56, 104), [(40, 520, 134), (66, 266, 168)], pots)


def anand_villa():
    # A modern single-storey house: flat roofs, a sloping one over the right, panels
    # of brown cladding and white strips, and wooden doors and windows
    W, H = 660, 420
    gy, fy = H - 100, H - 20
    floor, points = porch(W, gy, fy)
    b = [
        rect(40, 175, 580, 145, WALL_LIGHT),
        rect(30, 95, 200, 82, WALL_2),
        *[rect(70 + i * 30, 108, 14, 40, "#6b3f2e") for i in range(4)],
        *[line(30, 158 + k * 6, 230, 158 + k * 6, "#7a6a7e", 1.5) for k in range(3)],
        rect(230, 122, 220, 54, "#57323f"),
        *[line(230, 128 + k * 8, 450, 128 + k * 8, ROOF_DARK, 2) for k in range(6)],
        rect(240, 108, 70, 14, "#7a6a7e"),
        poly([(430, 176), (430, 98), (640, 140), (640, 176)], "#57323f"),
        *[rect(470 + i * 16, 112 + i * 3, 5, 64 - i * 3, "#8a7a8e") for i in range(3)],
        rect(205, 176, 270, 16, TRIM),
        rect(212, 192, 10, 128, "#7a6a7e"), rect(458, 192, 10, 128, "#7a6a7e"),
        window(80, 214, 96, 66, panes=3, rows=2, frame=WOOD_DARK),
        door(306, 205, 58, 115),
        window(395, 214, 52, 66, panes=2, rows=2, frame=WOOD_DARK),
        window(520, 214, 66, 58, panes=2, rows=2, frame=WOOD_DARK),
        rect(40, 300, 150, 20, "#3a2e40"), rect(500, 300, 120, 20, "#3a2e40"),
        *[f'<circle cx="{50 + i * 14}" cy="{300}" r="7" fill="{LEAF[i % 4]}"/>' for i in range(10)],
        *[f'<circle cx="{510 + i * 14}" cy="{300}" r="7" fill="{LEAF[i % 4]}"/>' for i in range(8)],
    ]
    pots = [(250, gy + 14)]
    body = floor + "".join(b) + "".join(pot(x, y, tall=True) for x, y in pots)
    return house("anand-villa", W, H, body, points, (306, 205, 58, 115), [(205, 475, 192), (30, 230, 177)], pots)


if __name__ == "__main__":
    out = sys.argv[1]
    for make in (lakshmi_sadan, thulasi_mana, sai_krupa, ganesh_kunj, anand_villa):
        text = make()
        slug = list(houses)[-1]
        open(f"{out}/{slug}.svg", "w").write(text)
    print(json.dumps(houses, indent=1))
