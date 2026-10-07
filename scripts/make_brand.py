#!/usr/bin/env python3
"""
Génère l'identité vectorielle de FoXhack à partir du wordmark fourni.

Entrée  : assets-src/wordmark-source.png  (dessin dans le canal alpha)
Sorties :
  - assets-src/brand/foxhack-wordmark.svg   wordmark complet « FoXhack »
  - assets-src/brand/foxhack-glyph.svg      symbole Ⓧ (O barré) seul
  - public/favicon.svg                      favicon vectoriel
  - public/icon-512.png                     icône PNG (favicon / apple-touch-icon)
  - src/components/icons/brandPaths.ts      chemins SVG pour les composants React

Dépendances : Pillow, numpy, scipy, potracer, cairosvg
Usage       : python3 scripts/make_brand.py
"""

from pathlib import Path

import cairosvg
import numpy as np
import potrace
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ASSETS_SRC = ROOT / "assets-src"
PUBLIC = ROOT / "public"
BRAND = ASSETS_SRC / "brand"
PUBLIC_BRAND = PUBLIC / "brand"
ICONS = ROOT / "src" / "components" / "icons"

VOID = "#07080a"
BONE = "#e9eae7"

INK_THRESHOLD = 110  # seuil de l'encre dans le canal alpha
INK_ROW_KEEP = 0.02  # fraction du profil conservée pour détecter la bande utile


# ---------------------------------------------------------------- utilitaires
def load_ink(path: Path) -> Image.Image:
    """Le wordmark est stocké en RGBA avec les RGB noirs : on reconstruit un
    masque `LA` blanc dont l'alpha porte le dessin."""
    source = Image.open(path).convert("RGBA")
    alpha = source.getchannel("A")
    return Image.merge("LA", (Image.new("L", source.size, 255), alpha))


def trim_ink(image: Image.Image, margin: int = 0) -> Image.Image:
    """Recadre sur l'encre réelle (ignore le vide et les projections isolées)."""
    a = np.array(image.getchannel("A")).astype(np.int32)
    rows, cols = a.sum(axis=1), a.sum(axis=0)
    ys = np.nonzero(rows > rows.max() * INK_ROW_KEEP)[0]
    xs = np.nonzero(cols > cols.max() * INK_ROW_KEEP)[0]
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    if margin:
        box = (box[0] - margin, box[1] - margin, box[2] + margin, box[3] + margin)
    return image.crop(box)


