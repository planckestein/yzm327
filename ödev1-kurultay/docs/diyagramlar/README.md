# UML diyagramları (Mermaid)
Her diyagramın kaynağı bu klasördeki `.mmd` dosyasıdır; `.svg` dosyaları `mmdc` ile üretilmiştir. Uygulamada **Mimari** sayfasında da görüntülenir.

## Katmanlar ve bağımlılığın tersine çevrilmesi

*Sınıf diyagramı.* Entrypoints → Service Layer → Domain; Adapters yalnızca portları (arayüzleri) gerçekler. Domain hiçbir katmanı bilmez.

```mermaid
classDiagram
  direction TB
  namespace Entrypoints {
    class WebApp {
      +create_app(veri_klasoru) FastAPI
      -act(request, komut) Redirect
    }
  }
  namespace ServiceLayer {
    class CommandGateway {
      <<interface>>
      +dispatch(command) Any
    }
    class AuthorizationProxy
    class MessageBusGateway
    class MessageBus {
      +handle(message) Any
    }
    class AbstractUnitOfWork {
      <<abstract>>
      +users
      +topics
      +proposals
      +ledger
      +commit()
      +rollback()
      +collect_new_events() Iterator~Event~
    }
    class Clock {
      <<interface>>
      +now() datetime
    }
    class ExpertModel {
      <<interface>>
      +assess(request) Assessment
    }
    class LedgerReplica {
      <<interface>>
      +append(entry)
      +entries() list
    }
  }
  namespace Domain {
    class Topic
    class Proposal
    class User
    class Ontology
  }
  namespace Adapters {
    class SqlAlchemyUnitOfWork
    class SqlAlchemyTopicRepository
    class OllamaExpertModel
    class RuleBasedExpertModel
    class JsonLinesLedgerNode
    class SystemClock
  }
  WebApp ..> CommandGateway : komut gönderir
  CommandGateway <|.. AuthorizationProxy
  CommandGateway <|.. MessageBusGateway
  AuthorizationProxy o--> MessageBusGateway : vekil
  MessageBusGateway --> MessageBus
  MessageBus --> AbstractUnitOfWork
  AbstractUnitOfWork ..> Topic
  AbstractUnitOfWork ..> Proposal
  AbstractUnitOfWork ..> User
  AbstractUnitOfWork ..> Ontology
  AbstractUnitOfWork <|-- SqlAlchemyUnitOfWork
  SqlAlchemyUnitOfWork *-- SqlAlchemyTopicRepository
  ExpertModel <|.. OllamaExpertModel
  ExpertModel <|.. RuleBasedExpertModel
  LedgerReplica <|.. JsonLinesLedgerNode
  Clock <|.. SystemClock
```

## Alan modeli: kullanıcı, ontoloji, teklif

*Sınıf diyagramı.* Değer nesneleri frozen dataclass'tır. PublicProfile'da kişisel veri alanı yoktur; PrivateProfile yalnızca sahibine verilir.

