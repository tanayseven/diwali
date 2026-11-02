"""Draws the akash kandil's sprites into public/sprites/kandil/.

A kandil is built up in layers, each its own SVG on the same 200 x 480 canvas so they
line up: its bamboo frame, the paper it's wrapped in, in each colour, and the tails
hanging below, in each colour. The bulb that lights it is a small drawing of its own.

Run it from the repository's root after changing it:

    python3 scripts/kandil-sprites.py
"""

import math
import random
from pathlib import Path

out_dir = Path("public/sprites/kandil")

# The lantern's body: a band on top, a hexagon of four faces, and a band below, with
# the tails hanging from the bottom band's lower edge
TL, TR = (55, 58), (145, 58)
L, R = (15, 121.5), (185, 121.5)
BL, BR = (55, 185), (145, 185)
C = (100, 110)
top_tri = [TL, TR, C]
front_tri = [C, BR, BL]
left_quad = [TL, C, BL, L]
right_quad = [TR, R, BR, C]
top_band = (55, 20)
bottom_band = (55, 185)
band_size = (90, 37)
tails_top = 222

# Each paper's colours: the four faces, the front face's frame, which takes on its
# colour in the light, and each band's panel and windows
papers = {
    "mixed": {
        "left": "#FF1F4D", "right": "#F1FF33", "top": "#A8FF2E", "front": "#FF3D80", "front_frame": "#D9576A",
        "top_band": ("#E8254B", "#FFC4D3"), "bottom_band": ("#E59A83", "#C8FF3A"),
    },
    "red": {
        "left": "#E8182F", "right": "#FF4A4A", "top": "#FF7A5A", "front": "#FF2E55", "front_frame": "#B8323F",
        "top_band": ("#D81E36", "#FFC2B8"), "bottom_band": ("#D81E36", "#FFD54A"),
    },
    "orange": {
        "left": "#FF7A12", "right": "#FFB01F", "top": "#FFD03D", "front": "#FF8E2B", "front_frame": "#D26A3A",
        "top_band": ("#F06A10", "#FFE2A8"), "bottom_band": ("#F06A10", "#FFE14A"),
    },
    "blue": {
        "left": "#1E7BFF", "right": "#3FC4FF", "top": "#7FE0FF", "front": "#3A5BFF", "front_frame": "#4B5FB8",
        "top_band": ("#2350D8", "#BFE6FF"), "bottom_band": ("#2350D8", "#7FF0FF"),
    },
}

# Each set of tails' colours: the strips in front, top to bottom, those at the back
# either side and in the middle, and the scalloped edge they hang from
tails = {
    "mixed": {"front": ("#B6FF3C", "#4FD43A", "#16903A"), "sides": ("#FF4A6A", "#B8143A"),
              "middle": ("#FFF35A", "#E0A21C"), "edge": "#9CF23A"},
    "green": {"front": ("#B6FF3C", "#4FD43A", "#16903A"), "sides": ("#8BE04A", "#1F7A34"),
              "middle": ("#D8FF6A", "#5FB83A"), "edge": "#9CF23A"},
    "red": {"front": ("#FF6A7A", "#F0243F", "#A80F2A"), "sides": ("#FF8FB0", "#C21E5A"),
            "middle": ("#FFB04A", "#D8542A"), "edge": "#FF5A6A"},
    "gold": {"front": ("#FFF35A", "#F5C21C", "#C07A10"), "sides": ("#FFB84A", "#C8601A"),
             "middle": ("#FFFBB0", "#E8B830"), "edge": "#FFE14A"},
}


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def pts(p):
    return " ".join(f"{f(x)},{f(y)}" for x, y in p)


def scallops(a, b, r=2.6):
    (x1, y1), (x2, y2) = a, b
    n = max(1, round(math.hypot(x2 - x1, y2 - y1) / (r * 2)))
    return "".join(
        f'<circle cx="{f(x1 + (x2 - x1) * (i + 0.5) / n)}" cy="{f(y1 + (y2 - y1) * (i + 0.5) / n)}" r="{r}"/>'
        for i in range(n))


def inset(poly, s):
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    return [(cx + (x - cx) * s, cy + (y - cy) * s) for x, y in poly]


def svg(title, body, defs="", size=(200, 480)):
    w, h = size
    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w * 2}" height="{h * 2}" viewBox="0 0 {w} {h}">',
        f"  <title>{title}</title>",
        *([f"  <defs>\n{defs}\n  </defs>"] if defs else []),
        *body,
        "</svg>",
        "",
    ])


