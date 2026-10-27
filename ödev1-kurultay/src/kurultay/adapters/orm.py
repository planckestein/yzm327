"""Veritabanı şeması (SQLAlchemy Core).

Alan modeli bu dosyayı bilmez (persistence ignorance). Eşleme, ``repository.py`` içindeki açık veri
eşleyicileriyle (Data Mapper) yapılır; değer nesneleri ``frozen`` kalabilir.

Değişmezlik veritabanı düzeyinde de korunur: mesajlar, maskeler, oylar, konu sürümleri, yönetmelik sürümleri
ve defter tablolarında UPDATE ve DELETE tetikleyicilerle (trigger) yasaktır. Konular silinemez; bir konunun
yalnızca durumu güncellenebilir.
"""

from __future__ import annotations

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    Engine,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    event,
    text,
)

metadata = MetaData()

users = Table(
    "users",
    metadata,
    Column("id", String(16), primary_key=True),
    Column("nickname", String(20), nullable=False, unique=True),
    Column("first_name", String, nullable=False),
    Column("last_name", String, nullable=False),
    Column("birth_date", Date, nullable=False),
    Column("address", String, nullable=False),
    Column("password_hash", String, nullable=False),
    Column("role", String(12), nullable=False),
    Column("interests", Text, nullable=False, default="[]"),
    Column("expertise", Text, nullable=False, default="[]"),
    Column("reputation", Integer, nullable=False, default=0),
    Column("agent_model", String, nullable=True),
    Column("joined_at", String, nullable=False),
)

concepts = Table(
    "concepts",
    metadata,
    Column("id", String(40), primary_key=True),
    Column("name", String, nullable=False),
    Column("description", String, nullable=False),
    Column("keywords", Text, nullable=False),
    Column("parent_id", String(40), ForeignKey("concepts.id"), nullable=True),
)

concept_relations = Table(
    "concept_relations",
    metadata,
    Column("source", String(40), ForeignKey("concepts.id"), primary_key=True),
    Column("target", String(40), ForeignKey("concepts.id"), primary_key=True),
    Column("kind", String(12), nullable=False),
)

topics = Table(
    "topics",
    metadata,
    Column("id", String(16), primary_key=True),
    Column("root_id", String(16), nullable=False, index=True),
    Column("parent_id", String(16), ForeignKey("topics.id"), nullable=True),
    Column("author_id", String(16), ForeignKey("users.id"), nullable=False),
    Column("concept_ids", Text, nullable=False),
    Column("status", String(24), nullable=False),
    Column("created_at", String, nullable=False),
)

topic_revisions = Table(
    "topic_revisions",
    metadata,
    Column("id", String(16), primary_key=True),
    Column("topic_id", String(16), ForeignKey("topics.id"), nullable=False, index=True),
    Column("seq", Integer, nullable=False),
    Column("title", String, nullable=False),
    Column("description", Text, nullable=False),
    Column("proposal_id", String(16), nullable=True),
    Column("created_at", String, nullable=False),
)

messages = Table(
    "messages",
    metadata,
    Column("id", String(16), primary_key=True),
    Column("topic_id", String(16), ForeignKey("topics.id"), nullable=False, index=True),
    Column("root_id", String(16), nullable=False, index=True),
    Column("author_id", String(16), ForeignKey("users.id"), nullable=False),
    Column("text", Text, nullable=False),
    Column("content_hash", String(64), nullable=False),
    Column("reply_to", String(16), nullable=True),
    Column("created_at", String, nullable=False),
)

masks = Table(
    "masks",
    metadata,
    Column("target_kind", String(8), primary_key=True),
    Column("target_id", String(16), primary_key=True),
    Column("root_id", String(16), nullable=False, index=True),
    Column("proposal_id", String(16), nullable=False),
    Column("masked_at", String, nullable=False),
)

