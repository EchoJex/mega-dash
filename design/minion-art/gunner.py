"""python3 design/minion-art/gunner.py — draws the six GUNNER variants into variants/gunner-*.sprite.

The owner's ask (10 Nov 2026), on the rotor drone: "create a new flying minion [Gunner], based on
this variant, redraw it with a full palette, and with 6 variants". Each is built from simple
shapes, shaded from the top left, and outlined, so the six share one look and one palette.

Keys whose palette name starts with "body" are the colour each area's copy turns into its boss's
primary (design/minion-art/render.mjs does it for the canvas). Everything else stays as drawn.
"""
import math, os

PALETTE = [
    ('0', '#0A0A12', 'outline'),
    ('1', '#7FE0CC', 'body light'),
    ('2', '#309888', 'body'),
    ('3', '#1A5A50', 'body dark'),
    ('4', '#D8DEE8', 'metal light'),
    ('5', '#8E98AA', 'metal'),
    ('6', '#4E5668', 'metal dark'),
    ('7', '#FF4A3A', 'lens'),
    ('8', '#FFE2C8', 'lens glint'),
    ('9', '#A9D8FF', 'glass'),
    ('a', '#2A2E3A', 'barrel'),
    ('b', '#FFC640', 'muzzle'),
]
N = 16


