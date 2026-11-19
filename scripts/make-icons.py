"""Draws the Night Atlas mark: a softly shaded star (sphere) with a tilted orbit ring and one bead."""
# Usage: python3 scripts/make-icons.py assets/images   (needs Pillow)
import math, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

NIGHT = (12, 19, 34)
STAR = (243, 235, 216)
AURORA = (134, 205, 190)
SS = 4
TILT = 18  # degrees, ring rises to the right

def half_ring(S, cx, cy, rx, ry, w, front):
    """Mask of the ellipse outline, front (lower) or back (upper) half, rotated."""
    m = Image.new('L', (S, S), 0)
    e = w / 2  # PIL draws outlines inwards; widen the box so the line is centred on the orbit
    ImageDraw.Draw(m).ellipse([cx - rx - e, cy - ry - e, cx + rx + e, cy + ry + e], outline=255, width=int(w))
    cut = Image.new('L', (S, S), 0)
    ImageDraw.Draw(cut).rectangle([0, cy, S, S] if front else [0, 0, S, cy], fill=255)
    m = ImageChops.multiply(m, cut)
    return m.rotate(TILT, resample=Image.BICUBIC, center=(cx, cy))

def rotate_point(cx, cy, x, y):
    t = math.radians(TILT)
    dx, dy = x - cx, y - cy
    return cx + dx * math.cos(t) + dy * math.sin(t), cy - dx * math.sin(t) + dy * math.cos(t)

def mark(size, scale, bg=None, mono=None, glow=True, stars=True):
    S = size * SS
    img = Image.new('RGBA', (S, S), bg + (255,) if bg else (0, 0, 0, 0))
    cx = cy = S / 2
    r = S * 0.22 * scale
    rx, ry = r * 1.85, r * 0.5
    w = max(SS * 2, S * 0.02 * scale)
    ring = mono or AURORA

    if glow and not mono:
        g = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(g).ellipse([cx - r * 1.7, cy - r * 1.7, cx + r * 1.7, cy + r * 1.7], fill=STAR + (60,))
        img.alpha_composite(g.filter(ImageFilter.GaussianBlur(r * 0.6)))

    if stars and bg and not mono:
        d = ImageDraw.Draw(img)
        for fx, fy, fr in [(0.18, 0.2, 0.006), (0.8, 0.16, 0.004), (0.86, 0.8, 0.005), (0.14, 0.82, 0.004), (0.66, 0.88, 0.003)]:
            d.ellipse([S * fx - S * fr, S * fy - S * fr, S * fx + S * fr, S * fy + S * fr], fill=STAR + (120,))

    # back half of the orbit
    img.paste(Image.new('RGBA', (S, S), ring + (255,)), (0, 0), half_ring(S, cx, cy, rx, ry, w, False).point(lambda v: v * (0.55 if not mono else 1)))

    # the star, lit from the upper left
    sphere = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sphere)
    if mono:
        sd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=mono + (255,))
    else:
        lx, ly = cx - r * 0.35, cy - r * 0.4
        steps = 120
        for i in range(steps):
            t = i / (steps - 1)
            rr = r * (1 - t) + 1
            ox, oy = cx + (lx - cx) * t, cy + (ly - cy) * t
            shade = 0.5 + 0.5 * (t ** 0.55)
            sd.ellipse([ox - rr, oy - rr, ox + rr, oy + rr], fill=tuple(int(c * shade) for c in STAR) + (255,))
    img.alpha_composite(sphere)

    # a gap where the front of the ring crosses the star, then the ring itself
    gap = half_ring(S, cx, cy, rx, ry, w * 3.2, True)
    disk = Image.new('L', (S, S), 0)
    ImageDraw.Draw(disk).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    gap = ImageChops.multiply(gap, disk)
    if bg:
        img.paste(Image.new('RGBA', (S, S), bg + (255,)), (0, 0), gap)
    else:
        a = img.getchannel('A')
        img.putalpha(ImageChops.subtract(a, gap))
    img.paste(Image.new('RGBA', (S, S), ring + (255,)), (0, 0), half_ring(S, cx, cy, rx, ry, w, True))

    # one bead on the front of the orbit: a chapter read
    a = math.radians(28)
    bx, by = rotate_point(cx, cy, cx + rx * math.cos(a), cy + ry * math.sin(a))
    br = w * 1.7
    d = ImageDraw.Draw(img)
    d.ellipse([bx - br, by - br, bx + br, by + br], fill=(mono or STAR) + (255,))
    return img.resize((size, size), Image.LANCZOS)

out = sys.argv[1]
mark(1024, 1.0, bg=NIGHT).convert('RGB').save(f'{out}/icon.png')
mark(1024, 0.72).save(f'{out}/android-icon-foreground.png')
Image.new('RGB', (1024, 1024), NIGHT).save(f'{out}/android-icon-background.png')
mark(1024, 0.72, mono=(255, 255, 255)).save(f'{out}/android-icon-monochrome.png')
mark(512, 1.0).save(f'{out}/splash-icon.png')
mark(48, 1.15, bg=NIGHT, glow=False, stars=False).save(f'{out}/favicon.png')
mark(96, 1.1, mono=(255, 255, 255)).save(f'{out}/notification-icon.png')