proposals = Table(
    "proposals",
    metadata,
    Column("id", String(16), primary_key=True),
    Column("kind", String(20), nullable=False),
    Column("title", String, nullable=False),
    Column("rationale", Text, nullable=False),
    Column("proposer_id", String(16), ForeignKey("users.id"), nullable=False),
    Column("concept_ids", Text, nullable=False),
    Column("strategy", String(12), nullable=False),
    Column("threshold", String(6), nullable=False),
    Column("opened_at", String, nullable=False),
    Column("deadline", String, nullable=False),
    Column("topic_id", String(16), nullable=True, index=True),
    Column("target_id", String(16), nullable=True),
    Column("payload", Text, nullable=False),
    Column("status", String(8), nullable=False),
    Column("result_yes", Float, nullable=True),
    Column("result_no", Float, nullable=True),
    Column("result_reason", String, nullable=True),
    Column("closed_at", String, nullable=True),
    Column("agent_weight", String(8), nullable=False, default="1/2"),
)

electorate_voters = Table(  # seçmen kütüğü: oylama açılırken dondurulur, sonradan değişmez
    "electorate_voters",
    metadata,
    Column("proposal_id", String(16), ForeignKey("proposals.id"), primary_key=True),
    Column("voter_id", String(16), ForeignKey("users.id"), primary_key=True),
    Column("reputation", Integer, nullable=False),
    Column("expertise_level", Integer, nullable=False),
    Column("is_agent", Boolean, nullable=False),
)

ballots = Table(
    "ballots",
    metadata,
    Column("proposal_id", String(16), ForeignKey("proposals.id"), primary_key=True),
    Column("voter_id", String(16), ForeignKey("users.id"), primary_key=True),
    Column("choice", String(6), nullable=False),
    Column("intensity", Integer, nullable=False),
    Column("is_agent", Boolean, nullable=False),
    Column("rationale", Text, nullable=False),
    Column("cast_at", String, nullable=False),
)

regulations = Table(
    "regulations",
    metadata,
    Column("version", Integer, primary_key=True),
    Column("data", Text, nullable=False),
    Column("proposal_id", String(16), nullable=True),
    Column("created_at", String, nullable=False),
)

ledger = Table(
    "ledger",
    metadata,
    Column("idx", Integer, primary_key=True, autoincrement=False),
    Column("timestamp", String, nullable=False),
    Column("kind", String(40), nullable=False),
    Column("payload", Text, nullable=False),
    Column("previous_hash", String(64), nullable=False),
    Column("hash", String(64), nullable=False),
)

notifications = Table(
    "notifications",
    metadata,
    Column("id", String(16), primary_key=True),
    Column("user_id", String(16), ForeignKey("users.id"), nullable=False, index=True),
    Column("text", String, nullable=False),
    Column("link", String, nullable=False),
    Column("created_at", String, nullable=False),
    Column("read_at", String, nullable=True),
    UniqueConstraint("user_id", "link", name="uq_notification_user_link"),
)

APPEND_ONLY_TABLES = ("messages", "masks", "ballots", "electorate_voters", "topic_revisions", "regulations", "ledger")

# Şema değişince eski demo verisi yeniden kurulur (PRAGMA user_version).
SCHEMA_VERSION = 2


def _append_only_triggers() -> list[str]:
    statements = []
    for table in APPEND_ONLY_TABLES:
        for action in ("UPDATE", "DELETE"):
            statements.append(
                f"CREATE TRIGGER IF NOT EXISTS {table}_no_{action.lower()} BEFORE {action} ON {table} "
                f"BEGIN SELECT RAISE(ABORT, 'Kurultay: {table} tablosu yalnızca eklenebilir (append-only)'); END;"
            )
    for table in ("topics", "proposals", "users", "concepts"):
        statements.append(
            f"CREATE TRIGGER IF NOT EXISTS {table}_no_delete BEFORE DELETE ON {table} "
            f"BEGIN SELECT RAISE(ABORT, 'Kurultay: {table} kayıtları silinemez'); END;"
        )
    statements.append(
        "CREATE TRIGGER IF NOT EXISTS topics_immutable_identity BEFORE UPDATE OF author_id, created_at, root_id, parent_id "
        "ON topics BEGIN SELECT RAISE(ABORT, 'Kurultay: konunun kimliği değiştirilemez'); END;"
    )
    return statements


def create_schema(engine: Engine) -> None:
    metadata.create_all(engine)
    with engine.begin() as conn:
        for statement in _append_only_triggers():
            conn.execute(text(statement))
        conn.execute(text(f"PRAGMA user_version={SCHEMA_VERSION}"))


def enable_sqlite_foreign_keys(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _on_connect(dbapi_connection, _record):  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")  # WAL ile güvenli; her commit'te diske zorlamaz
        cursor.close()
