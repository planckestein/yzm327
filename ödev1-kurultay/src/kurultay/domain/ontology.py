"""Ontoloji: konuları, kullanıcı ilgi alanlarını, uzmanlıkları ve YZ ajanlarını birbirine bağlayan kavram ağı.

Kavramlar bir ağaç oluşturur (genel → özel) ve ayrıca "ilişkili" kenarlarla birbirine bağlanır.
Seçmen kısıtı buradan gelir: bir teklif yalnızca kavramlarının *komşuluğuna* ilgi duyan
kullanıcılar ve YZ ajanları tarafından oylanabilir.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from enum import Enum

from kurultay.domain.text import keyword_hits


@dataclass(frozen=True)
class Concept:
    id: str
    name: str
    description: str
    keywords: tuple[str, ...]
    parent_id: str | None = None


class RelationKind(str, Enum):
    RELATED = "ilgili"


@dataclass(frozen=True)
class ConceptRelation:
    source: str
    target: str
    kind: RelationKind = RelationKind.RELATED


@dataclass(frozen=True)
class ConceptMatch:
    concept: Concept
    hits: tuple[str, ...]

    @property
    def score(self) -> int:
        return len(self.hits)


class Ontology:
    def __init__(self, concepts: Iterable[Concept] = (), relations: Iterable[ConceptRelation] = ()) -> None:
        self.concepts: dict[str, Concept] = {c.id: c for c in concepts}
        self.relations: list[ConceptRelation] = list(relations)

    # ---- kurma

    def add(self, concept: Concept) -> None:
        if concept.parent_id is not None and concept.parent_id not in self.concepts:
            raise ValueError(f"Üst kavram yok: {concept.parent_id}")
        self.concepts[concept.id] = concept

    def relate(self, a: str, b: str) -> None:
        self.relations.append(ConceptRelation(a, b))

    # ---- gezinme

    def get(self, concept_id: str) -> Concept | None:
        return self.concepts.get(concept_id)

    def roots(self) -> list[Concept]:
        return [c for c in self.concepts.values() if c.parent_id is None]

    def children(self, concept_id: str) -> list[Concept]:
        return [c for c in self.concepts.values() if c.parent_id == concept_id]

    def ancestors(self, concept_id: str) -> list[Concept]:
        """Kökten kavramın kendisine kadar olan zincir (kendisi dahil)."""
        chain: list[Concept] = []
        current = self.concepts.get(concept_id)
        while current is not None:
            chain.insert(0, current)
            current = self.concepts.get(current.parent_id) if current.parent_id else None
        return chain

    def related(self, concept_id: str) -> set[str]:
        return {r.target for r in self.relations if r.source == concept_id} | {
            r.source for r in self.relations if r.target == concept_id
        }

    def neighbourhood(self, concept_ids: Iterable[str]) -> frozenset[str]:
        """Bir konuyu ilgilendiren kavramlar: kavramın kendisi, üst kavramları ve ilişkili kavramlar.

        Üst kavramı takip eden (ör. "Ekonomi") alt kavramdaki ("Vergi ve Bütçe") teklifleri de oylar;
        "ilişkili" kenarlar disiplinler arası konuları (ör. Veri Gizliliği ↔ Temel Haklar) bağlar.
        """
        result: set[str] = set()
        for cid in concept_ids:
            result |= {c.id for c in self.ancestors(cid)}
            result |= self.related(cid)
        return frozenset(result)

    def is_relevant_to(self, user_concepts: frozenset[str], topic_concepts: Iterable[str]) -> bool:
        topic_concepts = tuple(topic_concepts)
        if not topic_concepts:  # kavramı olmayan teklif (ör. yönetmelik) herkesi ilgilendirir
            return True
        return bool(user_concepts & self.neighbourhood(topic_concepts))

    # ---- metinden kavram önerisi

    def suggest(self, text: str, limit: int = 3) -> list[ConceptMatch]:
        matches = [ConceptMatch(c, tuple(keyword_hits(text, c.keywords))) for c in self.concepts.values()]
        matches = [m for m in matches if m.score > 0]
        matches.sort(key=lambda m: (-m.score, m.concept.parent_id is None))
        return matches[:limit]

    def relevance(self, text: str, concept_ids: Iterable[str]) -> int:
        """0-100: metin, seçilen kavramların (ve üstlerinin) anahtar kelimeleriyle ne kadar örtüşüyor."""
        words: set[str] = set()
        for cid in self.neighbourhood(concept_ids):
            concept = self.concepts.get(cid)
            if concept:
                words |= set(keyword_hits(text, concept.keywords))
        return min(100, 25 * len(words))
