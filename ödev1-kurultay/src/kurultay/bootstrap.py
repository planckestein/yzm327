"""Kompozisyon kökü (Composition Root): bütün bağımlılıklar burada, yalnızca burada birbirine bağlanır.

İşleyiciler bağımlılıklarını parametre adlarıyla ister (``uow``, ``clock``, ``hasher`` …); ``inject`` bunları
imzaya bakarak doldurur. Testler aynı fonksiyonu sahte bağımlılıklarla çağırır; uygulama kodu değişmez.
"""

from __future__ import annotations

import inspect
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import Engine, create_engine

from kurultay.adapters import orm
from kurultay.adapters.clock import SystemClock
from kurultay.adapters.llm.ollama import FallbackExpertModel, OllamaExpertModel
from kurultay.adapters.llm.rule_based import RuleBasedExpertModel
from kurultay.adapters.security import Pbkdf2PasswordHasher
from kurultay.service_layer import handlers
from kurultay.service_layer.agents import ExpertAgentFactory, ExpertModelRegistry
from kurultay.service_layer.messagebus import MessageBus
from kurultay.service_layer.notifications import (
    ExpertAgentNotifier,
    InterestedMemberNotifier,
    VotingNotificationCenter,
)
from kurultay.service_layer.ports import Clock, LedgerReplica, PasswordHasher
from kurultay.service_layer.proxies import (
    AuthorizationProxy,
    CommandGateway,
    MessageBusGateway,
    ProfileAccessProxy,
    ProfileReader,
    RepositoryProfileReader,
)
from kurultay.adapters.repository import AppendOnlyReadCache
from kurultay.service_layer.unit_of_work import AbstractUnitOfWork, SqlAlchemyUnitOfWork


def default_model_registry() -> ExpertModelRegistry:
    registry = ExpertModelRegistry()
    registry.register("kural", lambda option: RuleBasedExpertModel(), default=True)
    registry.register(
        "ollama", lambda option: FallbackExpertModel(OllamaExpertModel(option or "llama3.2"), RuleBasedExpertModel())
    )
    return registry


def sqlite_engine(url: str = "sqlite:///:memory:") -> Engine:
    kwargs: dict[str, Any] = {"connect_args": {"check_same_thread": False}}
    if url.endswith(":memory:"):
        from sqlalchemy.pool import StaticPool

        kwargs["poolclass"] = StaticPool
    engine = create_engine(url, **kwargs)
    orm.enable_sqlite_foreign_keys(engine)
    orm.create_schema(engine)
    return engine


def inject(handler: Callable[..., Any], dependencies: dict[str, Any]) -> Callable[[Any], Any]:
    params = inspect.signature(handler).parameters
    deps = {name: dep for name, dep in dependencies.items() if name in params}
    return lambda message: handler(message, **deps)


@dataclass
class Application:
    bus: MessageBus
    gateway: CommandGateway
    profiles: ProfileReader
    uow_factory: Callable[[], AbstractUnitOfWork]
    clock: Clock
    hasher: PasswordHasher
    notification_center: VotingNotificationCenter
    model_registry: ExpertModelRegistry
    replicas: Sequence[LedgerReplica] = field(default_factory=list)


def bootstrap(
    uow_factory: Callable[[], AbstractUnitOfWork] | None = None,
    clock: Clock | None = None,
    hasher: PasswordHasher | None = None,
    replicas: Sequence[LedgerReplica] = (),
    model_registry: ExpertModelRegistry | None = None,
    engine: Engine | None = None,
) -> Application:
    if uow_factory is None:
        engine = engine or sqlite_engine()
        cache = AppendOnlyReadCache()  # motor başına bir tane; bütün Unit of Work'ler paylaşır
        uow_factory = lambda: SqlAlchemyUnitOfWork(engine, cache)  # noqa: E731
    clock = clock or SystemClock()
    hasher = hasher or Pbkdf2PasswordHasher()
    model_registry = model_registry or default_model_registry()

    center = VotingNotificationCenter()
    center.attach(InterestedMemberNotifier(clock))
    center.attach(ExpertAgentNotifier(ExpertAgentFactory(model_registry)))

    uow = uow_factory()
    dependencies = {"uow": uow, "clock": clock, "hasher": hasher, "center": center, "replicas": replicas}
    bus = MessageBus(
        uow=uow,
        event_handlers={
            event_type: [inject(h, dependencies) for h in event_handlers]
            for event_type, event_handlers in handlers.EVENT_HANDLERS.items()
        },
        command_handlers={
            command_type: inject(h, dependencies) for command_type, h in handlers.COMMAND_HANDLERS.items()
        },
        catch_all_event_handlers=[inject(handlers.record_in_ledger, dependencies)],
    )
    gateway = AuthorizationProxy(MessageBusGateway(bus), uow_factory)
    profiles = ProfileAccessProxy(RepositoryProfileReader(uow_factory))
    return Application(bus, gateway, profiles, uow_factory, clock, hasher, center, model_registry, list(replicas))
