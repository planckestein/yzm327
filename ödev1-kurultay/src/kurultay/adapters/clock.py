"""Saat adaptörleri. Servis katmanı ``Clock`` portuna bağlıdır; böylece süreler testte ve demoda yönetilebilir."""

from __future__ import annotations

from datetime import datetime, timedelta


class SystemClock:
    def __init__(self) -> None:
        self.offset = timedelta()

    def now(self) -> datetime:
        return datetime.now().replace(microsecond=0) + self.offset

    def advance(self, delta: timedelta) -> None:
        """Yalnızca demo: oylama sürelerinin dolmasını beklemeden göstermek için saati ileri alır."""
        self.offset += delta


class ManualClock:
    def __init__(self, start: datetime) -> None:
        self.current = start

    def now(self) -> datetime:
        return self.current

    def advance(self, delta: timedelta) -> None:
        self.current += delta
