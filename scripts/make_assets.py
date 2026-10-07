#!/usr/bin/env python3
"""
Génère les assets statiques du portfolio FoXhack :
  - public/og-image.png  1200x630  (OpenGraph / Twitter card)
  - public/icon-512.png  512x512   (favicon PNG / apple-touch-icon)
  - public/profile.jpg   1024x1024 (avatar, recadré depuis profile-placeholder.png)

Dépendance : Pillow.  Aucune ressource externe, aucun réseau.
Usage : python3 scripts/make_assets.py
"""

import hashlib
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
# Sources non déployées : le placeholder de portrait ne fait pas partie du build.
ASSETS_SRC = ROOT / "assets-src"

VOID = (7, 8, 10)
BONE = (233, 234, 231)
MUTED = (166, 171, 169)
DIM = (110, 116, 115)
SIGNAL = (178, 208, 206)
SIGNAL_DEEP = (44, 66, 68)
ALERT = (198, 88, 78)
OK = (142, 182, 156)

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
SANS_BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"
SANS = FONT_DIR / "DejaVuSans.ttf"
MONO = FONT_DIR / "DejaVuSansMono.ttf"
MONO_BOLD = FONT_DIR / "DejaVuSansMono-Bold.ttf"

# Emblème renard + X (mêmes proportions que src/components/icons/FoxMark.tsx)
FOX_HEAD = [
    (5.6, 5.4), (11.6, 10.0), (13.6, 9.6), (16.0, 9.25), (18.4, 9.6), (20.4, 10.0),
    (26.4, 5.4), (27.2, 15.3), (26.6, 18.5), (24.5, 21.6), (21.0, 24.3), (16.0, 26.6),
    (11.0, 24.3), (7.5, 21.6), (5.4, 18.5), (4.8, 15.3),
]
FOX_X = [((12.0, 14.2), (20.0, 22.2)), ((20.0, 14.2), (12.0, 22.2))]
UNIT = 32.0


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def glow(size, shapes, colour, blur, alpha):
    """Halo doux : formes dessinées puis floutées, composées en alpha."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for shape in shapes:
        draw.ellipse(shape, fill=colour + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def gradient(size, top, bottom):
    grad = Image.new("RGB", (1, size[1]))
    for y in range(size[1]):
        ratio = y / max(1, size[1] - 1)
        grad.putpixel((0, y), tuple(round(top[i] + (bottom[i] - top[i]) * ratio) for i in range(3)))
    return grad.resize(size, Image.BILINEAR)


def draw_spaced(draw, xy, text, fnt, fill, spacing=0):
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=fnt, fill=fill)
        x += draw.textlength(char, font=fnt) + spacing
    return x


def draw_fox_emblem(canvas, box, stroke=1.6, x_stroke=1.9, colour=BONE, x_colour=None):
    """Trace l'emblème renard + X dans `box` = (x, y, size) avec anti-aliasing 4x."""
    x, y, size = box
    ss = 4
    scale = (size * ss) / UNIT
    layer = Image.new("RGBA", (size * ss, size * ss), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    head = [(px * scale, py * scale) for px, py in FOX_HEAD]
    draw.line(head + [head[0]], fill=colour + (255,), width=max(1, round(stroke * scale)), joint="curve")

    if x_colour:
        mask = Image.new("L", layer.size, 0)
        mdraw = ImageDraw.Draw(mask)
        width = max(1, round(x_stroke * scale))
        for (x1, y1), (x2, y2) in FOX_X:
            mdraw.line((x1 * scale, y1 * scale, x2 * scale, y2 * scale), fill=255, width=width)
            for cx, cy in ((x1, y1), (x2, y2)):
                r = width / 2
                mdraw.ellipse(
                    (cx * scale - r, cy * scale - r, cx * scale + r, cy * scale + r), fill=255
                )
        layer.paste(gradient(layer.size, x_colour[0], x_colour[1]), (0, 0), mask)
    else:
        draw_x(draw, scale, x_stroke, ALERT + (255,))

    layer = layer.resize((size, size), Image.LANCZOS)
    canvas.alpha_composite(layer, (x, y))


def draw_x(draw, scale, x_stroke, fill):
    width = max(1, round(x_stroke * scale))
    for (x1, y1), (x2, y2) in FOX_X:
        draw.line((x1 * scale, y1 * scale, x2 * scale, y2 * scale), fill=fill, width=width)
        for cx, cy in ((x1, y1), (x2, y2)):
            r = width / 2
            draw.ellipse((cx * scale - r, cy * scale - r, cx * scale + r, cy * scale + r), fill=fill)


def circular_portrait(path: Path, diameter: int, enhance: tuple[float, float, float] = (1.16, 1.06, 0.94)):
    """Portrait recadré en cercle (anti-aliasing 4x), légèrement réhaussé."""
    from PIL import ImageEnhance

    with Image.open(path) as raw:
        image = ImageOps.exif_transpose(raw).convert("RGB")
        side = min(image.size)
        left = (image.width - side) // 2
        top = (image.height - side) // 2
        image = image.crop((left, top, left + side, top + side))
        image = ImageEnhance.Brightness(image).enhance(enhance[0])
        image = ImageEnhance.Contrast(image).enhance(enhance[1])
        image = ImageEnhance.Color(image).enhance(enhance[2])
        image = image.resize((diameter * 4, diameter * 4), Image.LANCZOS)

    mask = Image.new("L", (diameter * 4, diameter * 4), 0)
    ImageDraw.Draw(mask).ellipse((2, 2, diameter * 4 - 2, diameter * 4 - 2), fill=255)
    return image.resize((diameter, diameter), Image.LANCZOS), mask.resize((diameter, diameter), Image.LANCZOS)


def grid_layer(size, step=60, alpha=10):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    for gx in range(0, size[0], step):
        draw.line((gx, 0, gx, size[1]), fill=(255, 255, 255, alpha))
    for gy in range(0, size[1], step):
        draw.line((0, gy, size[0], gy), fill=(255, 255, 255, alpha))
    return layer


def draw_dashes(draw, box, dash, gap, colour):
    """Cercle en pointillés (approximation par segments courts)."""
    import math

    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    radius = (x1 - x0) / 2
    step = 2 * math.pi / 90
    angle = 0.0
    while angle < 2 * math.pi:
        for offset in (angle, angle + step):
            pass
        xa = cx + radius * math.cos(angle)
        ya = cy + radius * math.sin(angle)
        xb = cx + radius * math.cos(angle + step * (dash / (dash + gap)))
        yb = cy + radius * math.sin(angle + step * (dash / (dash + gap)))
        draw.line((xa, ya, xb, yb), fill=colour, width=1)
        angle += step


def brand_glyph(canvas, box):
    """Colle le glyphe Ⓧ officiel (vectorisé dans assets-src/brand) sur le canvas."""
    import cairosvg
    import io

    source = ROOT / "assets-src" / "brand" / "foxhack-glyph.svg"
    x, y, size = box
    if not source.exists():
        return
    png = cairosvg.svg2png(url=str(source), output_width=size * 4, output_height=size * 4)
    with Image.open(io.BytesIO(png)) as raw:
        glyph = raw.convert("RGBA").resize((size, size), Image.LANCZOS)
        tinted = Image.new("RGBA", glyph.size, (233, 234, 231, 0))
        tinted.putalpha(glyph.getchannel("A"))
        canvas.alpha_composite(tinted, (x, y))


def brand_wordmark(canvas, box):
    """Colle le wordmark « FoXhack » complet (SVG vectoriel) dans `box`."""
    import cairosvg
    import io

    source = ROOT / "assets-src" / "brand" / "foxhack-wordmark.svg"
    x, y, width = box
    if not source.exists():
        return
    ratio = 1290 / 384
    height = round(width / ratio)
    png = cairosvg.svg2png(url=str(source), output_width=width * 2, output_height=height * 2)
    with Image.open(io.BytesIO(png)) as raw:
        mark = raw.convert("RGBA").resize((width, height), Image.LANCZOS)
        tinted = Image.new("RGBA", mark.size, (233, 234, 231, 0))
        tinted.putalpha(mark.getchannel("A"))
        canvas.alpha_composite(tinted, (x, y))


def make_og():
    size = (1200, 630)
    img = Image.new("RGBA", size, VOID + (255,))
    img.alpha_composite(grid_layer(size, 60, 12))
    img.alpha_composite(glow(size, [(820, -260, 1500, 420)], SIGNAL_DEEP, 220, 120))
    img.alpha_composite(glow(size, [(-300, 400, 380, 1080)], (86, 30, 26), 200, 90))
    img.alpha_composite(glow(size, [(880, 360, 1330, 810)], SIGNAL, 240, 32))

    draw = ImageDraw.Draw(img)

    # barre supérieure fine
    draw.line((0, 0, size[0], 0), fill=(255, 255, 255, 40), width=1)

    # label de statut
    label = font(MONO, 20)
    x = 76
    x = draw_spaced(draw, (x, 84), "[", label, DIM, 1)
    x = draw_spaced(draw, (x, 84), " ● ", label, OK, 1)
    x = draw_spaced(draw, (x, 84), "ONLINE ]", label, OK, 1)
    draw_spaced(draw, (x + 12, 84), "—  SECURITY RESEARCH LAB", label, MUTED, 1)

    # titre : le wordmark dessiné de FoXhack (le vrai logo), repli typographique sinon
    wordmark_svg = ROOT / "assets-src" / "brand" / "foxhack-wordmark.svg"
    if wordmark_svg.exists():
        brand_wordmark(img, (68, 128, 800))
        draw.line((72, 396, 872, 396), fill=ALERT, width=3)
        sub_y, tag_y = 424, 480
    else:
        title = font(SANS_BOLD, 142)
        w_fo = draw.textlength("FoX", font=title)
        draw.text((72, 140), "FoX", font=title, fill=BONE)
        draw.text((72 + w_fo, 140), "hack", font=title, fill=SIGNAL)
        draw.line((76, 320, 76 + w_fo + draw.textlength("hack", font=title), 320), fill=ALERT, width=3)
        sub_y, tag_y = 352, 410

    # sous-titre monospace
    sub = font(MONO, 26)
    draw_spaced(draw, (76, sub_y), "OFFENSIVE SECURITY RESEARCHER", sub, BONE, 3)

    # baseline
    tag = font(SANS, 24)
    draw.text((76, tag_y), "Self-taught ethical hacker from France.", font=tag, fill=MUTED)
    draw.text(
        (76, tag_y + 36),
        "Breaking things to understand how they work.",
        font=tag,
        fill=DIM,
    )

    # pied : liens
    foot = font(MONO, 19)
    draw_spaced(
        draw,
        (76, 566),
        "github.com/F0X-hack   ·   root-me   ·   tryhackme   ·   hack the box",
        foot,
        DIM,
        1,
    )

    # Portrait de l'aperçu de partage.
    # Deux photos sur le site : celle du hero (portrait serré) et celle du whoami.
    # C'est celle du HERO qu'on veut voir dans les aperçus — pour en changer,
    # il suffit de réordonner cette liste.
    portrait_path = None
    for candidate in (
        ASSETS_SRC / "profile-hero-source.jpg",
        ASSETS_SRC / "profile-source.jpg",
        ASSETS_SRC / "profile-source.png",
        PUBLIC / "profile.jpg",
    ):
        if candidate.exists():
            portrait_path = candidate
            break
    print(f"  (portrait de l’aperçu : {portrait_path.name if portrait_path else 'emblème dessiné'})")

    if portrait_path is not None:
        diameter = 260
        px, py = 872, 168
        photo, mask = circular_portrait(portrait_path, diameter)
        img.paste(photo, (px, py), mask)

        ring = Image.new("RGBA", size, (0, 0, 0, 0))
        rdraw = ImageDraw.Draw(ring)
        rdraw.ellipse((px - 12, py - 12, px + diameter + 12, py + diameter + 12), outline=BONE + (70,), width=1)
        rdraw.ellipse((px - 22, py - 22, px + diameter + 22, py + diameter + 22), outline=SIGNAL + (60,), width=1)
        draw_dashes(rdraw, (px - 22, py - 22, px + diameter + 22, py + diameter + 22), 3, 9, SIGNAL + (40,))
        img.alpha_composite(ring)

        # signature : le glyphe Ⓧ de FoXhack en haut à droite
        brand_glyph(img, (1096, 62, 44))
    else:
        draw_fox_emblem(img, (860, 150, 280), stroke=2.2, x_stroke=2.6)

    # Nom horodaté par le contenu : les plateformes (Discord, WhatsApp, Facebook,
    # LinkedIn…) gardent les aperçus en cache très longtemps. Quand l'image change,
    # l'URL change aussi — l'ancienne ne peut plus être resservie.
    import hashlib
    import io

    buffer = io.BytesIO()
    img.convert("RGB").convert("P", palette=Image.ADAPTIVE, colors=128).save(
        buffer, format="PNG", optimize=True
    )
    data = buffer.getvalue()
    digest = hashlib.sha256(data).hexdigest()[:8]
    target = PUBLIC / f"og-image-{digest}.png"
    target.write_bytes(data)

    for stale in PUBLIC.glob("og-image-*.png"):
        if stale != target:
            stale.unlink()
            print(f"  (ancien aperçu supprimé : {stale.name})")
    legacy = PUBLIC / "og-image.png"
    if legacy.exists():
        legacy.unlink()
        print("  (ancien aperçu supprimé : og-image.png)")

    print(f"→ public/{target.name}  ({len(data) // 1024} Ko)")

    # tout ce qui référence l'aperçu doit suivre
    for rel in ("index.html", "public/sitemap.xml", "scripts/smoke-render.tsx", "src/data/profile.ts"):
        path = ROOT / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        updated = re.sub(r"og-image(?:-[0-9a-f]{8})?\.png", target.name, text)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            print(f"  ({rel} → {target.name})")


def make_icon():
    size = 512
    img = Image.new("RGBA", (size, size), VOID + (255,))
    img.alpha_composite(glow((size, size), [(60, 60, 452, 452)], SIGNAL_DEEP, 90, 90))
    draw_fox_emblem(
        img, (72, 72, 368), stroke=1.7, x_stroke=2.0, x_colour=(SIGNAL, ALERT)
    )
    img.convert("RGB").save(PUBLIC / "icon-512.png", optimize=True)
    print("→ public/icon-512.png")


def write_hashed_portrait(image, prefix: str):
    """Écrit public/<prefix>-<hash>.jpg et renvoie le chemin du fichier.

    Le hash dans le nom sert de cache-busting : quand la photo change, l'URL
    change, donc un navigateur ne peut pas resservir l'ancien portrait.
    """
    import io

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=86, optimize=True, progressive=True)
    data = buffer.getvalue()
    digest = hashlib.sha256(data).hexdigest()[:8]

    target = PUBLIC / f"{prefix}-{digest}.jpg"
    target.write_bytes(data)

    # Les préfixes sont distincts : "profile-<hex>" n'attrape jamais
    # "profile-hero-<hex>" (le "h" n'est pas un chiffre hexadécimal).
    for stale in PUBLIC.glob(f"{prefix}-[0-9a-f]*.jpg"):
        if stale != target:
            stale.unlink()
            print(f"  (ancien {prefix} supprimé : {stale.name})")

    return target


