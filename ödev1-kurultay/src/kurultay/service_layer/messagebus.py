"""Message Bus: sistemdeki bütün durum değişikliklerinin geçtiği tek kapı.

* Bir **komutun** tam olarak bir işleyicisi vardır; hata olursa çağırana iletilir.
* Bir **olayın** sıfır ya da daha çok işleyicisi vardır (Observer); bir işleyicinin hatası diğerlerini durdurmaz.
* Olay işleyicileri yeni komutlar döndürebilir (ör. YZ ajanının oyu); bunlar kuyruğun sonuna eklenir.
  Böylece iç içe çağrı (recursion) olmadan, her adım kendi Unit of Work'ünde çalışır.
"""

from __future__ import annotations

import logging
import threading
from collections import deque
from collections.abc import Callable, Iterable
from typing import Any

from kurultay.domain.commands import Command
from kurultay.domain.events import Event
from kurultay.service_layer.unit_of_work import AbstractUnitOfWork

logger = logging.getLogger(__name__)

Message = Command | Event
EventHandler = Callable[[Any], Iterable[Command] | None]
CommandHandler = Callable[[Any], Any]


class MessageBus:
    def __init__(
        self,
        uow: AbstractUnitOfWork,
        event_handlers: dict[type[Event], list[EventHandler]],
        command_handlers: dict[type[Command], CommandHandler],
        catch_all_event_handlers: list[EventHandler] | None = None,
    ) -> None:
        self.uow = uow
        self.event_handlers = event_handlers
        self.command_handlers = command_handlers
        self.catch_all = catch_all_event_handlers or []
        self.handled: list[Message] = []  # gözlem, canlı gösterim ve testler için
        self._lock = threading.RLock()  # aynı anda tek mesaj zinciri: Unit of Work paylaşılır

    def handle(self, message: Message) -> Any:
        """Mesajı ve doğurduğu bütün olay/komutları işler; ilk komutun sonucunu döndürür."""
        with self._lock:
            return self._handle(message)

    def _handle(self, message: Message) -> Any:
        queue: deque[Message] = deque([message])
        first_result: Any = None
        is_first = True
        while queue:
            current = queue.popleft()
            self.handled.append(current)
            if isinstance(current, Command):
                try:
                    result = self._handle_command(current, queue)
                except Exception:
                    if is_first:
                        raise
                    logger.exception("İç komut başarısız: %s", current)
                    result = None
                if is_first:
                    first_result = result
            else:
                self._handle_event(current, queue)
            is_first = False
        return first_result

    def _handle_command(self, command: Command, queue: deque[Message]) -> Any:
        handler = self.command_handlers[type(command)]
        result = handler(command)
        queue.extend(self.uow.collect_new_events())
        return result

    def _handle_event(self, event: Event, queue: deque[Message]) -> None:
        for handler in [*self.catch_all, *self.event_handlers.get(type(event), [])]:
            try:
                follow_ups = handler(event)
                queue.extend(self.uow.collect_new_events())
                if follow_ups:
                    queue.extend(follow_ups)
            except Exception:
                logger.exception("Olay işleyicisi başarısız: %s", event)