```mermaid
classDiagram
  direction LR
  class User {
    +id: str
    +nickname: Nickname
    +personal_info: PersonalInfo
    +password_hash: PasswordHash
    +role: Role
    +interests: frozenset~str~
    +expertise: tuple~Expertise~
    +reputation: int
    +public_profile() PublicProfile
    +private_profile() PrivateProfile
    +grant_expertise(concept_id, level)
    +set_interest(concept_id, following)
  }
  class Nickname {
    <<value object>>
    +value: str
  }
  class PersonalInfo {
    <<value object>>
    +first_name: str
    +last_name: str
    +birth_date: date
    +address: str
    +age_on(today) int
  }
  class PublicProfile {
    <<value object>>
    +nickname: str
    +role: Role
    +reputation: int
  }
  class PrivateProfile {
    <<value object>>
    +personal_info: PersonalInfo
  }
  class Expertise {
    <<value object>>
    +concept_id: str
    +level: int
  }
  class Role {
    <<enumeration>>
    UYE
    UZMAN
    YZ_AJAN
  }
  class Ontology {
    +concepts: dict
    +relations: list
    +ancestors(id) list~Concept~
    +neighbourhood(ids) frozenset
    +is_relevant_to(user_concepts, topic_concepts) bool
    +suggest(text) list
  }
  class Concept {
    <<value object>>
    +id: str
    +name: str
    +keywords: tuple
    +parent_id: str
  }
  class ConceptRelation {
    <<value object>>
    +source: str
    +target: str
  }
  class Proposal {
    <<aggregate root>>
    +kind: ProposalKind
    +strategy_name: str
    +threshold: str
    +concept_ids: frozenset
    +deadline: datetime
    +status: ProposalStatus
    +electorate: Electorate
    +open(...)$ Proposal
    +freeze_electorate(electorate)
    +cast(ballot, decision)
    +try_close(strategy, electorate, regulation, now)
    +supersede(reason, now)
  }
  class Electorate {
    <<value object>>
    +voters: tuple~VoterProfile~
    +agent_weight: Fraction
    +get(user_id) VoterProfile
    +total_max_weight(strategy) float
  }
  class VoterProfile {
    <<value object>>
    +user_id: str
    +reputation: int
    +expertise_level: int
    +is_agent: bool
  }
  class Ballot {
    <<value object>>
    +voter_id: str
    +choice: Choice
    +intensity: int
    +is_agent: bool
    +rationale: str
  }
  class Regulation {
    <<value object>>
    +version: int
    +minimum_age: int
    +quorum_percent: int
    +agent_weight_percent: int
    +strategies
    +thresholds
    +with_change(key, value) Regulation
  }
  User *-- Nickname
  User *-- PersonalInfo
  User *-- "0..*" Expertise
  User --> Role
  PublicProfile <|-- PrivateProfile
  User ..> PublicProfile : üretir
  Ontology *-- "1..*" Concept
  Ontology *-- "0..*" ConceptRelation
  Proposal *-- "0..*" Ballot
  Proposal *-- "1" Electorate : oylama açılınca dondurulur
  Electorate *-- "0..*" VoterProfile
  Proposal ..> Regulation : kuralı alır
  User ..> Ontology : ilgi alanları
  Proposal ..> Ontology : kavramları
```

## Composite ve State: konu ağacı ve yaşam döngüsü

*Sınıf diyagramı.* Topic (bileşik) ve Message (yaprak) aynı TopicComponent arayüzünü uygular. Konunun davranışı durum nesnesine devredilir.

```mermaid
classDiagram
  direction TB
  class TopicComponent {
    <<abstract>>
    +id: str
    +author_id: str
    +parent: Topic
    +children()* Sequence
    +is_visible()* bool
    +visible_message_count()* int
    +walk() Iterator
    +root() Topic
  }
  class Message {
    <<leaf>>
    +text: str
    +content_hash: ContentHash
    +mask: Mask
    +apply_mask(proposal_id, now)
  }
  class Topic {
    <<composite, aggregate root>>
    +concept_ids: frozenset
    +state: TopicState
    +revisions: list~TopicRevision~
    +add(component)
    +post_message(author, text, now) Message
    +attach_subtopic(topic)
    +revise(title, description, proposal_id, now)
    +start_voting()
    +accept()
    +request_deletion()
    +confirm_deletion(proposal_id, now)
    +archive()
  }
  class TopicRevision {
    <<memento>>
    +title: str
    +description: str
  }
  class TopicState {
    <<abstract>>
    +name: str
    +can_discuss: bool
    +can_branch: bool
    +start_voting(topic)
    +accept(topic)
    +reject(topic)
    +request_deletion(topic)
    +confirm_deletion(topic)
    +cancel_deletion(topic)
    +archive(topic)
  }
  class Proposed
  class InVoting
  class Active
  class InDeletionVote
  class Archived
  class Hidden
  class Rejected
  TopicComponent <|-- Message
  TopicComponent <|-- Topic
  Topic o-- "0..*" TopicComponent : çocuklar
  Topic *-- "1..*" TopicRevision
  Topic --> TopicState : durum
  TopicState <|-- Proposed
  TopicState <|-- InVoting
  TopicState <|-- Active
  TopicState <|-- InDeletionVote
  TopicState <|-- Archived
  TopicState <|-- Hidden
  TopicState <|-- Rejected
```

