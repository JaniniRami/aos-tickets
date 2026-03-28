from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class TicketStatusEnum(str, Enum):
    registered = "registered"
    paid = "paid"
    sent = "sent"


class ScanTicketTypeEnum(str, Enum):
    adult = "adult"
    member = "member"
    kid = "kid"


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TicketCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=64)
    adult_tickets: int = Field(ge=0, default=0)
    member_tickets: int = Field(ge=0, default=0)
    kid_tickets: int = Field(ge=0, default=0)


class TicketStatusUpdate(BaseModel):
    status: TicketStatusEnum


class ScanSlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slot_code: str
    ticket_type: ScanTicketTypeEnum
    ticket_index: int
    is_scanned: bool
    scanned_at: datetime | None = None


class ScanResultOut(BaseModel):
    """ticket_code = buyer order; slot_code = individual pass scanned."""

    valid: bool
    ticket_code: str | None = None
    slot_code: str | None = None
    full_name: str | None = None
    message: str | None = None
    adult_tickets: int = 0
    adult_scanned: int = 0
    member_tickets: int = 0
    member_scanned: int = 0
    kid_tickets: int = 0
    kid_scanned: int = 0
    slots: list[ScanSlotOut] = []


class TicketRowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_code: str
    full_name: str
    phone: str
    adult_tickets: int
    member_tickets: int = 0
    kid_tickets: int
    adult_price_jd: int = 3
    member_price_jd: int = 10
    kid_price_jd: int = 12
    total_due_jd: int = 0
    status: TicketStatusEnum
    created_at: datetime
    adult_scanned: int = 0
    member_scanned: int = 0
    kid_scanned: int = 0
    total_slots_scanned: int = 0
    total_slots: int = 0


class TicketPricingOut(BaseModel):
    adult_price_jd: int
    member_price_jd: int
    kid_price_jd: int


class TicketCreateResponse(BaseModel):
    id: int
    ticket_code: str


class DashboardAttendee(BaseModel):
    ticket_id: int
    full_name: str
    adult_tickets: int
    member_tickets: int = 0
    kid_tickets: int
    adult_scanned: int
    member_scanned: int = 0
    kid_scanned: int
    scan_timestamps: list[datetime]


class DashboardStatsOut(BaseModel):
    total_registered: int
    total_paid: int
    total_sent: int
    # Sum of adult×price + member×price + kid×price for tickets with status paid or sent
    total_collected_paid_jd: int
    # Sum of slot counts on paid orders (matches collected revenue scope)
    sold_adult_slots_paid: int
    sold_member_slots_paid: int
    sold_kid_slots_paid: int
    sold_slots_total_paid: int
    people_inside_today: int
    # Scans recorded today (GMT+3), by pass type
    people_inside_today_adults: int
    people_inside_today_members: int
    people_inside_today_kids: int
    attendees: list[DashboardAttendee]
    ticket_scanning_enabled: bool = True


class ScanGateUpdate(BaseModel):
    ticket_scanning_enabled: bool


class ResetAllScansOut(BaseModel):
    """Rows in `scans` table updated (all slots cleared)."""

    scans_updated: int
