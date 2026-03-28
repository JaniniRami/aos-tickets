import io

import qrcode
from PIL import Image, ImageDraw, ImageFont

from config import settings

WIDTH = 800
HEIGHT = 1200
# Aligned with frontend (`index.css` + Tailwind arbitrary colors on pages).
BG = "#F1EFEC"
ACCENT = "#123458"
TEXT = "#030303"
BORDER_TONE = "#D4C9BE"
QR_BACK = "#FFFFFF"


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans-Bold.ttf", size)
    except OSError:
        try:
            return ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", size)
        except OSError:
            return ImageFont.load_default()


def _load_font_regular(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size)
    except OSError:
        try:
            return ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", size)
        except OSError:
            return ImageFont.load_default()


def build_scan_url_for_slot(slot_code: str) -> str:
    """QR target: one physical pass (slot_code), not buyer id."""
    base = settings.base_url.rstrip("/")
    return f"{base}/scan/{slot_code}"


def generate_qr_png(url: str) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color=ACCENT, back_color=QR_BACK)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def generate_ticket_png(full_name: str, slot_code: str) -> bytes:
    """PNG: headers, QR for this pass only, name, Ticket ID = slot_code."""
    url = build_scan_url_for_slot(slot_code)
    qr_bytes = generate_qr_png(url)
    qr_img = Image.open(io.BytesIO(qr_bytes)).convert("RGB")
    qr_target = min(WIDTH - 100, int(HEIGHT * 0.52))
    qr_img = qr_img.resize((qr_target, qr_target), Image.Resampling.LANCZOS)

    img = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    title_font = _load_font(42)
    sub_font = _load_font(32)
    body_font = _load_font_regular(30)
    ticket_id_font = _load_font(52)

    draw.rectangle([0, 0, WIDTH, 8], fill=ACCENT)
    draw.rectangle([0, HEIGHT - 8, WIDTH, HEIGHT], fill=BORDER_TONE)

    y = 48
    draw.text((WIDTH // 2, y), "Amman Orthodox Scout", fill=ACCENT, font=title_font, anchor="mt")
    y += 56
    draw.text((WIDTH // 2, y), "Egg Hunting 2026", fill=TEXT, font=sub_font, anchor="mt")

    qx = (WIDTH - qr_target) // 2
    qy = y + 52
    img.paste(qr_img, (qx, qy))

    y = qy + qr_target + 56
    draw.text((WIDTH // 2, y), full_name, fill=TEXT, font=body_font, anchor="mt")
    y += 52

    draw.text(
        (WIDTH // 2, y),
        f"Ticket ID: {slot_code}",
        fill=ACCENT,
        font=ticket_id_font,
        anchor="mt",
    )

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