def frame():
    """The bamboo frame, tied at its joints, with the string it hangs from."""
    sticks = [
        [TL, TR, R, BR, BL, L, TL],
        [TL, C, BR], [TR, C, BL],
        [(55, 20), (145, 20), (145, 57), (55, 57), (55, 20)],
        [(55, 186), (145, 186), (145, 222), (55, 222), (55, 186)],
    ]
    paths = " ".join("M" + " L".join(f"{f(x)} {f(y)}" for x, y in stick) for stick in sticks)
    joints = [TL, TR, L, R, BL, BR, C, (55, 20), (145, 20), (55, 222), (145, 222)]
    return svg("Akash kandil — Bamboo frame", [
        '  <path d="M100 0 V20" stroke="#F4ECE4" stroke-width="1.6"/>',
        f'  <path d="{paths}" fill="none" stroke="#7A4E22" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>',
        f'  <path d="{paths}" fill="none" stroke="#C99251" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>',
        f'  <path d="{paths}" fill="none" stroke="#EBC488" stroke-width="0.6" stroke-linejoin="round" stroke-linecap="round" transform="translate(-0.4 -0.4)"/>',
        "  <g fill=\"#5A3414\">" + "".join(
            f'<rect x="{f(x - 2)}" y="{f(y - 2)}" width="4" height="4" rx="1.2"/>' for x, y in joints) + "</g>",
    ])


def paper(name, colours):
    """The paper the frame's wrapped in: scalloped all round, with a punched coloured
    sheet in each face and windows in each band."""
    defs = []
    for pattern, angle in [("holes", 0), ("holes-left", -32.5), ("holes-right", 32.5)]:
        defs += [
            f'    <pattern id="{pattern}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate({angle} 100 110)">',
            '      <circle cx="3" cy="3" r="0.9" fill="#3A0A12" fill-opacity="0.75"/>',
            "    </pattern>",
        ]
    body = []
    w = body.append
    outline = [(55, 20), (145, 20), TR, R, BR, (145, 222), (55, 222), BL, L, TL]
    w('  <g fill="#FBEFE2">' + "".join(
        scallops(outline[i], outline[(i + 1) % len(outline)]) for i in range(len(outline))) + "</g>")
    # The bands' sides, seen just past their fronts
    w('  <path d="M55 20 L50 23 V55 L55 58 Z M145 20 L150 23 V55 L145 58 Z" fill="#E9D3BF"/>')
    w('  <path d="M55 185 L50 188 V219 L55 222 Z M145 185 L150 188 V219 L145 222 Z" fill="#E9D3BF"/>')
    w('  <g fill="#FBEFE2">' + scallops((50, 23), (50, 55), r=1.8) + scallops((150, 23), (150, 55), r=1.8)
      + scallops((50, 188), (50, 219), r=1.8) + scallops((150, 188), (150, 219), r=1.8) + "</g>")

    def band(y, panel, window):
        w(f'  <rect x="55" y="{y}" width="90" height="37" fill="#FBEFE2"/>')
        w(f'  <rect x="58" y="{y + 3}" width="84" height="31" rx="1.5" fill="{panel}"/>')
        for i in range(4):
            wx = 61 + i * 20.5
            w(f'  <rect x="{f(wx)}" y="{y + 7.5}" width="16" height="22" rx="3" fill="{window}"/>')
            w('  <g fill="#3A0A12" fill-opacity="0.7">' + "".join(
                f'<circle cx="{f(wx + dx)}" cy="{f(y + 7.5 + dy)}" r="1"/>' for dx in (3, 13) for dy in (3, 19)) + "</g>")
        w(f'  <path d="M58 {f(y + 18.5)} H142" stroke="#3A0A12" stroke-opacity="0.35" stroke-width="0.6"/>')
        w('  <g fill="#2A0810">' + "".join(
            f'<rect x="{f(78 + i * 20.5)}" y="{f(y + 17.5)}" width="2" height="2"/>' for i in range(3)) + "</g>")

    band(top_band[1], *colours["top_band"])
    band(bottom_band[1], *colours["bottom_band"])

    def face(poly, frame_colour, sheet, holes, s):
        w(f'  <polygon points="{pts(poly)}" fill="{frame_colour}" stroke="#C99E86" stroke-width="0.8" stroke-linejoin="round"/>')
        inner = pts(inset(poly, s))
        w(f'  <polygon points="{inner}" fill="{sheet}" stroke="{sheet}" stroke-width="4" stroke-linejoin="round"/>')
        w(f'  <polygon points="{inner}" fill="url(#{holes})"/>')

    face(left_quad, "#FBEFE2", colours["left"], "holes-left", 0.72)
    face(right_quad, "#FBEFE2", colours["right"], "holes-right", 0.72)
    face(top_tri, "#F6E3D2", colours["top"], "holes", 0.6)
    face(front_tri, colours["front_frame"], colours["front"], "holes", 0.6)
    # Sequins catching the light on the left face
    w('  <g fill="#FFFFFF" fill-opacity="0.8">' + "".join(
        f'<circle cx="{x}" cy="{y}" r="0.9"/>' for x, y in [(52, 95), (60, 108), (44, 120), (66, 128), (50, 140), (58, 155)]) + "</g>")
    return svg(f"Akash kandil — {name.capitalize()} paper", body, "\n".join(defs))


