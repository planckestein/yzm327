"""Bildirim: Observer deseninin ürettiği kayıt ("ilgilendiğin bir konuda oylama başladı")."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass
class Notification:
    id: str
    user_id: str
    text: str
    link: str
    created_at: datetime
    read_at: datetime | None = None

    @property
    def is_read(self) -> bool:
        return self.read_at is not None