def glyph_from_wordmark(word: Image.Image) -> Image.Image:
    """Isole le symbole Ⓧ (O barré) : on part du plus grand trou fermé de
    l'anneau, puis on garde les composants connexes proches de son centre."""
    a = np.array(word.getchannel("A")).astype(np.int32)
    mask = a > 40

    holes = ndimage.binary_fill_holes(mask) & ~mask
    labels, count = ndimage.label(holes)
    if count == 0:
        raise RuntimeError("aucun trou détecté : impossible d'isoler le symbole")
    areas = ndimage.sum(np.ones_like(labels), labels, range(1, count + 1))
    biggest = int(np.argmax(areas)) + 1
    ys, xs = np.nonzero(labels == biggest)
    cx, cy = float(xs.mean()), float(ys.mean())
    radius = max(xs.max() - xs.min(), ys.max() - ys.min()) * 0.9

    components, ncomp = ndimage.label(mask, structure=np.ones((3, 3)))
    centroids = ndimage.center_of_mass(mask, components, range(1, ncomp + 1))
    sizes = ndimage.sum(np.ones_like(components), components, range(1, ncomp + 1))

    keep = np.zeros(ncomp + 1, dtype=bool)
    for index, (py, px) in enumerate(centroids, start=1):
        if sizes[index - 1] < 12:
            continue
        if ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5 < radius:
            keep[index] = True

    glyph_mask = keep[components]
    ys, xs = np.nonzero(glyph_mask)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)

    isolated = Image.merge(
        "LA",
        (Image.new("L", word.size, 255), Image.fromarray((glyph_mask * 255).astype("uint8"))),
    ).crop(box)

    # carré, avec un peu d'air
    side = int(max(isolated.size) * 1.10)
    square = Image.new("LA", (side, side), (255, 0))
    square.paste(isolated, ((side - isolated.width) // 2, (side - isolated.height) // 2))
    return square


def to_path(image: Image.Image, turdsize: int = 6, tolerance: float = 0.35) -> tuple[str, tuple[int, int]]:
    """Vectorise un masque alpha en chemin SVG (potrace)."""
    # ⚠️ potrace (via potracer) considère `True` comme FOND et `False` comme
    # forme : on inverse donc le masque d'encre, sinon le tracé remplit tout le
    # cadre et laisse les lettres en creux.
    ink = np.array(image.getchannel("A")) > INK_THRESHOLD
    traced = potrace.Bitmap(~ink).trace(
        turdsize=turdsize, alphamax=1.0, opticurve=1, opttolerance=tolerance
    )
    width, height = image.size
    parts: list[str] = []
    for curve in traced:
        start = curve.start_point
        parts.append(f"M{start.x:.0f} {start.y:.0f}")
        for segment in curve:
            end = segment.end_point
            if segment.is_corner:
                corner = segment.c
                parts.append(f"L{corner.x:.0f} {corner.y:.0f}L{end.x:.0f} {end.y:.0f}")
            else:
                c1, c2 = segment.c1, segment.c2
                parts.append(
                    f"C{c1.x:.0f} {c1.y:.0f} {c2.x:.0f} {c2.y:.0f} {end.x:.0f} {end.y:.0f}"
                )
        parts.append("Z")
    return "".join(parts), (width, height)


# -------------------------------------------------------------------- sorties
def svg_document(path_data: str, size: tuple[int, int], fill: str, background: str | None) -> str:
    width, height = size
    backdrop = f'<rect width="{width}" height="{height}" fill="{background}"/>' if background else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" role="img" aria-label="FoXhack">'
        f"{backdrop}"
        f'<path fill="{fill}" d="{path_data}"/>'
        "</svg>"
    )


def write_typescript(word: tuple[str, tuple[int, int]], glyph: tuple[str, tuple[int, int]]) -> Path:
    (word_d, word_size), (glyph_d, glyph_size) = word, glyph
    target = ICONS / "brandPaths.ts"
    target.write_text(
        f'''/**
 * Chemins SVG de l'identité FoXhack — GÉNÉRÉ AUTOMATIQUEMENT.
 *
 * Ne pas éditer à la main : lancer `python3 scripts/make_brand.py` après avoir
 * remplacé `assets-src/wordmark-source.png`.
 *
 * Le wordmark provient du dessin original de FoXhack (trait pinceau, O barré),
 * vectorisé avec potrace. Le glyphe est la lettre O barrée isolée : elle sert de
 * symbole compact (favicon, navbar, filigranes) là où le wordmark serait trop
 * large pour rester lisible.
 */

/** « FoXhack » — dessin complet, viewBox {word_size[0]}×{word_size[1]} (ratio {word_size[0] / word_size[1]:.2f}:1) */
export const WORDMARK = {{
  viewBox: '0 0 {word_size[0]} {word_size[1]}',
  ratio: {word_size[0] / word_size[1]:.3f},
  path:
    '{word_d}',
}} as const

/** « Ⓧ » — O barré seul, viewBox {glyph_size[0]}×{glyph_size[1]} (ratio 1:1) */
export const GLYPH = {{
  viewBox: '0 0 {glyph_size[0]} {glyph_size[1]}',
  ratio: 1,
  path:
    '{glyph_d}',
}} as const
''',
        encoding="utf-8",
    )
    return target


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    PUBLIC_BRAND.mkdir(parents=True, exist_ok=True)

    source = ASSETS_SRC / "wordmark-source.png"
    if not source.exists():
        raise SystemExit(f"! {source} introuvable — dépose le wordmark puis relance.")

    ink = load_ink(source)
    word_image = trim_ink(ink, margin=4)
    glyph_image = glyph_from_wordmark(word_image)
    print(f"wordmark : {word_image.size}")
    print(f"glyphe   : {glyph_image.size}")

    word_path, word_size = to_path(word_image, turdsize=12, tolerance=0.35)
    glyph_path, glyph_size = to_path(glyph_image, turdsize=6, tolerance=0.30)
    print(f"paths    : wordmark {len(word_path)} car. · glyphe {len(glyph_path)} car.")

    # SVG sources (blanc sur transparent : utilisables sur fond sombre)
    (BRAND / "foxhack-wordmark.svg").write_text(
        svg_document(word_path, word_size, BONE, background=None), encoding="utf-8"
    )
    (BRAND / "foxhack-glyph.svg").write_text(
        svg_document(glyph_path, glyph_size, BONE, background=None), encoding="utf-8"
    )
    # copies déployées : servies en statique et utilisées comme masques CSS
    for name in ("foxhack-wordmark.svg", "foxhack-glyph.svg"):
        (PUBLIC_BRAND / name).write_bytes((BRAND / name).read_bytes())
    print("→ assets-src/brand/foxhack-{wordmark,glyph}.svg")
    print("→ public/brand/foxhack-{wordmark,glyph}.svg")

    # favicon : glyphe clair sur tuile sombre
    gx, gy = glyph_size
    pad = round(max(gx, gy) * 0.16)
    canvas = max(gx, gy) + pad * 2
    offset_x, offset_y = (canvas - gx) // 2, (canvas - gy) // 2
    favicon = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas} {canvas}" '
        f'width="{canvas}" height="{canvas}" role="img" aria-label="FoXhack">'
        f'<rect width="{canvas}" height="{canvas}" rx="{round(canvas * 0.12)}" fill="{VOID}"/>'
        f'<g transform="translate({offset_x} {offset_y})"><path fill="{BONE}" d="{glyph_path}"/></g>'
        "</svg>"
    )
    (PUBLIC / "favicon.svg").write_text(favicon, encoding="utf-8")
    print("→ public/favicon.svg")

    # icône PNG 512 (favicon moderne + apple-touch-icon)
    icon_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {canvas} {canvas}">'
        f'<rect width="{canvas}" height="{canvas}" fill="{VOID}"/>'
        f'<g transform="translate({offset_x} {offset_y})"><path fill="{BONE}" d="{glyph_path}"/></g>'
        "</svg>"
    )
    cairosvg.svg2png(bytestring=icon_svg.encode(), write_to=str(PUBLIC / "icon-512.png"), output_width=512, output_height=512)
    print("→ public/icon-512.png")

    target = write_typescript((word_path, word_size), (glyph_path, glyph_size))
    print(f"→ {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