def tail_strips(name, colours):
    """The tails: a few strips at the back either side and in the middle, and a fringe
    in front, each wavy and punched with holes, hanging from a scalloped edge."""
    rng = random.Random(7)
    defs = []
    for gradient, stops in [("front", colours["front"]), ("sides", colours["sides"]), ("middle", colours["middle"])]:
        defs.append(f'    <linearGradient id="{gradient}" x1="0" y1="{tails_top}" x2="0" y2="470" gradientUnits="userSpaceOnUse">')
        defs += [f'      <stop offset="{f(i / (len(stops) - 1))}" stop-color="{stop}"/>' for i, stop in enumerate(stops)]
        defs.append("    </linearGradient>")
    body = []
    w = body.append

    def strip(x, width, length, fill, sway):
        top = tails_top + 4
        bottom = top + length
        mid = (top + bottom) / 2
        w(f'  <path d="M{f(x)} {top} Q{f(x + sway)} {f(mid)} {f(x + sway * 0.4)} {f(bottom)} '
          f'L{f(x + width + sway * 0.4)} {f(bottom - 1.5)} Q{f(x + width + sway)} {f(mid)} {f(x + width)} {top} Z" fill="url(#{fill})"/>')
        holes, sequins = [], []
        y = top + 5
        while y < bottom - 4:
            t = (y - top) / length
            # Follows the strip's curve, near enough
            cx = x + width / 2 + sway * (2 * t * (1 - t) + 0.4 * t * t)
            (sequins if rng.random() < 0.18 else holes).append(f'<circle cx="{f(cx)}" cy="{f(y)}" r="0.85"/>')
            y += 5.5
        w('  <g fill="#0E1A14" fill-opacity="0.5">' + "".join(holes) + "</g>")
        w('  <g fill="#FFFFFF" fill-opacity="0.85">' + "".join(sequins) + "</g>")

    for x, length, sway in [(44, 215, -14), (50, 238, -9), (146, 236, 9), (152, 210, 13)]:
        strip(x, 5, length, "sides", sway)
    for x, length, sway in [(84, 200, -4), (98, 228, 3), (112, 190, 5)]:
        strip(x, 5, length, "middle", sway)
    fronts = 12
    for i in range(fronts):
        x = 52 + i * (96 - 5.5) / (fronts - 1)
        length = rng.uniform(190, 245)
        sway = (i - (fronts - 1) / 2) * 1.1 + rng.uniform(-3, 3)
        strip(x, 5.5, length, "front", sway)
    w(f'  <rect x="52" y="{tails_top - 1}" width="96" height="6" fill="{colours["edge"]}"/>')
    w(f'  <g fill="{colours["edge"]}">' + scallops((52, tails_top + 5), (148, tails_top + 5), r=2.2) + "</g>")
    return svg(f"Akash kandil — {name.capitalize()} tails", body, "\n".join(defs))


def bulb():
    """A warm little bulb to light a kandil with, on its screw base."""
    return svg("Akash kandil — Bulb", [
        '  <path d="M30 6 C14 6 6 18 6 30 C6 41 14 47 19 54 C21 57 21 60 21 63 H39 C39 60 39 57 41 54 '
        'C46 47 54 41 54 30 C54 18 46 6 30 6 Z" fill="#FFE58A" stroke="#E0A93A" stroke-width="1.5"/>',
        '  <path d="M16 22 C18 15 23 12 28 11" stroke="#FFFFFF" stroke-opacity="0.8" stroke-width="3" fill="none" stroke-linecap="round"/>',
        '  <path d="M25 63 V44 L28 38 L30 44 L32 38 L35 44 V63" stroke="#B5752A" stroke-width="1.2" fill="none"/>',
        '  <rect x="20" y="63" width="20" height="16" rx="2" fill="#B9BEC6"/>',
        '  <path d="M20 67 H40 M20 71 H40 M20 75 H40" stroke="#7D838C" stroke-width="1.2"/>',
        '  <path d="M24 79 H36 L33 85 H27 Z" fill="#4A4E55"/>',
    ], size=(60, 90))


def main():
    out_dir.mkdir(parents=True, exist_ok=True)
    sprites = {"frame.svg": frame(), "bulb.svg": bulb()}
    sprites.update({f"paper-{name}.svg": paper(name, colours) for name, colours in papers.items()})
    sprites.update({f"tails-{name}.svg": tail_strips(name, colours) for name, colours in tails.items()})
    for file, content in sprites.items():
        (out_dir / file).write_text(content)


main()
