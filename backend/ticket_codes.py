"""Buyer order code (4-digit) and per-pass slot codes (unique per adult/kid slot)."""

from __future__ import annotations


def format_ticket_code(ticket_id: int) -> str:
    """Buyer / purchase display code (zero-based on tickets.id): first row → 0000."""
    return f"{ticket_id - 1:04d}"


def parse_ticket_to_id(code: str) -> int:
    """
    Decode buyer-only segment to tickets.id.
    Raises ValueError if invalid.
    """
    s = str(code).strip()
    if not s.isdigit():
        raise ValueError("invalid ticket code")
    n = int(s, 10)
    if n < 0:
        raise ValueError("invalid ticket code")
    return n + 1


def make_slot_code(ticket_id: int, kind: str, ticket_index: int) -> str:
    """
    Unique public ID for one pass (one adult or one kid slot).
    Not the buyer id — that is format_ticket_code(ticket_id).
    kind: 'adult' or 'kid'  →  0000-A01, 0000-K02
    """
    order = format_ticket_code(ticket_id)
    letter = "A" if kind == "adult" else "K"
    return f"{order}-{letter}{ticket_index:02d}".upper()


def normalize_slot_code(raw: str) -> str:
    return str(raw).strip().upper()
