from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from database import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _apply_lightweight_migrations()


def _apply_lightweight_migrations():
    """Idempotent ALTER for columns added after the initial schema.

    SQLAlchemy's ``create_all`` only creates missing tables; it does not
    add columns to existing tables. For SQLite-backed dev databases we
    detect missing columns by introspection and add them in-place so an
    existing ``clinical_assessment.db`` keeps working after upgrade.
    """
    insp = inspect(engine)
    if "measurement_sessions" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("measurement_sessions")}
    if "anomaly_summary" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE measurement_sessions ADD COLUMN anomaly_summary JSON"))
