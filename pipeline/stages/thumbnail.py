"""Stage 5: thumbnail = a frame from the video + bold title overlay via Pillow."""

import subprocess
import textwrap

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
]


def run(ctx):
    from PIL import Image, ImageDraw, ImageFont

    manifest = ctx["manifest"]
    base_path = ctx["project_dir"] / "thumb_base.jpg"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-ss", "1", "-i", str(ctx["project_dir"] / "final.mp4"),
         "-frames:v", "1", "-q:v", "2", str(base_path)],
        check=True,
    )

    image = Image.open(base_path).convert("RGB")
    draw = ImageDraw.Draw(image, "RGBA")
    title = manifest.data["meta"].get("title", manifest.topic)
    font = _load_font(size=max(36, image.width // 16))

    lines = textwrap.wrap(title, width=22)[:3]
    line_height = int(font.size * 1.25)
    block_height = line_height * len(lines) + 40
    top = image.height - block_height - 40
    draw.rectangle([(0, top), (image.width, image.height)], fill=(0, 0, 0, 170))
    for i, line in enumerate(lines):
        draw.text((40, top + 20 + i * line_height), line,
                  font=font, fill=(255, 255, 255))

    out_path = ctx["project_dir"] / "thumbnail.jpg"
    image.save(out_path, quality=90)
    base_path.unlink(missing_ok=True)
    return {"thumbnail": "thumbnail.jpg"}


def _load_font(size: int):
    from PIL import ImageFont

    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)