## Konu yaşam döngüsü

*Durum diyagramı.* Önerildi → Oylamada → Aktif → Silinme Oylamasında → Arşivlendi / Gizlendi. Gizlenen kayıt silinmez.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Onerildi : ProposeTopic
  Onerildi --> Oylamada : start_voting()
  Oylamada --> Aktif : kabul
  Oylamada --> Reddedildi : red
  Aktif --> SilinmeOylamasinda : ProposeTopicDeletion
  SilinmeOylamasinda --> Aktif : silme reddedildi
  SilinmeOylamasinda --> Gizlendi : silme kabul (maskelenir)
  Aktif --> Arsivlendi : uzlaşma kabul
  Gizlendi --> [*]
  Arsivlendi --> [*]
  Reddedildi --> [*]
  note right of Gizlendi
    Kayıt silinmez, maskelenir.
    Defterdeki hash zinciri bozulmaz.
  end note
```

## Strategy: oylama algoritmaları

*Sınıf diyagramı.* Basit çoğunluk, karesel, uzman ağırlıklı ve itibar tabanlı oylama aynı Protocol'ü uygular; Registry ile seçilir.

```mermaid
classDiagram
  direction LR
  class VotingStrategy {
    <<Protocol>>
    +name: str
    +explanation: str
    +weight(ballot, voter) float
    +max_weight(voter) float
    +validate(intensity, voter)
  }
  class SimpleMajority {
    +weight() 1
  }
  class QuadraticVoting {
    +credits: int
    +cost(k) k²
    +weight() k
  }
  class ExpertWeighted {
    +weight() 1 + uzmanlık
  }
  class ReputationWeighted {
    +CAP: 2
    +weight() 1 + min(2, log₂(1+itibar/10))
  }
  class StrategyRegistry {
    <<registry>>
    +STRATEGIES: dict
    +create_strategy(name, regulation)$ VotingStrategy
  }
  class Tally {
    <<value object>>
    +yes: float
    +no: float
    +remaining_max: float
    +eligible: int
    +voted: int
  }
  class Decision {
    <<value object>>
    +outcome: Outcome
    +reason: str
  }
  class Proposal
  VotingStrategy <|.. SimpleMajority
  VotingStrategy <|.. QuadraticVoting
  VotingStrategy <|.. ExpertWeighted
  VotingStrategy <|.. ReputationWeighted
  StrategyRegistry ..> VotingStrategy : üretir
  Proposal ..> VotingStrategy : tally(strategy, ballots, electorate)
  Proposal ..> Tally
  Tally ..> Decision : decide(tally, threshold, quorum)
