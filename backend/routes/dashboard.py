from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, text, update
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from dependencies import get_current_admin
from models import AppState, Scan, ScanTicketType, Ticket, TicketStatus
from schemas import DashboardAttendee, DashboardStatsOut, ResetAllScansOut, ScanGateUpdate

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _ticket_scanning_enabled(db: Session) -> bool:
    row = db.get(AppState, 1)
    return True if row is None else row.ticket_scanning_enabled


def _build_stats(db: Session) -> DashboardStatsOut:
    total_registered = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status == TicketStatus.registered)
        .scalar()
        or 0
    )
    total_paid = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status == TicketStatus.paid)
        .scalar()
        or 0
    )
    total_sent = (
        db.query(func.count(Ticket.id))
        .filter(Ticket.status == TicketStatus.sent)
        .scalar()
        or 0
    )

    collected_raw = (
        db.query(
            func.coalesce(
                func.sum(
                    Ticket.adult_tickets * Ticket.adult_price_jd
                    + Ticket.member_tickets * Ticket.member_price_jd
                    + Ticket.kid_tickets * Ticket.kid_price_jd
                ),
                0,
            )
        )
        .filter(Ticket.status.in_((TicketStatus.paid, TicketStatus.sent)))
        .scalar()
    )
    total_collected_paid_jd = int(collected_raw or 0)

    paid_only = Ticket.status == TicketStatus.paid
    slots_row = db.query(
        func.coalesce(func.sum(Ticket.adult_tickets), 0),
        func.coalesce(func.sum(Ticket.member_tickets), 0),
        func.coalesce(func.sum(Ticket.kid_tickets), 0),
    ).filter(paid_only).one()
    sold_adult_slots_paid = int(slots_row[0] or 0)
    sold_member_slots_paid = int(slots_row[1] or 0)
    sold_kid_slots_paid = int(slots_row[2] or 0)
    sold_slots_total_paid = (
        sold_adult_slots_paid + sold_member_slots_paid + sold_kid_slots_paid
    )

    today_local = datetime.now(ZoneInfo(settings.event_timezone)).date()
    inside_row = db.execute(
        text(
            """
            SELECT
                COUNT(*)::int AS total,
                COALESCE(
                    SUM(CASE WHEN ticket_type::text = 'adult' THEN 1 ELSE 0 END),
                    0
                )::int AS adults,
                COALESCE(
                    SUM(CASE WHEN ticket_type::text = 'member' THEN 1 ELSE 0 END),
                    0
                )::int AS members,
                COALESCE(
                    SUM(CASE WHEN ticket_type::text = 'kid' THEN 1 ELSE 0 END),
                    0
                )::int AS kids
            FROM scans
            WHERE is_scanned IS TRUE
              AND scanned_at IS NOT NULL
              AND DATE(timezone(:tz, scanned_at)) = :today
            """
        ),
        {"tz": settings.event_timezone, "today": today_local},
    ).one()
    people_inside_today = int(inside_row.total or 0)
    people_inside_today_adults = int(inside_row.adults or 0)
    people_inside_today_members = int(inside_row.members or 0)
    people_inside_today_kids = int(inside_row.kids or 0)

    ticket_ids_with_scans = (
        db.query(Scan.ticket_id)
        .filter(Scan.is_scanned.is_(True), Scan.scanned_at.isnot(None))
        .distinct()
    )
    ids = [row[0] for row in ticket_ids_with_scans.all()]

    attendees: list[DashboardAttendee] = []
    for tid in sorted(ids):
        ticket = db.get(Ticket, tid)
        if not ticket:
            continue
        scans = (
            db.query(Scan)
            .filter(
                Scan.ticket_id == tid,
                Scan.is_scanned.is_(True),
                Scan.scanned_at.isnot(None),
            )
            .order_by(Scan.scanned_at.asc())
            .all()
        )
        timestamps = [s.scanned_at for s in scans if s.scanned_at is not None]
        adult_scanned = sum(1 for s in scans if s.ticket_type == ScanTicketType.adult)
        member_scanned = sum(1 for s in scans if s.ticket_type == ScanTicketType.member)
        kid_scanned = sum(1 for s in scans if s.ticket_type == ScanTicketType.kid)
        attendees.append(
            DashboardAttendee(
                ticket_id=ticket.id,
                full_name=ticket.full_name,
                adult_tickets=ticket.adult_tickets,
                member_tickets=ticket.member_tickets,
                kid_tickets=ticket.kid_tickets,
                adult_scanned=adult_scanned,
                member_scanned=member_scanned,
                kid_scanned=kid_scanned,
                scan_timestamps=timestamps,
            )
        )

    return DashboardStatsOut(
        total_registered=total_registered,
        total_paid=total_paid,
        total_sent=total_sent,
        total_collected_paid_jd=total_collected_paid_jd,
        sold_adult_slots_paid=sold_adult_slots_paid,
        sold_member_slots_paid=sold_member_slots_paid,
        sold_kid_slots_paid=sold_kid_slots_paid,
        sold_slots_total_paid=sold_slots_total_paid,
        people_inside_today=people_inside_today,
        people_inside_today_adults=people_inside_today_adults,
        people_inside_today_members=people_inside_today_members,
        people_inside_today_kids=people_inside_today_kids,
        attendees=attendees,
        ticket_scanning_enabled=_ticket_scanning_enabled(db),
    )


@router.get("/stats", response_model=DashboardStatsOut)
def dashboard_stats(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    return _build_stats(db)


@router.get("/live", response_model=DashboardStatsOut)
def dashboard_live(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Same payload as /stats; frontend polls every ~5s for live updates."""
    return _build_stats(db)


@router.patch("/scan-gate")
def set_scan_gate(
    body: ScanGateUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    row = db.get(AppState, 1)
    if row is None:
        row = AppState(id=1, ticket_scanning_enabled=body.ticket_scanning_enabled)
        db.add(row)
    else:
        row.ticket_scanning_enabled = body.ticket_scanning_enabled
    try:
        db.commit()
        db.refresh(row)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save scan gate",
        ) from None
    return {"ticket_scanning_enabled": row.ticket_scanning_enabled}


@router.post("/reset-all-scans", response_model=ResetAllScansOut)
def reset_all_scans(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin),
):
    """Clear scan state for every slot (all tickets)."""
    result = db.execute(
        update(Scan).values(is_scanned=False, scanned_at=None),
    )
    db.commit()
    return ResetAllScansOut(scans_updated=result.rowcount or 0)
