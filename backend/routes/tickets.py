import io
import re
import zipfile

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_admin
from models import Scan, ScanTicketType, Ticket, TicketStatus
from schemas import (
    TicketCreate,
    TicketCreateResponse,
    TicketPricingOut,
    TicketRowOut,
    TicketStatusEnum,
    TicketStatusUpdate,
)
from ticket_codes import (
    format_ticket_code,
    make_slot_code,
    normalize_slot_code,
    scan_type_sort_order,
)

# Member tier price (JD) — fixed, not from env
MEMBER_TICKET_PRICE_JD = 10
from ticket_image import (
    build_scan_url_for_slot,
    generate_ticket_png,
    generate_qr_png,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])


def _slot_sort_key(scan: Scan):
    return (scan_type_sort_order(scan.ticket_type.value), scan.ticket_index)


def _counts_for_ticket(db: Session, ticket: Ticket) -> TicketRowOut:
    scans = sorted(ticket.scans, key=_slot_sort_key)
    adult_scanned = sum(
        1 for s in scans if s.ticket_type == ScanTicketType.adult and s.is_scanned
    )
    member_scanned = sum(
        1 for s in scans if s.ticket_type == ScanTicketType.member and s.is_scanned
    )
    kid_scanned = sum(
        1 for s in scans if s.ticket_type == ScanTicketType.kid and s.is_scanned
    )
    total_scanned = sum(1 for s in scans if s.is_scanned)
    total_due = (
        ticket.adult_tickets * ticket.adult_price_jd
        + ticket.member_tickets * ticket.member_price_jd
        + ticket.kid_tickets * ticket.kid_price_jd
    )
    return TicketRowOut(
        id=ticket.id,
        ticket_code=format_ticket_code(ticket.id),
        full_name=ticket.full_name,
        phone=ticket.phone,
        adult_tickets=ticket.adult_tickets,
        member_tickets=ticket.member_tickets,
        kid_tickets=ticket.kid_tickets,
        adult_price_jd=ticket.adult_price_jd,
        member_price_jd=ticket.member_price_jd,
        kid_price_jd=ticket.kid_price_jd,
        total_due_jd=total_due,
        status=TicketStatusEnum(ticket.status.value),
        created_at=ticket.created_at,
        adult_scanned=adult_scanned,
        member_scanned=member_scanned,
        kid_scanned=kid_scanned,
        total_slots_scanned=total_scanned,
        total_slots=len(scans),
    )


def _create_scan_rows(ticket: Ticket) -> list[Scan]:
    tid = ticket.id
    rows = []
    for i in range(1, ticket.adult_tickets + 1):
        rows.append(
            Scan(
                ticket=ticket,
                ticket_type=ScanTicketType.adult,
                ticket_index=i,
                is_scanned=False,
                slot_code=make_slot_code(tid, "adult", i),
            )
        )
    for i in range(1, ticket.member_tickets + 1):
        rows.append(
            Scan(
                ticket=ticket,
                ticket_type=ScanTicketType.member,
                ticket_index=i,
                is_scanned=False,
                slot_code=make_slot_code(tid, "member", i),
            )
        )
    for i in range(1, ticket.kid_tickets + 1):
        rows.append(
            Scan(
                ticket=ticket,
                ticket_type=ScanTicketType.kid,
                ticket_index=i,
                is_scanned=False,
                slot_code=make_slot_code(tid, "kid", i),
            )
        )
    return rows


def _adjust_scan_count(
    db: Session,
    ticket: Ticket,
    kind: ScanTicketType,
    new_count: int,
):
    """Drop or append scan rows; only highest-index unscanned slots may be removed."""
    while True:
        scans = sorted(
            [s for s in ticket.scans if s.ticket_type == kind],
            key=lambda s: s.ticket_index,
        )
        scanned_n = sum(1 for s in scans if s.is_scanned)
        if new_count < scanned_n:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot set {kind.value} ticket count below "
                    f"the number already scanned ({scanned_n})"
                ),
            )
        if len(scans) <= new_count:
            break
        last = scans[-1]
        if last.is_scanned:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot remove a scanned {kind.value} ticket slot",
            )
        db.delete(last)
        db.flush()

    while True:
        scans = sorted(
            [s for s in ticket.scans if s.ticket_type == kind],
            key=lambda s: s.ticket_index,
        )
        if len(scans) >= new_count:
            break
        next_i = len(scans) + 1
        db.add(
            Scan(
                ticket=ticket,
                ticket_type=kind,
                ticket_index=next_i,
                is_scanned=False,
                slot_code=make_slot_code(ticket.id, kind.value, next_i),
            )
        )
        db.flush()


