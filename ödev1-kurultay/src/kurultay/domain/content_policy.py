"""İçerik denetimi — ikinci bir Chain of Responsibility.

Sansür yok ilkesi: tek ENGEL gerçek tehdittir (ve boş metin). Diğer halkalar engellemez, yalnızca not düşer
(ör. ontolojiyle örtüşme puanı, daha uygun kavram önerisi). Kararı yine oylama verir.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from kurultay.domain.ontology import Ontology
from kurultay.domain.text import THREAT_MESSAGE, find_threat


@dataclass
class ContentReview:
    text: str
    title: str = ""
    concept_ids: frozenset[str] = frozenset()
    blockers: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    relevance: int = 0
    suggested: list[str] = field(default_factory=list)

    @property
    def allowed(self) -> bool:
        return not self.blockers


class ContentCheck(ABC):
    def __init__(self) -> None:
        self._next: ContentCheck | None = None

    def set_next(self, check: ContentCheck) -> ContentCheck:
        self._next = check
        return check

    def run(self, review: ContentReview) -> ContentReview:
        self.inspect(review)
        return self._next.run(review) if self._next else review

    @abstractmethod
    def inspect(self, review: ContentReview) -> None: ...


class NotEmptyCheck(ContentCheck):
    def inspect(self, review: ContentReview) -> None:
        if not (review.title or review.text).strip():
            review.blockers.append("Metin boş olamaz.")


class ThreatCheck(ContentCheck):
    def inspect(self, review: ContentReview) -> None:
        if find_threat(f"{review.title}\n{review.text}"):
            review.blockers.append(THREAT_MESSAGE)


class OntologyFitCheck(ContentCheck):
    """Bilgi notu: metin seçilen kavramlarla ne kadar örtüşüyor; daha uygun bir kavram var mı."""

    def __init__(self, ontology: Ontology) -> None:
        super().__init__()
        self.ontology = ontology

    def inspect(self, review: ContentReview) -> None:
        if not review.concept_ids:
            return
        text = f"{review.title} {review.text}"
        review.relevance = self.ontology.relevance(text, review.concept_ids)
        neighbourhood = self.ontology.neighbourhood(review.concept_ids)
        better = [m for m in self.ontology.suggest(text) if m.concept.id not in neighbourhood]
        if better and (review.relevance == 0 or better[0].score >= 2):
            review.suggested = [m.concept.id for m in better]
            review.notes.append(f"“{better[0].concept.name}” kavramı da uygun olabilir.")
        if review.relevance == 0:
            review.notes.append("Metin seçilen kavramlarla belirgin bir örtüşme göstermiyor; oylayanlar buna bakabilir.")


def review_content(
    text: str, ontology: Ontology | None = None, title: str = "", concept_ids: frozenset[str] = frozenset()
) -> ContentReview:
    head = NotEmptyCheck()
    tail = head.set_next(ThreatCheck())
    if ontology is not None:
        tail.set_next(OntologyFitCheck(ontology))
    return head.run(ContentReview(text=text, title=title, concept_ids=concept_ids))
