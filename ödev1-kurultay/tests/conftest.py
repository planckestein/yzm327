from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime

import pytest

from kurultay.adapters.clock import ManualClock
from kurultay.adapters.ledger_nodes import InMemoryLedgerNode
from kurultay.bootstrap import Application, bootstrap
from kurultay.domain import commands as c
from kurultay.domain.ontology import Ontology
from kurultay.domain.user import Role, User
from kurultay.domain.value_objects import Nickname, PasswordHash, PersonalInfo, new_id
from kurultay.reference_data import build_ontology
from kurultay.service_layer.agents import ExpertModelRegistry
from tests.fakes import FakeExpertModel, FakePasswordHasher, FakeUnitOfWork

NOW = datetime(2026, 10, 20, 10, 0)


@pytest.fixture
def ontology() -> Ontology:
    return build_ontology()


def make_user(
    nickname: str = "deneme",
    interests: tuple[str, ...] = ("ekonomi",),
    role: Role = Role.MEMBER,
    birth: date = date(1995, 5, 5),
    reputation: int = 0,
) -> User:
    return User(
        new_id(), Nickname(nickname), PersonalInfo("Ad", "Soyad", birth, "Adres"), PasswordHash("x"), role, NOW,
        interests=frozenset(interests), reputation=reputation,
    )


@dataclass
class Harness:
    app: Application
    uow: FakeUnitOfWork
    clock: ManualClock
    model: FakeExpertModel
    nodes: list[InMemoryLedgerNode]

    def register(self, nickname: str, interests: tuple[str, ...] = ("ekonomi",), role: str = "uye",
                 birth: date = date(1995, 5, 5)) -> str:
        return str(self.app.bus.handle(
            c.RegisterUser(None, nickname, "Ad", "Soyad", birth, "Adres", "sifre1234", role, interests,
                           "sahte" if role == "yz_ajan" else None)
        ))

    def run(self, command: c.Command) -> object:
        return self.app.gateway.dispatch(command)

    def proposal_for(self, target_id: str):  # type: ignore[no-untyped-def]
        return next(p for p in self.uow.proposals.list() if p.target_id == target_id)


@pytest.fixture
def harness() -> Harness:
    uow = FakeUnitOfWork()
    clock = ManualClock(NOW)
    model = FakeExpertModel(approve=True)
    registry = ExpertModelRegistry()
    registry.register("sahte", lambda option: model, default=True)
    nodes = [InMemoryLedgerNode("A"), InMemoryLedgerNode("B")]
    app = bootstrap(uow_factory=lambda: uow, clock=clock, hasher=FakePasswordHasher(), replicas=nodes,
                    model_registry=registry)
    return Harness(app, uow, clock, model, nodes)


@pytest.fixture
def make_harness() -> Callable[..., Harness]:
    def factory(approve: bool = True) -> Harness:
        uow = FakeUnitOfWork()
        clock = ManualClock(NOW)
        model = FakeExpertModel(approve=approve)
        registry = ExpertModelRegistry()
        registry.register("sahte", lambda option: model, default=True)
        app = bootstrap(uow_factory=lambda: uow, clock=clock, hasher=FakePasswordHasher(), model_registry=registry)
        return Harness(app, uow, clock, model, [])

    return factory


# ---------------------------------------------------------------- Mimari sayfası için test özeti

def pytest_sessionfinish(session, exitstatus):  # type: ignore[no-untyped-def]
    """Tam test koşusunun özetini docs/test-ozeti.json'a yazar (arayüzdeki Mimari sayfası gösterir)."""
    import json
    from pathlib import Path

    reporter = session.config.pluginmanager.get_plugin("terminalreporter")
    if reporter is None or session.config.getoption("keyword") or session.config.getoption("markexpr"):
        return
    passed = len(reporter.stats.get("passed", []))
    failed = len(reporter.stats.get("failed", [])) + len(reporter.stats.get("error", []))
    tests_dir = Path(__file__).resolve().parent
    if any(Path(a.split("::")[0]).resolve() != tests_dir for a in session.config.args):  # yalnızca tam koşu
        return
    out = tests_dir.parent / "docs" / "test-ozeti.json"
    out.write_text(json.dumps({"passed": passed, "failed": failed, "total": passed + failed}), encoding="utf-8")
