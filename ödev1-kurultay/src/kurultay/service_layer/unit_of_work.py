"""Unit of Work: atomik işlem sınırı ve olay toplayıcı.

Kullanım (context manager)::

    with uow:
        topic = uow.topics.get(topic_id)
        topic.post_message(...)
        uow.commit()

``with`` bloğundan ``commit`` çağrılmadan çıkılırsa her şey geri alınır. Commit sonrası Message Bus,
``collect_new_events()`` ile aggregate'lerin yaydığı olayları toplar ve işleyicilere dağıtır.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator
from typing import Any, Self

from sqlalchemy import Connection, Engine

from kurultay.adapters import repository
from kurultay.domain.events import Event


class AbstractUnitOfWork(ABC):
    users: repository.AbstractUserRepository
    topics: repository.AbstractTopicRepository
    proposals: repository.AbstractProposalRepository
    ontology: repository.AbstractOntologyRepository
    regulations: repository.AbstractRegulationRepository
    ledger: repository.AbstractLedgerRepository
    notifications: repository.AbstractNotificationRepository

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args: Any) -> None:
        self.rollback()

    def commit(self) -> None:
        self._commit()

    def collect_new_events(self) -> Iterator[Event]:
        repos: tuple[repository.AbstractRepository[Any], ...] = (self.users, self.topics, self.proposals)
        for repo in repos:
            for aggregate in list(repo.seen):
                while aggregate.events:
                    yield aggregate.events.pop(0)

    @abstractmethod
    def _commit(self) -> None: ...

    @abstractmethod
    def rollback(self) -> None: ...


class SqlAlchemyUnitOfWork(AbstractUnitOfWork):
    def __init__(self, engine: Engine, cache: repository.AppendOnlyReadCache | None = None) -> None:
        self.engine = engine
        self.cache = cache if cache is not None else repository.AppendOnlyReadCache()
        self.conn: Connection | None = None

    def __enter__(self) -> Self:
        self.conn = self.engine.connect()
        self.conn.begin()
        self.users = repository.SqlAlchemyUserRepository(self.conn)
        self.topics = repository.SqlAlchemyTopicRepository(self.conn)
        self.proposals = repository.SqlAlchemyProposalRepository(self.conn, self.cache)
        self.ontology = repository.SqlAlchemyOntologyRepository(self.conn)
        self.regulations = repository.SqlAlchemyRegulationRepository(self.conn)
        self.ledger = repository.SqlAlchemyLedgerRepository(self.conn)
        self.notifications = repository.SqlAlchemyNotificationRepository(self.conn)
        return super().__enter__()

    def __exit__(self, *args: Any) -> None:
        super().__exit__(*args)
        assert self.conn is not None
        self.conn.close()

    def _commit(self) -> None:
        assert self.conn is not None
        for repo in (self.users, self.topics, self.proposals):
            repo.flush()
        self.conn.commit()
        self.conn.begin()

    def rollback(self) -> None:
        if self.conn is not None and self.conn.in_transaction():
            self.conn.rollback()