```

## Chain of Responsibility ve Protection Proxy

*Sınıf diyagramı.* Oy hakkı yedi halkalı zincirle denetlenir. Komutlar ve profiller vekiller (proxy) üzerinden geçer.

```mermaid
classDiagram
  direction LR
  class EligibilityHandler {
    <<abstract>>
    -_next: EligibilityHandler
    +set_next(handler) EligibilityHandler
    +handle(ctx, trail) EligibilityDecision
    +check(ctx)* str
  }
  class AuthenticationHandler
  class ProposalOpenHandler
  class RoleHandler
  class RegulationHandler
  class OntologyInterestHandler
  class NotAlreadyVotedHandler
  class BallotRuleHandler
  class EligibilityDecision {
    <<value object>>
    +allowed: bool
    +reason: str
    +trail: tuple
  }
  EligibilityHandler <|-- AuthenticationHandler
  EligibilityHandler <|-- ProposalOpenHandler
  EligibilityHandler <|-- RoleHandler
  EligibilityHandler <|-- RegulationHandler
  EligibilityHandler <|-- OntologyInterestHandler
  EligibilityHandler <|-- NotAlreadyVotedHandler
  EligibilityHandler <|-- BallotRuleHandler
  EligibilityHandler o--> EligibilityHandler : sonraki halka
  EligibilityHandler ..> EligibilityDecision

  class CommandGateway {
    <<interface>>
    +dispatch(command)
  }
  class AuthorizationProxy {
    -inner: CommandGateway
    -_authorize(command)
    +dispatch(command)
  }
  class MessageBusGateway {
    +dispatch(command)
  }
  CommandGateway <|.. AuthorizationProxy
  CommandGateway <|.. MessageBusGateway
  AuthorizationProxy o--> CommandGateway : gerçek nesne

  class ProfileReader {
    <<interface>>
    +profile(nickname, viewer_id) PublicProfile
  }
  class RepositoryProfileReader {
    +profile() PrivateProfile
  }
  class ProfileAccessProxy {
    -inner: ProfileReader
    +profile() PublicProfile | PrivateProfile
  }
  ProfileReader <|.. RepositoryProfileReader
  ProfileReader <|.. ProfileAccessProxy
  ProfileAccessProxy o--> ProfileReader : gerçek nesne
```

## Observer, Adapter ve Factory/Registry: YZ uzman ajanları

*Sınıf diyagramı.* Oylama başlayınca gözlemciler haberdar edilir; YZ ajanı modelini Registry'den alır, modeller Adapter'dır.

```mermaid
classDiagram
  direction LR
  class VotingNotificationCenter {
    <<subject>>
    -_observers: list
    +attach(observer)
    +detach(observer)
    +notify(event, uow) list~Command~
  }
  class VotingObserver {
    <<interface>>
    +update(event, uow) list~Command~
  }
  class InterestedMemberNotifier {
    +update() bildirim yazar
  }
  class ExpertAgentNotifier {
    -factory: ExpertAgentFactory
    +update() CastVote komutları
  }
  class ExpertAgent {
    +user: User
    +model: ExpertModel
    +review(proposal, ontology, topic, proposer) AgentVerdict
  }
  class ExpertAgentFactory {
    <<factory>>
    +create(user) ExpertAgent
  }
  class ExpertModelRegistry {
    <<registry>>
    +register(prefix, factory, default)
    +create(key) ExpertModel
  }
  class ExpertModel {
    <<interface>>
    +label: str
    +assess(request) Assessment
  }
  class RuleBasedExpertModel
  class OllamaExpertModel {
    <<adapter>>
    -url: str
    +assess() POST /api/generate
    +parse(text)$ Assessment
  }
  class FallbackExpertModel {
    -primary: ExpertModel
    -fallback: ExpertModel
  }
  VotingNotificationCenter o--> "0..*" VotingObserver
  VotingObserver <|.. InterestedMemberNotifier
  VotingObserver <|.. ExpertAgentNotifier
  ExpertAgentNotifier --> ExpertAgentFactory
  ExpertAgentFactory --> ExpertModelRegistry
  ExpertAgentFactory ..> ExpertAgent : üretir
  ExpertAgent --> ExpertModel
  ExpertModel <|.. RuleBasedExpertModel
  ExpertModel <|.. OllamaExpertModel
  ExpertModel <|.. FallbackExpertModel
  FallbackExpertModel o--> ExpertModel
