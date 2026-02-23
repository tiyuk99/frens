#!/usr/bin/env python3
"""Convert HEIC character images to PNG with pink background (theme --panel: #fff0f8)."""
import os
import sys

# Pink background to match theme (panel color from styles.css)
PINK_BG = (0xFF, 0xF0, 0xF8)  # #fff0f8

def main():
    try:
        import pillow_heif
        from PIL import Image
    except ImportError:
        sys.exit("Need pillow-heif and Pillow. Run: .venv/bin/pip install pillow pillow-heif")

    pillow_heif.register_heif_opener()
    chars_dir = os.path.join(os.path.dirname(__file__), "characters")
    if not os.path.isdir(chars_dir):
        sys.exit("characters/ not found")

    for name in os.listdir(chars_dir):
        if not name.lower().endswith(".heic"):
            continue
        path = os.path.join(chars_dir, name)
        base, _ = os.path.splitext(name)
        out_name = base + ".png"
        out_path = os.path.join(chars_dir, out_name)

        try:
            img = Image.open(path).copy()
        except Exception as e:
            print(f"Skip {name}: {e}", file=sys.stderr)
            continue

        if img.mode != "RGB":
            if img.mode in ("RGBA", "LA", "P"):
                if img.mode == "P":
                    img = img.convert("RGBA")
                bg = Image.new("RGB", img.size, PINK_BG)
                alpha = img.split()[-1]
                bg.paste(img.convert("RGB"), (0, 0), alpha)
                img = bg
            else:
                img = img.convert("RGB")

        img.save(out_path, "PNG")
        print(f"Saved {out_name}")

if __name__ == "__main__":
    main()
