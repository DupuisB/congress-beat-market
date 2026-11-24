"""Stitch per-beat PNG screenshots into labeled desktop and mobile contact sheets."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ARTIFACTS_DIR = REPO_ROOT / "audit" / "artifacts"

PAPER_BG = (250, 248, 245)  # #FAF8F5
SURFACE_BG = (241, 237, 230)  # #F1EDE6
HAIRLINE = (221, 215, 204)  # #DDD7CC
INK_PRIMARY = (23, 22, 20)  # #171614
INK_MUTED = (92, 88, 82)  # #5C5852
ACCENT = (217, 78, 42)  # #D94E2A


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


def stitch_sheet(
    input_dir: Path,
    output_path: Path,
    title: str,
    cols: int,
    thumb_width: int,
) -> Path:
    png_paths = sorted(input_dir.glob("*.png"))
    if not png_paths:
        raise FileNotFoundError(f"No PNG screenshots found in {input_dir}")

    tiles: list[tuple[str, Image.Image]] = []
    for png_path in png_paths:
        with Image.open(png_path) as img:
            rgb = img.convert("RGB")
            scale = thumb_width / rgb.width
            thumb_height = max(1, round(rgb.height * scale))
            resized = rgb.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
            tiles.append((png_path.stem, resized))

    tile_w = max(im.width for _, im in tiles)
    tile_h = max(im.height for _, im in tiles)

    effective_cols = min(cols, len(tiles))
    rows = math.ceil(len(tiles) / effective_cols)

    padding = 32
    gutter = 24
    header_h = 68
    label_h = 34

    sheet_w = padding * 2 + effective_cols * tile_w + (effective_cols - 1) * gutter
    sheet_h = padding * 2 + header_h + rows * (tile_h + label_h) + max(0, rows - 1) * gutter

    sheet = Image.new("RGB", (sheet_w, sheet_h), PAPER_BG)
    draw = ImageDraw.Draw(sheet)

    title_font = _load_font(22)
    meta_font = _load_font(14)
    label_font = _load_font(15)

    # Top accent bar
    draw.rectangle([(0, 0), (sheet_w, 4)], fill=ACCENT)

    # Header text & divider
    draw.text((padding, padding), title, fill=INK_PRIMARY, font=title_font)
    draw.text(
        (padding, padding + 32),
        f"{len(tiles)} beats · Tier A verification contact sheet",
        fill=INK_MUTED,
        font=meta_font,
    )
    divider_y = padding + header_h - 10
    draw.line([(padding, divider_y), (sheet_w - padding, divider_y)], fill=HAIRLINE, width=1)

    for idx, (stem, tile) in enumerate(tiles):
        row = idx // effective_cols
        col = idx % effective_cols
        x = padding + col * (tile_w + gutter)
        y = padding + header_h + row * (tile_h + label_h + gutter)

        # Label strip
        draw.rectangle(
            [(x, y), (x + tile_w, y + label_h)],
            fill=SURFACE_BG,
            outline=HAIRLINE,
            width=1,
        )
        draw.text((x + 10, y + 8), stem, fill=INK_PRIMARY, font=label_font)

        # Screenshot image + hairline frame
        img_y = y + label_h
        sheet.paste(tile, (x, img_y))
        draw.rectangle(
            [(x, img_y), (x + tile.width - 1, img_y + tile.height - 1)],
            outline=HAIRLINE,
            width=1,
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path, format="PNG", optimize=True)
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Stitch per-beat PNG screenshots into desktop and mobile contact sheets."
    )
    parser.add_argument(
        "--artifacts-dir",
        type=Path,
        default=DEFAULT_ARTIFACTS_DIR,
        help="Root artifacts directory containing desktop/ and mobile/ subdirectories.",
    )
    parser.add_argument(
        "--desktop-cols",
        type=int,
        default=3,
        help="Number of columns for desktop contact sheet.",
    )
    parser.add_argument(
        "--mobile-cols",
        type=int,
        default=3,
        help="Number of columns for mobile contact sheet.",
    )
    args = parser.parse_args()

    artifacts_dir: Path = args.artifacts_dir
    desktop_dir = artifacts_dir / "desktop"
    mobile_dir = artifacts_dir / "mobile"

    desktop_out = stitch_sheet(
        input_dir=desktop_dir,
        output_path=artifacts_dir / "contact-sheet-desktop.png",
        title="Desktop Contact Sheet (1280×800)",
        cols=args.desktop_cols,
        thumb_width=640,
    )
    mobile_out = stitch_sheet(
        input_dir=mobile_dir,
        output_path=artifacts_dir / "contact-sheet-mobile.png",
        title="Mobile Contact Sheet (390×844)",
        cols=args.mobile_cols,
        thumb_width=320,
    )

    print(f"Stitched desktop contact sheet -> {desktop_out}")
    print(f"Stitched mobile contact sheet  -> {mobile_out}")


if __name__ == "__main__":
    main()
