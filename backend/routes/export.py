import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_admin
from models import Scan, Ticket, ScanTicketType
from ticket_codes import format_ticket_code

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/registered")
def export_registered(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    tickets = db.query(Ticket).order_by(Ticket.id.asc()).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "ticket_code",
            "full_name",
            "phone",
            "status",
            "adult_tickets",
            "member_tickets",
            "kid_tickets",
            "adult_price_jd",
            "member_price_jd",
            "kid_price_jd",
            "total_due_jd",
            "created_at",
        ]
    )
    for t in tickets:
        total_due = (
            t.adult_tickets * t.adult_price_jd
            + t.member_tickets * t.member_price_jd
            + t.kid_tickets * t.kid_price_jd
        )
        writer.writerow(
            [
                t.id,
                format_ticket_code(t.id),
                t.full_name,
                t.phone,
                t.status.value,
                t.adult_tickets,
                t.member_tickets,
                t.kid_tickets,
                t.adult_price_jd,
                t.member_price_jd,
                t.kid_price_jd,
                total_due,
                t.created_at.isoformat() if t.created_at else "",
            ]
        )
    data = buf.getvalue().encode("utf-8")
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="registered.csv"',
        },
    )


@router.get("/attended")
def export_attended(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    ids_subq = db.query(Scan.ticket_id).filter(
        Scan.is_scanned.is_(True),
        Scan.scanned_at.isnot(None),
    ).distinct()
    ticket_ids = [r[0] for r in ids_subq.all()]
    rows = (
        db.query(Ticket)
        .filter(Ticket.id.in_(ticket_ids))
        .order_by(Ticket.id.asc())
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "ticket_code",
            "full_name",
            "phone",
            "adult_tickets",
            "member_tickets",
            "kid_tickets",
            "adult_price_jd",
            "member_price_jd",
            "kid_price_jd",
            "total_due_jd",
            "adult_scanned",
            "member_scanned",
            "kid_scanned",
            "scan_times",
        ]
    )
    for t in rows:
        scans = (
            db.query(Scan)
            .filter(
                Scan.ticket_id == t.id,
                Scan.is_scanned.is_(True),
            )
            .order_by(Scan.scanned_at.asc())
            .all()
        )
        adult_scanned = sum(
            1 for s in scans if s.ticket_type == ScanTicketType.adult
        )
        member_scanned = sum(
            1 for s in scans if s.ticket_type == ScanTicketType.member
        )
        kid_scanned = sum(1 for s in scans if s.ticket_type == ScanTicketType.kid)
        times = ";".join(
            s.scanned_at.isoformat() if s.scanned_at else ""
            for s in scans
        )
        total_due = (
            t.adult_tickets * t.adult_price_jd
            + t.member_tickets * t.member_price_jd
            + t.kid_tickets * t.kid_price_jd
        )
        writer.writerow(
            [
                t.id,
                format_ticket_code(t.id),
                t.full_name,
                t.phone,
                t.adult_tickets,
                t.member_tickets,
                t.kid_tickets,
                t.adult_price_jd,
                t.member_price_jd,
                t.kid_price_jd,
                total_due,
                adult_scanned,
                member_scanned,
                kid_scanned,
                times,
            ]
        )
    data = buf.getvalue().encode("utf-8")
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="attended.csv"',
        },
    )
