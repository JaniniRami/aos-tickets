import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class AppState(Base):
    """Singleton row id=1: global switches (e.g. allow QR scans)."""

    __tablename__ = "app_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_scanning_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )


class TicketStatus(str, enum.Enum):
    registered = "registered"
    paid = "paid"
    sent = "sent"


class ScanTicketType(str, enum.Enum):
    adult = "adult"
    member = "member"
    kid = "kid"


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(64), nullable=False)
    adult_tickets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    member_tickets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    kid_tickets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    adult_price_jd: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("3")
    )
    member_price_jd: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("10")
    )
    kid_price_jd: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("12")
    )
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status"),
        nullable=False,
        default=TicketStatus.registered,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    scans: Mapped[list["Scan"]] = relationship(
        "Scan",
        back_populates="ticket",
        cascade="all, delete-orphan",
    )


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ticket_type: Mapped[ScanTicketType] = mapped_column(
        Enum(ScanTicketType, name="scan_ticket_type"),
        nullable=False,
    )
    ticket_index: Mapped[int] = mapped_column(Integer, nullable=False)
    slot_code: Mapped[str] = mapped_column(
        String(32), unique=True, nullable=False, index=True
    )
    scanned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    is_scanned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="scans")