def set_profile_field(field: str, value: str):
    """Remplace `field: '…'` dans src/data/profile.ts (une seule occurrence)."""
    import re

    data_file = ROOT / "src" / "data" / "profile.ts"
    if not data_file.exists():
        return
    source = data_file.read_text(encoding="utf-8")
    updated = re.sub(rf"{field}: '[^']*'", f"{field}: '{value}'", source, count=1)
    if updated != source:
        data_file.write_text(updated, encoding="utf-8")
        print(f"  (src/data/profile.ts → {field}: '{value}')")


def prepare_portrait(source) -> "Image.Image":
    """Carré 900 px, cadrage vers le haut, légèrement réhaussé pour le thème sombre."""
    with Image.open(source) as raw:
        image = ImageOps.exif_transpose(raw).convert("RGB")
        side = min(image.size)
        left = (image.width - side) // 2
        # Cadrage portrait : sur une photo verticale, on vise le haut (la tête),
        # pas le centre géométrique qui couperait le visage.
        top = int((image.height - side) * 0.28)
        image = image.crop((left, top, left + side, top + side)).resize((900, 900), Image.LANCZOS)
        image = ImageEnhance.Brightness(image).enhance(1.18)
        image = ImageEnhance.Contrast(image).enhance(1.08)
        image = ImageEnhance.Color(image).enhance(0.92)
    return image