```

## Repository, Unit of Work ve Message Bus

*Sınıf diyagramı.* Her soyut repository'nin SQLAlchemy ve Fake uygulaması vardır. Hiçbir repository silme metodu sunmaz.

```mermaid
classDiagram
  direction LR
  class AbstractRepository~T~ {
    <<abstract>>
    +seen: set~T~
    +add(aggregate)
    +get(id) T
    #_add(aggregate)*
    #_get(id)*
    +flush()
  }
  class AbstractTopicRepository {
    <<abstract>>
    +get_node(id) TopicComponent
    +roots()* list~Topic~
  }
  class AbstractProposalRepository {
    <<abstract>>
    +list()* list~Proposal~
    +list_open() list~Proposal~
  }
  class AbstractLedgerRepository {
    <<abstract>>
    +append(entry)*
    +head()* LedgerEntry
    +all()* list
  }
  class SqlAlchemyTopicRepository
  class SqlAlchemyProposalRepository
  class SqlAlchemyLedgerRepository
  class FakeTopicRepository
  class FakeProposalRepository
  class FakeLedgerRepository
  class AbstractUnitOfWork {
    <<abstract>>
    +__enter__() Self
    +__exit__()
    +commit()
    +rollback()*
    +collect_new_events() Iterator~Event~
  }
  class SqlAlchemyUnitOfWork {
    +cache: AppendOnlyReadCache
  }
  class AppendOnlyReadCache {
    +electorates: dict
    +ballots: dict
  }
  class FakeUnitOfWork
  class MessageBus {
    +event_handlers: dict
    +command_handlers: dict
    +handle(message) Any
  }
  class Command {
    <<frozen dataclass>>
    +actor_id: str
  }
  class Event {
    <<frozen dataclass>>
    +ledger_payload() dict
  }
  AbstractRepository <|-- AbstractTopicRepository
  AbstractRepository <|-- AbstractProposalRepository
  AbstractTopicRepository <|-- SqlAlchemyTopicRepository
  AbstractTopicRepository <|-- FakeTopicRepository
  AbstractProposalRepository <|-- SqlAlchemyProposalRepository
  AbstractProposalRepository <|-- FakeProposalRepository
  AbstractLedgerRepository <|-- SqlAlchemyLedgerRepository
  AbstractLedgerRepository <|-- FakeLedgerRepository
  AbstractUnitOfWork <|-- SqlAlchemyUnitOfWork
  AbstractUnitOfWork <|-- FakeUnitOfWork
  AbstractUnitOfWork o-- AbstractTopicRepository
  AbstractUnitOfWork o-- AbstractProposalRepository
  AbstractUnitOfWork o-- AbstractLedgerRepository
  MessageBus --> AbstractUnitOfWork
  MessageBus ..> Command : tek işleyici
  MessageBus ..> Event : çok işleyici
  SqlAlchemyUnitOfWork o-- AppendOnlyReadCache : bootstrap enjekte eder
  SqlAlchemyProposalRepository ..> AppendOnlyReadCache : değişmez kayıtlar
```

## Dağıtık defter

*Sınıf diyagramı.* Hash zinciri, düğüm kopyaları ve çoğunluk uzlaşması.

```mermaid
classDiagram
  direction LR
  class LedgerEntry {
    <<frozen dataclass>>
    +index: int
    +timestamp: str
    +kind: str
    +payload: str
    +previous_hash: str
    +hash: str
    +compute_hash(...)$ str
    +next_after(previous, kind, payload, now)$ LedgerEntry
    +is_intact() bool
  }
  class VerificationReport {
    <<value object>>
    +valid: bool
    +length: int
    +head_hash: str
    +broken_index: int
  }
  class ConsensusReport {
    <<value object>>
    +head_hash: str
    +nodes: tuple~NodeStatus~
    +healthy: bool
  }
  class LedgerFunctions {
    <<module>>
    +verify_chain(entries)$ VerificationReport
    +reach_consensus(reports)$ ConsensusReport
  }
  class LedgerReplica {
    <<interface>>
    +append(entry)
    +entries() list
    +sync(entries)
  }
  class JsonLinesLedgerNode
  class InMemoryLedgerNode
  class AbstractLedgerRepository {
    <<abstract>>
    +append(entry)
    +all() list
  }
  class record_in_ledger {
    <<event handler>>
  }
  LedgerEntry --> LedgerEntry : previous_hash
  LedgerFunctions ..> VerificationReport
  LedgerFunctions ..> ConsensusReport
  LedgerReplica <|.. JsonLinesLedgerNode
  LedgerReplica <|.. InMemoryLedgerNode
  record_in_ledger --> AbstractLedgerRepository : ana defter
  record_in_ledger --> LedgerReplica : çoğaltır (A, B, C)
