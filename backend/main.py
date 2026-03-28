from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import (
    Base,
    engine,
    ensure_app_state_row,
    ensure_scan_slot_codes,
    ensure_ticket_price_columns,
)
from routes import auth, dashboard, export, scan, tickets

Base.metadata.create_all(bind=engine)
ensure_ticket_price_columns()
ensure_scan_slot_codes()
ensure_app_state_row()

app = FastAPI(title="AOS Egg Hunting 2026 Tickets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router)  # public: no admin JWT
app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(dashboard.router)
app.include_router(export.router)


@app.get("/health")
def health():
    return {"ok": True}
