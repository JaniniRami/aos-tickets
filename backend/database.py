from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_scan_slot_codes() -> None:
    """Add scans.slot_code and backfill (per-pass id, not buyer id)."""
    try:
        insp = inspect(engine)
        if not insp.has_table("scans"):
            return
        cols = {c["name"] for c in insp.get_columns("scans")}
        if "slot_code" not in cols:
            with engine.begin() as conn:
                conn.execute(
                    text("ALTER TABLE scans ADD COLUMN slot_code VARCHAR(32)")
                )
    except Exception:
        return

    from sqlalchemy.orm import sessionmaker as _sm

    from models import Scan
    from ticket_codes import make_slot_code

    _Session = _sm(bind=engine)
    db = _Session()
    try:
        for scan in db.query(Scan).all():
            if not scan.slot_code:
                scan.slot_code = make_slot_code(
                    scan.ticket_id,
                    scan.ticket_type.value,
                    scan.ticket_index,
                )
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()

    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_scans_slot_code ON scans (slot_code)"
                )
            )
    except Exception:
        pass

    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE scans ALTER COLUMN slot_code SET NOT NULL"
                )
            )
    except Exception:
        pass


def ensure_app_state_row() -> None:
    """Ensure singleton app_state row exists (default: scanning on)."""
    try:
        from models import AppState

        db = SessionLocal()
        try:
            row = db.get(AppState, 1)
            if row is None:
                db.add(AppState(id=1, ticket_scanning_enabled=True))
                db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
    except Exception:
        pass


def ensure_ticket_price_columns() -> None:
    """Add price columns to existing deployments (create_all does not alter tables)."""
    try:
        insp = inspect(engine)
        if not insp.has_table("tickets"):
            return
        cols = {c["name"] for c in insp.get_columns("tickets")}
        stmts = []
        if "adult_price_jd" not in cols:
            stmts.append(
                "ALTER TABLE tickets ADD COLUMN adult_price_jd INTEGER NOT NULL DEFAULT 3"
            )
        if "kid_price_jd" not in cols:
            stmts.append(
                "ALTER TABLE tickets ADD COLUMN kid_price_jd INTEGER NOT NULL DEFAULT 12"
            )
        if not stmts:
            return
        with engine.begin() as conn:
            for s in stmts:
                conn.execute(text(s))
    except Exception:
        pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