class G:
    def __init__(self): self.g = [['.'] * N for _ in range(N)]
    def put(self, x, y, k):
        if 0 <= x < N and 0 <= y < N: self.g[y][x] = k
    def disc(self, cx, cy, rx, ry=None, ramp='123'):
        ry = ry or rx
        for y in range(N):
            for x in range(N):
                dx, dy = (x + .5 - cx) / rx, (y + .5 - cy) / ry
                if dx * dx + dy * dy <= 1:
                    t = -(dx + dy) / 1.4
                    self.put(x, y, ramp[0] if t > .35 else ramp[2] if t < -.3 else ramp[1])
    def rect(self, x0, y0, x1, y1, k):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.put(x, y, k)
    def outline(self):
        g = self.g
        add = [(x, y) for y in range(N) for x in range(N) if g[y][x] == '.' and any(
            0 <= x + a < N and 0 <= y + b < N and g[y + b][x + a] not in '.0'
            for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        for x, y in add: g[y][x] = '0'
        return self
    def text(self): return '\n'.join(''.join(r) for r in self.g)


def rotor(g, cx, y, frame, half=6):
    """A two-blade rotor seen from the side: full, three-quarter, edge-on, three-quarter."""
    w = [half, half * 2 // 3, 1, half * 2 // 3][frame]
    g.rect(cx - w, y, cx + w - 1, y, '4' if frame != 2 else '5')
    g.rect(cx - 1, y + 1, cx, y + 2, '6')   # mast


def lens(g, x, y):
    g.rect(x, y, x + 1, y + 1, '7'); g.put(x, y, '8')


def gun(g, x0, x1, y):
    g.rect(x0, y, x1, y, '5'); g.rect(x0, y + 1, x1, y + 1, 'a'); g.put(x0, y, 'b'); g.put(x0, y + 1, 'b')


def variant(name, draw):
    frames = []
    for f in range(4):
        g = G(); draw(g, f); frames.append(g.outline().text())
    return name, frames


def A(g, f):   # the rotor drone, redrawn: round pod, lens, a gun slung underneath
    rotor(g, 8, 1, f); g.disc(8, 8.5, 5); lens(g, 4, 7); gun(g, 2, 8, 12)

def B(g, f):   # twin guns: a wide pod with a gun at each side
    rotor(g, 8, 1, f); g.disc(8, 8.5, 6, 4.5); lens(g, 3, 6); gun(g, 0, 4, 9); gun(g, 0, 4, 12)

def C(g, f):   # bubble canopy: a glass dome on a metal hull, the eye inside the glass
    rotor(g, 8, 0, f); g.disc(8, 6.5, 4, 3.5, '999')
    g.disc(8, 10.5, 5.5, 3); lens(g, 6, 5); gun(g, 2, 6, 12)

def D(g, f):   # armoured: a squared-off hull with a long cannon
    rotor(g, 9, 1, f)
    g.rect(5, 4, 12, 4, '1'); g.rect(4, 5, 12, 10, '2'); g.rect(4, 5, 4, 10, '1'); g.rect(5, 11, 12, 11, '3')
    g.rect(12, 5, 12, 11, '3'); lens(g, 5, 6); gun(g, 0, 7, 8)

def E(g, f):   # twin rotors on arms, a small pod between them
    for cx in (3, 13):
        w = [2, 1, 0, 1][f]
        g.rect(cx - w, 2, cx + w, 2, '4'); g.rect(cx, 3, cx, 4, '6')
    g.rect(3, 5, 13, 5, '5'); g.disc(8, 9, 4); lens(g, 5, 8); gun(g, 2, 8, 12)

def F(g, f):   # spiked: a round pod bristling with antennae
    rotor(g, 8, 0, f, 5); g.disc(8, 8.5, 4.5)
    for x, y in ((2, 5), (14, 5), (2, 12), (14, 12)): g.put(x, y, '5')
    g.rect(3, 6, 3, 6, '6'); g.rect(13, 6, 13, 6, '6'); g.rect(3, 11, 3, 11, '6'); g.rect(13, 11, 13, 11, '6')
    lens(g, 5, 7); gun(g, 3, 8, 12)

def PICKED(g, f):
    """The owner's pick (10 Nov 2026): "everything about B, but the twin rotors of E"."""
    for cx in (3, 12):
        w = [2, 1, 0, 1][f]
        g.rect(cx - w, 1, cx + w, 1, '4'); g.rect(cx, 2, cx, 3, '6')
    g.rect(3, 4, 12, 4, '5')
    g.disc(8, 8.5, 6, 4.5); lens(g, 3, 6); gun(g, 0, 4, 9); gun(g, 0, 4, 12)



NOTES = {
    'a': 'ROTOR GUNNER: the rotor drone redrawn in full colour, its gun slung underneath',
    'b': 'TWIN GUNS: a wider pod with a gun at each side',
    'c': 'BUBBLE CANOPY: a glass dome on a metal hull, the eye inside the glass',
    'd': 'ARMOURED: a squared-off hull and a long cannon',
    'e': 'TWIN ROTORS: two small rotors on arms, a small pod between them',
    'f': 'SPIKED: a round pod bristling with antennae',
}

here = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'variants')
for key, fn in zip('abcdef', (A, B, C, D, E, F)):
    _, frames = variant(key, fn)
    head = ['# gunner', 'grid      16x16'] + [f'palette   {k} {h} {n}' for k, h, n in PALETTE]
    head.append(f"note      Variant {key.upper()}, {NOTES[key]}. Drawn by Claude at the owner's request, 2026-11-10.")
    body = [f'[fly {i + 1}] status=draft hold=4\n{fr}' for i, fr in enumerate(frames)]
    open(os.path.join(here, f'gunner-{key}.sprite'), 'w').write('\n'.join(head) + '\n\n' + '\n\n'.join(body) + '\n')
    print(f'gunner-{key}.sprite')

# THE PICKED GUNNER goes straight to design/sprites/gunner.sprite, mirrored so it faces right:
# the game draws a thing facing right and mirrors it to face left.
_, frames = variant('picked', PICKED)
frames = ['\n'.join(row[::-1] for row in fr.split('\n')) for fr in frames]
head = ['# gunner', 'grid      16x16', 'fudge     0.70 x 1.00'] + [f'palette   {k} {h} {n}' for k, h, n in PALETTE]
head.append('note      The GUNNER, PICKED (owner, 10 Nov 2026): "everything about B, but the twin rotors of E". '
            "Keys named body follow each area's boss colour; the lens is black in the Fire area. "
            "Drawn by Claude at the owner's request, 2026-11-10.")
body = [f'[fly {i + 1}] status=draft hold=4\n{fr}' for i, fr in enumerate(frames)]
open(os.path.join(here, '..', '..', 'sprites', 'gunner.sprite'), 'w', newline='\n').write('\n'.join(head) + '\n\n' + '\n\n'.join(body) + '\n')
print('design/sprites/gunner.sprite')
