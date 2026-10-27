"""YZ "Bilgili Kullanıcı" (Expert Agent).

Bir YZ ajanı, sistemde ``yz_ajan`` rolüyle kayıtlı bir kullanıcıdır: ilgi alanları ve uzmanlıkları vardır,
ontolojisi eşleşen oylamalara bildirim alır ve oy kullanır (oyu yönetmelikteki oranla, varsayılan yarım sayılır).
Ajanın düşünen kısmı bir ``ExpertModel``dir; hangi modelin kullanılacağını ``ExpertModelRegistry``
(Factory/Registry) belirler. Modeller ``adapters/llm`` altındaki Adapter'lardır; hepsi ücretsizdir.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from kurultay.domain.ontology import Ontology
from kurultay.domain.proposal import Proposal
from kurultay.domain.text import find_threat
from kurultay.domain.topic import Topic
from kurultay.domain.user import User
from kurultay.domain.voting import Choice
from kurultay.service_layer.ports import Assessment, AssessmentRequest, ExpertModel


@dataclass(frozen=True)
class AgentVerdict:
    choice: Choice
    rationale: str


class ExpertAgent:
    def __init__(self, user: User, model: ExpertModel) -> None:
        self.user = user
        self.model = model

    def review(self, proposal: Proposal, ontology: Ontology, topic: Topic | None, proposer: User | None) -> AgentVerdict:
        request = self._build_request(proposal, ontology, topic, proposer)
        assessment: Assessment = self.model.assess(request)
        choice = Choice.YES if assessment.approve else Choice.NO
        return AgentVerdict(choice, f"{assessment.rationale} ({assessment.model_label})")

    def _build_request(
        self, proposal: Proposal, ontology: Ontology, topic: Topic | None, proposer: User | None
    ) -> AssessmentRequest:
        payload = proposal.payload
        text = " ".join(
            filter(None, [proposal.title, proposal.rationale, payload.get("description", ""), payload.get("text", ""),
                          payload.get("message_text", ""), topic.description if topic else ""])
        )
        concept_names = [c.name for cid in proposal.concept_ids if (c := ontology.get(cid))]
        expertise = tuple(c.name for cid in self.user.concept_ids if (c := ontology.get(cid)))
        prompt = (
            "Sen Kurultay adlı oylamalı bir forumda, oy hakkı olan tarafsız bir uzman YZ ajanısın.\n"
            f"Uzmanlık alanların: {', '.join(expertise) or '-'}.\n"
            f"Teklif türü: {proposal.kind.label}\nBaşlık: {proposal.title}\n"
            f"Kavramlar: {', '.join(concept_names) or 'genel'}\n"
            f"Gerekçe ve içerik: {text}\n\n"
            "İlke: tehdit dışında her ifade serbesttir; tartışmalar silinmez, yalnızca gizlenir; azınlık korunur.\n"
            "İlk satıra yalnızca KARAR: EVET ya da KARAR: HAYIR yaz. İkinci satıra 'GEREKÇE:' ile başlayan tek bir "
            "Türkçe cümle yaz."
        )
        change = (payload["key"], payload["value"]) if proposal.kind.value == "yonetmelik" else None
        return AssessmentRequest(
            prompt=prompt,
            proposal_kind=proposal.kind.value,
            title=proposal.title,
            text=text,
            relevance=ontology.relevance(text, proposal.concept_ids) if proposal.concept_ids else 50,
            contains_threat=find_threat(text) is not None,
            discussion_size=topic.visible_message_count() if topic else 0,
            proposer_reputation=proposer.reputation if proposer else 0,
            regulation_change=change,
            agent_expertise=expertise,
        )


ModelFactory = Callable[[], ExpertModel]


class ExpertModelRegistry:
    """Registry + Factory: model anahtarından (ör. ``"kural"``, ``"ollama:llama3.2"``) model nesnesi üretir."""

    def __init__(self) -> None:
        self._factories: dict[str, Callable[[str], ExpertModel]] = {}
        self._default: str | None = None

    def register(self, prefix: str, factory: Callable[[str], ExpertModel], default: bool = False) -> None:
        self._factories[prefix] = factory
        if default or self._default is None:
            self._default = prefix

    def create(self, key: str | None) -> ExpertModel:
        prefix, _, option = (key or self._default or "").partition(":")
        factory = self._factories.get(prefix) or self._factories[self._default or ""]
        return factory(option)

    @property
    def keys(self) -> list[str]:
        return list(self._factories)


class ExpertAgentFactory:
    def __init__(self, registry: ExpertModelRegistry) -> None:
        self.registry = registry

    def create(self, user: User) -> ExpertAgent:
        return ExpertAgent(user, self.registry.create(user.agent_model))
