"""Chain of Responsibility: "bu kişi bu oylamada oy kullanabilir mi?"

Her halka tek bir kuralı denetler ve ya reddeder ya da sırayı bir sonrakine bırakır:

    Kimlik ─▶ Oylama açık mı ─▶ Rol ─▶ Yönetmelik ─▶ Ontolojik ilgi ─▶ Daha önce oy verdi mi ─▶ Pusula kuralı

Yeni bir kural eklemek zincire bir halka eklemektir; mevcut halkalar değişmez. Sonuç yalnızca evet/hayır
değildir: hangi halkalardan geçildiği (``trail``) da döner, arayüz "neden oy veremiyorum?" sorusunu buna
göre yanıtlar. Seçmen listesini (electorate) hesaplamak için zincirin ilk beş halkası kullanılır.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import TYPE_CHECKING

from kurultay.domain.exceptions import InvalidValue
from kurultay.domain.ontology import Ontology
from kurultay.domain.regulation import Regulation
from kurultay.domain.user import Role, User
from kurultay.domain.voting import Electorate, VoterProfile

if TYPE_CHECKING:
    from kurultay.domain.proposal import Proposal
    from kurultay.domain.voting import VotingStrategy


@dataclass(frozen=True)
class EligibilityContext:
    user: User | None
    proposal: Proposal
    ontology: Ontology
    regulation: Regulation
    today: date
    strategy: VotingStrategy | None = None
    intensity: int = 1
    credits_spent: int = 0  # açık karesel oylamalarda harcanmış ek kredi (servis katmanı hesaplar)


@dataclass(frozen=True)
class EligibilityDecision:
    allowed: bool
    reason: str = ""
    trail: tuple[str, ...] = ()

    @classmethod
    def allow(cls, trail: tuple[str, ...]) -> EligibilityDecision:
        return cls(True, "Oy kullanabilirsin.", trail)


class EligibilityHandler(ABC):
    label: str = ""

    def __init__(self) -> None:
        self._next: EligibilityHandler | None = None

    def set_next(self, handler: EligibilityHandler) -> EligibilityHandler:
        self._next = handler
        return handler

    def handle(self, ctx: EligibilityContext, trail: tuple[str, ...] = ()) -> EligibilityDecision:
        refusal = self.check(ctx)
        if refusal is not None:
            return EligibilityDecision(False, refusal, trail)
        trail = (*trail, self.label)
        return self._next.handle(ctx, trail) if self._next else EligibilityDecision.allow(trail)

    @abstractmethod
    def check(self, ctx: EligibilityContext) -> str | None:
        """Kural ihlal ediliyorsa gerekçeyi döndürür, değilse ``None``."""


class AuthenticationHandler(EligibilityHandler):
    label = "Kimlik"

    def check(self, ctx: EligibilityContext) -> str | None:
        return "Oy kullanmak için giriş yapmalısın." if ctx.user is None else None


class ProposalOpenHandler(EligibilityHandler):
    label = "Oylama açık"

    def check(self, ctx: EligibilityContext) -> str | None:
        return None if ctx.proposal.is_open else "Bu oylama kapandı."


class RoleHandler(EligibilityHandler):
    label = "Rol"

    def check(self, ctx: EligibilityContext) -> str | None:
        assert ctx.user is not None
        if ctx.user.role is Role.AI_AGENT and not ctx.regulation.agents_may_vote:
            return "Yönetmelik şu an YZ ajanlarının oy kullanmasına izin vermiyor."
        return None


class RegulationHandler(EligibilityHandler):
    """Yönetmelik kuralları: yaş sınırı ve kişinin kendi uzmanlığına oy verememesi."""

    label = "Yönetmelik"

    def check(self, ctx: EligibilityContext) -> str | None:
        user = ctx.user
        assert user is not None
        if not user.is_agent and user.personal_info.age_on(ctx.today) < ctx.regulation.minimum_age:
            return f"Oy kullanmak için en az {ctx.regulation.minimum_age} yaşında olmalısın."
        if ctx.proposal.kind.value == "uzmanlik" and ctx.proposal.target_id == user.id:
            return "Kendi uzmanlık teklifine oy veremezsin."
        return None


class OntologyInterestHandler(EligibilityHandler):
    """Seçmen kısıtı: yalnızca teklifin kavramlarıyla ontolojik olarak eşleşenler oy kullanır."""

    label = "Ontolojik ilgi"

    def check(self, ctx: EligibilityContext) -> str | None:
        assert ctx.user is not None
        frozen = ctx.proposal.electorate  # kütük oylama açılırken ontolojiye göre dondurulur
        relevant = ctx.ontology.is_relevant_to(ctx.user.concept_ids, ctx.proposal.concept_ids)
        if frozen is not None and ctx.user.id in frozen or frozen is None and relevant:
            return None
        if relevant:
            return ("Seçmen kütüğü oylama açıldığında belirlendi; o sırada bu konuyu takip etmiyordun "
                    "ya da henüz üye değildin. Sonraki oylamalarda oy kullanabilirsin.")
        names = ", ".join(
            c.name for cid in sorted(ctx.proposal.concept_ids) if (c := ctx.ontology.get(cid)) is not None
        )
        return f"Bu teklif yalnızca şu kavramlarla ilgilenenleri ilgilendiriyor: {names}. İlgi alanlarına ekleyebilirsin."


class NotAlreadyVotedHandler(EligibilityHandler):
    label = "Tek oy"

    def check(self, ctx: EligibilityContext) -> str | None:
        assert ctx.user is not None
        return "Bu oylamada zaten oy kullandın." if ctx.proposal.has_voted(ctx.user.id) else None


class BallotRuleHandler(EligibilityHandler):
    """Stratejinin pusula kuralı (ör. karesel oylamada kredi bütçesi)."""

    label = "Pusula kuralı"

    def check(self, ctx: EligibilityContext) -> str | None:
        if ctx.strategy is None or ctx.user is None:
            return None
        try:
            ctx.strategy.validate(ctx.intensity, VoterProfile(ctx.user.id, is_agent=ctx.user.is_agent), ctx.credits_spent)
        except InvalidValue as exc:
            return str(exc)
        return None


def _chain(*handlers: EligibilityHandler) -> EligibilityHandler:
    head = handlers[0]
    current = head
    for handler in handlers[1:]:
        current = current.set_next(handler)
    return head


def build_voting_chain() -> EligibilityHandler:
    return _chain(
        AuthenticationHandler(),
        ProposalOpenHandler(),
        RoleHandler(),
        RegulationHandler(),
        OntologyInterestHandler(),
        NotAlreadyVotedHandler(),
        BallotRuleHandler(),
    )


def build_electorate_chain() -> EligibilityHandler:
    """Seçmen listesi için: oy vermiş olmak ve oylamanın kapanmış olması seçmenlikten çıkarmaz."""
    return _chain(AuthenticationHandler(), RoleHandler(), RegulationHandler(), OntologyInterestHandler())


def build_electorate(
    users: list[User], proposal: Proposal, ontology: Ontology, regulation: Regulation, today: date
) -> Electorate:
    """Seçmen listesi: zincirden geçen kullanıcılar, oylamayla ilgili özellikleriyle birlikte.

    Teklifin kütüğü dondurulmuşsa o döner; ``users`` yalnızca kütük oluşturulurken kullanılır.
    """
    if proposal.electorate is not None:
        return proposal.electorate
    chain = build_electorate_chain()
    neighbourhood = ontology.neighbourhood(proposal.concept_ids)
    voters = tuple(
        VoterProfile(
            user_id=u.id,
            reputation=u.reputation,
            expertise_level=u.expertise_level(neighbourhood),
            is_agent=u.is_agent,
        )
        for u in users
        if chain.handle(EligibilityContext(u, proposal, ontology, regulation, today)).allowed
    )
    return Electorate(voters, regulation.agent_weight)