```

## Konu önerisi

*Sıralama diyagramı.* Komut → Proxy → Message Bus → işleyici → olaylar → defter → Observer → YZ ajanının oyu.

```mermaid
sequenceDiagram
  autonumber
  actor Uye as Üye
  participant Web as WebApp (entrypoint)
  participant Proxy as AuthorizationProxy
  participant Bus as MessageBus
  participant H as propose_topic
  participant UoW as UnitOfWork
  participant T as Topic
  participant P as Proposal
  participant L as record_in_ledger
  participant C as VotingNotificationCenter
  participant A as ExpertAgentNotifier
  participant M as ExpertModel (Adapter)

  Uye->>Web: POST /yeni-konu
  Web->>Proxy: dispatch(ProposeTopic)
  Proxy->>UoW: rol ve oturum denetimi
  Proxy->>Bus: dispatch (gerçek nesne)
  Bus->>H: handle(ProposeTopic)
  H->>UoW: with uow
  H->>H: içerik zinciri (boş metin, tehdit)
  H->>T: Topic.propose() [Önerildi]
  H->>T: start_voting() [Oylamada]
  H->>P: Proposal.open(regulation) strateji ve eşik alır
  H->>UoW: users.list() + ontoloji
  H->>P: freeze_electorate(build_electorate(...)) seçmen kütüğü dondurulur
  H->>UoW: commit() (teklif + kütük satırları)
  Bus->>UoW: collect_new_events()
  UoW-->>Bus: TopicProposed, TopicStateChanged, ProposalOpened, VotingStarted
  loop her olay
    Bus->>L: hash zincirine ekle, düğümlere çoğalt
  end
  Bus->>C: VotingStarted
  C->>C: InterestedMemberNotifier.update() kütükteki üyelere toplu bildirim
  C->>A: update(event)
  A->>M: assess(AssessmentRequest)
  M-->>A: Assessment(onay, gerekçe)
  A-->>Bus: [CastVote(ajan)]
  Bus->>Bus: CastVote kuyruğa (bkz. oy verme)
  Bus-->>Web: topic_id
  Web-->>Uye: 303 /konu/{id}
```

## Oy verme ve sonuçlanma

*Sıralama diyagramı.* Yetki zinciri, strateji, erken karar ve kabul edilen teklifin etkisi.

```mermaid
sequenceDiagram
  autonumber
  actor S as Seçmen
  participant Web as WebApp
  participant Proxy as AuthorizationProxy
  participant H as cast_vote
  participant Ch as Yetki zinciri
  participant St as VotingStrategy
  participant P as Proposal
  participant E as apply_accepted_proposal
  participant T as Topic

  S->>Web: POST /teklif/{id}/oy (seçim, yoğunluk)
  Web->>Proxy: dispatch(CastVote)
  Proxy->>H: (yetkili)
  H->>P: uow.proposals.get(id) (oylar + dondurulmuş kütük, önbellekten)
  H->>St: create_strategy(proposal.strategy_name)
  H->>Ch: handle(ctx)
  Ch->>Ch: Kimlik → Oylama açık → Rol → Yönetmelik
  Ch->>Ch: Ontolojik ilgi (dondurulmuş kütükte mi?) → Tek oy → Pusula kuralı
  Ch-->>H: EligibilityDecision(allowed, trail)
  alt izin yok
    H-->>Web: NotEligible(gerekçe)
  else izin var
    H->>P: cast(ballot, decision)
    H->>P: try_close(strategy, proposal.electorate, regulation, now)
    P->>St: weight() / max_weight()
    P->>P: decide(tally, eşik, yeter sayı)
    opt sonuç kesinleşti
      P-->>H: ProposalAccepted
      H->>E: (Message Bus üzerinden)
      E->>T: accept() [Oylamada → Aktif]
      E->>E: önerenin itibarı +10
    end
  end