@router.post("", response_model=TicketCreateResponse)
def create_ticket(
    body: TicketCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    if body.adult_tickets == 0 and body.member_tickets == 0 and body.kid_tickets == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one adult, member, or kid ticket is required",
        )
    ticket = Ticket(
        full_name=body.full_name.strip(),
        phone=body.phone.strip(),
        adult_tickets=body.adult_tickets,
        member_tickets=body.member_tickets,
        kid_tickets=body.kid_tickets,
        adult_price_jd=settings.adult_ticket_price_jd,
        member_price_jd=MEMBER_TICKET_PRICE_JD,
        kid_price_jd=settings.kid_ticket_price_jd,
        status=TicketStatus.registered,
    )
    db.add(ticket)
    db.flush()
    ticket.scans = _create_scan_rows(ticket)
    db.commit()
    db.refresh(ticket)
    return TicketCreateResponse(
        id=ticket.id,
        ticket_code=format_ticket_code(ticket.id),
    )


@router.get("", response_model=list[TicketRowOut])
def list_tickets(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    tickets = db.query(Ticket).order_by(Ticket.id.desc()).all()
    return [_counts_for_ticket(db, t) for t in tickets]


@router.get("/pricing", response_model=TicketPricingOut)
def ticket_pricing(_: str = Depends(get_current_admin)):
    return TicketPricingOut(
        adult_price_jd=settings.adult_ticket_price_jd,
        member_price_jd=MEMBER_TICKET_PRICE_JD,
        kid_price_jd=settings.kid_ticket_price_jd,
    )


@router.patch("/{ticket_id}", response_model=TicketRowOut)
def update_ticket(
    ticket_id: int,
    body: TicketCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    if body.adult_tickets == 0 and body.member_tickets == 0 and body.kid_tickets == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one adult, member, or kid ticket is required",
        )
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.full_name = body.full_name.strip()
    ticket.phone = body.phone.strip()
    _adjust_scan_count(db, ticket, ScanTicketType.adult, body.adult_tickets)
    _adjust_scan_count(db, ticket, ScanTicketType.member, body.member_tickets)
    _adjust_scan_count(db, ticket, ScanTicketType.kid, body.kid_tickets)
    ticket.adult_tickets = body.adult_tickets
    ticket.member_tickets = body.member_tickets
    ticket.kid_tickets = body.kid_tickets
    db.commit()
    db.refresh(ticket)
    return _counts_for_ticket(db, ticket)


@router.patch("/{ticket_id}/status", response_model=TicketRowOut)
def update_ticket_status(
    ticket_id: int,
    body: TicketStatusUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = TicketStatus(body.status.value)
    db.commit()
    db.refresh(ticket)
    return _counts_for_ticket(db, ticket)


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    db.delete(ticket)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _resolve_scan_for_admin(
    ticket: Ticket, slot_code: str | None
) -> Scan | None:
    scans = sorted(ticket.scans, key=_slot_sort_key)
    if not scans:
        return None
    if slot_code:
        norm = normalize_slot_code(slot_code)
        return next((s for s in scans if s.slot_code == norm), None)
    return scans[0]


@router.get("/{ticket_id}/qr")
def get_ticket_qr(
    ticket_id: int,
    slot_code: str | None = Query(
        None,
        description="Pass id (e.g. 0000-A01). Defaults to first pass.",
    ),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    scan = _resolve_scan_for_admin(ticket, slot_code)
    if not scan:
        raise HTTPException(status_code=404, detail="Slot not found")
    url = build_scan_url_for_slot(scan.slot_code)
    data = generate_qr_png(url)
    return Response(content=data, media_type="image/png")


@router.get("/{ticket_id}/image")
def get_ticket_image(
    ticket_id: int,
    slot_code: str | None = Query(
        None,
        description="Pass id (e.g. 0000-A01). Defaults to first pass.",
    ),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    scan = _resolve_scan_for_admin(ticket, slot_code)
    if not scan:
        raise HTTPException(status_code=404, detail="Slot not found")
    data = generate_ticket_png(ticket.full_name, scan.slot_code)
    return Response(content=data, media_type="image/png")


@router.get("/{ticket_id}/download")
def download_ticket_zip(
    ticket_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    scans = sorted(ticket.scans, key=_slot_sort_key)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for scan in scans:
            png = generate_ticket_png(ticket.full_name, scan.slot_code)
            fname = f"{scan.slot_code}.png"
            zf.writestr(fname, png)
    buf.seek(0)
    safe_name = re.sub(r"[^\w\s\-]", "", ticket.full_name).strip() or "ticket"
    safe_name = re.sub(r"\s+", "_", safe_name)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}.zip"',
        },
    )


@router.post("/{ticket_id}/reset-scans", response_model=TicketRowOut)
def reset_scans(
    ticket_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    for scan in ticket.scans:
        scan.is_scanned = False
        scan.scanned_at = None
    db.commit()
    db.refresh(ticket)
    return _counts_for_ticket(db, ticket)