def make_profile():
    """Deux portraits distincts, deux emplacements :

      profile-<hash>.jpg       → section « who am i »   (assets-src/profile-source.jpg)
      profile-hero-<hash>.jpg  → hero, à côté du nom    (assets-src/profile-hero-source.jpg)
    """
    jobs = [
        ("profile", ASSETS_SRC / "profile-source.jpg", "avatar"),
        ("profile-hero", ASSETS_SRC / "profile-hero-source.jpg", "avatarHero"),
    ]
    for prefix, source, field in jobs:
        if not source.exists():
            print(f"! {source.name} absent — {field} non généré")
            continue
        target = write_hashed_portrait(prepare_portrait(source), prefix)
        set_profile_field(field, f"/{target.name}")
        print(f"→ public/{target.name}  ({field})")


def write_hashed_badge(image, slug: str):
    """Écrit public/badges/<slug>-<hash>.png et met à jour src/data/platforms.ts.

    Même logique que l'avatar : le hash dans le nom sert de cache-busting, une
    nouvelle pastille ne peut donc pas rester invisible derrière l'ancienne.
    """
    import hashlib
    import io
    import re

    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    data = buffer.getvalue()
    digest = hashlib.sha256(data).hexdigest()[:8]

    folder = PUBLIC / "badges"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"{slug}-{digest}.png"
    target.write_bytes(data)

    for stale in folder.glob(f"{slug}-*.png"):
        if stale != target:
            stale.unlink()
            print(f"  (ancienne pastille supprimée : {stale.name})")

    data_file = ROOT / "src" / "data" / "platforms.ts"
    if data_file.exists():
        source = data_file.read_text(encoding="utf-8")
        updated = re.sub(
            r"rankBadge: '[^']*'", f"rankBadge: '/badges/{target.name}'", source, count=1
        )
        if updated != source:
            data_file.write_text(updated, encoding="utf-8")
            print(f"  (src/data/platforms.ts → /badges/{target.name})")

    return target