```

## Mesaj gizleme (karesel oylama)

*Sıralama diyagramı.* Mesaj silinmez, maskelenir; içerik özeti defterde kalır.

```mermaid
sequenceDiagram
  autonumber
  actor U as Üye
  participant Bus as MessageBus
  participant H as propose_message_hiding
  participant P as Proposal (karesel, 3/5)
  participant V as cast_vote
  participant E as apply_accepted_proposal
  participant Msg as Message (yaprak)
  participant L as Defter

  U->>Bus: ProposeMessageHiding(mesaj, gerekçe)
  Bus->>H: handle
  H->>P: Proposal.open(HIDE_MESSAGE)
  Bus->>L: ProposalOpened, VotingStarted
  loop seçmenler
    U->>Bus: CastVote(evet/hayır, k oy = k² kredi)
    Bus->>V: handle
    V->>P: cast + try_close
  end
  P-->>Bus: ProposalAccepted
  Bus->>E: handle
  E->>Msg: apply_mask(proposal_id) — metin silinmez
  Msg-->>Bus: ContentMasked
  Bus->>L: ContentMasked (özet zincirde kalır)
  Bus->>Bus: penalize_masked_message → yazarın itibarı −5
```

## Profil görüntüleme (PII koruması)

*Sıralama diyagramı.* Protection Proxy, hesap sahibi olmayanlara yalnızca takma adlı profil verir.

```mermaid
sequenceDiagram
  autonumber
  actor Z as Ziyaretçi
  participant Web as WebApp
  participant PX as ProfileAccessProxy
  participant R as RepositoryProfileReader
  participant U as User

  Z->>Web: GET /profil/ayse_hukuk
  Web->>PX: profile("ayse_hukuk", viewer_id)
  PX->>R: profile(...)
  R->>U: private_profile()
  U-->>R: PrivateProfile (PII dahil)
  R-->>PX: PrivateProfile
  alt viewer_id == sahibi
    PX-->>Web: PrivateProfile
  else başkası ya da anonim
    PX-->>Web: PublicProfile (yalnızca takma ad, rol, itibar)
  end
  Web-->>Z: HTML
```

## Defter kaydı, çoğaltma ve doğrulama

*Sıralama diyagramı.* Her olay zincire eklenir, üç düğüme çoğaltılır; uzlaşma raporu kurcalanan düğümü bulur.

```mermaid
sequenceDiagram
  autonumber
  participant Bus as MessageBus
  participant L as record_in_ledger
  participant R as LedgerRepository (SQLite)
  participant A as Düğüm A
  participant B as Düğüm B
  participant C as Düğüm C
  actor D as Denetçi
  participant V as views.ledger_view

  Bus->>L: her olay
  L->>R: head()
  L->>L: LedgerEntry.next_after(önceki, tür, veri)
  L->>R: append(entry) (UPDATE/DELETE tetikleyiciyle yasak)
  par çoğaltma
    L->>A: append(entry)
    L->>B: append(entry)
    L->>C: append(entry)
  end
  D->>V: GET /defter
  V->>R: all() → verify_chain()
  V->>A: entries() → verify_chain()
  V->>B: entries() → verify_chain()
  V->>C: entries() → verify_chain()
  V->>V: reach_consensus(raporlar)
  V-->>D: Uzlaşma raporu (kurcalanan düğüm kırmızı)
```
