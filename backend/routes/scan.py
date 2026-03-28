from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import AppState, Scan, ScanTicketType
from schemas import ScanResultOut, ScanSlotOut, ScanTicketTypeEnum
from ticket_codes import format_ticket_code, normalize_slot_code, scan_type_sort_order


def _slot_order(scan: Scan):
    return (scan_type_sort_order(scan.ticket_type.value), scan.ticket_index)


def _slots_payload(scans: list) -> list[ScanSlotOut]:
    return [
        ScanSlotOut(
            slot_code=s.slot_code,
            ticket_type=ScanTicketTypeEnum(s.ticket_type.value),
            ticket_index=s.ticket_index,
            is_scanned=s.is_scanned,
            scanned_at=s.scanned_at,
        )
        for s in scans
    ]


router = APIRouter(tags=["scan"])


def _ticket_scanning_enabled(db: Session) -> bool:
    row = db.get(AppState, 1)
    return True if row is None else row.ticket_scanning_enabled


@router.get(
    "/scan/{slot_ref:path}",
    response_model=ScanResultOut,
    dependencies=[],
    openapi_extra={"security": []},
)
def scan_slot(slot_ref: str, db: Session = Depends(get_db)):
    """
    Public scan (no JWT): URL encodes one physical pass (slot_code), not the buyer order id.
    """
    code = normalize_slot_code(slot_ref)
    if not code or len(code) < 3:
        return ScanResultOut(valid=False, message="Invalid ticket code")

    scan_row = db.query(Scan).filter(Scan.slot_code == code).first()
    if not scan_row:
        return ScanResultOut(valid=False, slot_code=code, message="Ticket not found")

    ticket = scan_row.ticket
    scans = sorted(ticket.scans, key=_slot_order)
    slots_out = _slots_payload(scans)

    adult_scanned = sum(
        1 for s in scans if s.ticket_type == ScanTicketType.adult and s.is_scanned
    )
    member_scanned = sum(
        1 for s in scans if s.ticket_type == ScanTicketType.member and s.is_scanned
    )
    kid_scanned = sum(
        1 for s in scans if s.ticket_type == ScanTicketType.kid and s.is_scanned
    )

    if not _ticket_scanning_enabled(db):
        return ScanResultOut(
            valid=False,
            ticket_code=format_ticket_code(ticket.id),
            slot_code=scan_row.slot_code,
            full_name=ticket.full_name,
            message="Ticket scanning is turned off",
            adult_tickets=ticket.adult_tickets,
            adult_scanned=adult_scanned,
            member_tickets=ticket.member_tickets,
            member_scanned=member_scanned,
            kid_tickets=ticket.kid_tickets,
            kid_scanned=kid_scanned,
            slots=slots_out,
        )

    if scan_row.is_scanned:
        return ScanResultOut(
            valid=False,
            ticket_code=format_ticket_code(ticket.id),
            slot_code=scan_row.slot_code,
            full_name=ticket.full_name,
            message="This ticket was already scanned",
            adult_tickets=ticket.adult_tickets,
            adult_scanned=adult_scanned,
            member_tickets=ticket.member_tickets,
            member_scanned=member_scanned,
            kid_tickets=ticket.kid_tickets,
            kid_scanned=kid_scanned,
            slots=slots_out,
        )

    scan_row.is_scanned = True
    scan_row.scanned_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)

    scans = sorted(ticket.scans, key=_slot_order)
    slots_out = _slots_payload(scans)
    adult_scanned = sum(
        1 for s in scans if s.ticket_type == ScanTicketType.adult and s.is_scanned
    )
    member_scanned = sum(
        1 for s in scans if s.ticket_type == ScanTicketType.member and s.is_scanned
    )
    kid_scanned = sum(
        1 for s in scans if s.ticket_type == ScanTicketType.kid and s.is_scanned
    )

    return ScanResultOut(
        valid=True,
        ticket_code=format_ticket_code(ticket.id),
        slot_code=scan_row.slot_code,
        full_name=ticket.full_name,
        adult_tickets=ticket.adult_tickets,
        adult_scanned=adult_scanned,
        member_tickets=ticket.member_tickets,
        member_scanned=member_scanned,
        kid_tickets=ticket.kid_tickets,
        kid_scanned=kid_scanned,
        slots=slots_out,
    )