def make_htb_badge():
    """Détache la pastille de rang HTB de son fond blanc.

    La source est un visuel carré sur fond blanc opaque : on remplit le fond
    depuis les quatre coins (le seuil s'arrête sur les bleus de l'emblème, et
    les zones claires *internes* ne sont pas atteintes car elles ne touchent
    pas le bord), on adoucit le contour d'un pixel puis on recadre.
    """
    source = ASSETS_SRC / "htb-apprentice-source.png"
    if not source.exists():
        print(f"! {source.name} absent — pastille non générée")
        return

    with Image.open(source) as raw:
        image = raw.convert("RGB")

    width, height = image.size
    work = image.copy()
    sentinel = (255, 0, 255)
    for seed in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        if work.getpixel(seed) != sentinel:
            ImageDraw.floodfill(work, seed, sentinel, thresh=55)

    # alpha : 0 sur le fond rempli, 255 sur le dessin
    mask = [
        0 if (r > 250 and g < 6 and b > 250) else 255
        for (r, g, b) in work.getdata()
    ]
    alpha = Image.new("L", work.size)
    alpha.putdata(mask)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))

    badge = image.convert("RGBA")
    badge.putalpha(alpha)

    box = badge.getbbox()
    if box:
        pad = 4
        badge = badge.crop(
            (
                max(box[0] - pad, 0),
                max(box[1] - pad, 0),
                min(box[2] + pad, badge.width),
                min(box[3] + pad, badge.height),
            )
        )

    target = write_hashed_badge(badge, "htb-apprentice")
    print(f"→ public/badges/{target.name}  ({badge.width}x{badge.height})")


if __name__ == "__main__":
    PUBLIC.mkdir(parents=True, exist_ok=True)
    make_og()
    make_icon()
    make_profile()
    make_htb_badge()
