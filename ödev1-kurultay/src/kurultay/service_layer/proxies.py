"""Protection Proxy: erişim kontrolü, gerçek nesneyle aynı arayüzü sunan bir vekilde yapılır.

1. ``AuthorizationProxy`` — ``CommandGateway`` arayüzünü uygular. Arayüzden gelen her komut önce buradan
   geçer: oturum var mı, rolün bu komuta izni var mı? İzin varsa gerçek nesneye (``MessageBusGateway``)
   iletir. Böylece Message Bus ve işleyiciler yetki kodu taşımaz (Tek Sorumluluk).

2. ``ProfileAccessProxy`` — ``ProfileReader`` arayüzünü uygular. Gerçek okuyucu (``RepositoryProfileReader``)
   kişisel verileri de içeren tam profili döndürür; vekil, bakan kişi hesabın sahibi değilse yalnızca
   takma adlı herkese açık profili geçirir. Kişisel veriler (PII) bu kapıdan dışarı sızamaz.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, Protocol

from kurultay.domain import commands
from kurultay.domain.exceptions import AccessDenied, NotFound
from kurultay.domain.user import PublicProfile, Role
from kurultay.service_layer.messagebus import MessageBus
from kurultay.service_layer.unit_of_work import AbstractUnitOfWork

# ---------------------------------------------------------------- komut kapısı


class CommandGateway(Protocol):
    def dispatch(self, command: commands.Command) -> Any: ...


class MessageBusGateway:
    """Gerçek nesne (real subject): komutu doğrudan Message Bus'a verir."""

    def __init__(self, bus: MessageBus) -> None:
        self.bus = bus

    def dispatch(self, command: commands.Command) -> Any:
        return self.bus.handle(command)


HUMANS = frozenset({Role.MEMBER, Role.EXPERT})
EVERYONE = frozenset(Role)

# Hangi rol hangi komutu gönderebilir. YZ ajanları yalnızca oy kullanır ve tartışmaya yazar;
# teklif açamaz, yönetmeliği değiştirmeye kalkamaz.
COMMAND_PERMISSIONS: dict[type[commands.Command], frozenset[Role]] = {
    commands.SetInterest: HUMANS,
    commands.ProposeTopic: HUMANS,
    commands.PostMessage: EVERYONE,
    commands.ProposeTopicEdit: HUMANS,
    commands.ProposeTopicDeletion: HUMANS,
    commands.ProposeMessageHiding: HUMANS,
    commands.ProposeConsensus: HUMANS,
    commands.ProposeRegulationChange: HUMANS,
    commands.ProposeExpertise: HUMANS,
    commands.CastVote: EVERYONE,
    commands.MarkNotificationsRead: EVERYONE,
}
PUBLIC_COMMANDS: frozenset[type[commands.Command]] = frozenset({commands.RegisterUser, commands.CloseDueProposals})


class AuthorizationProxy:
    """Vekil (proxy): aynı ``dispatch`` arayüzü, önce yetki denetimi."""

    def __init__(self, inner: CommandGateway, uow_factory: Callable[[], AbstractUnitOfWork]) -> None:
        self.inner = inner
        self.uow_factory = uow_factory

    def dispatch(self, command: commands.Command) -> Any:
        self._authorize(command)
        return self.inner.dispatch(command)

    def _authorize(self, command: commands.Command) -> None:
        if type(command) in PUBLIC_COMMANDS:
            if isinstance(command, commands.RegisterUser) and command.role == Role.AI_AGENT.value:
                raise AccessDenied("YZ ajanları arayüzden kaydedilemez; sistem yöneticisi tanımlar.")
            return
        if command.actor_id is None:
            raise AccessDenied("Bu işlem için giriş yapmalısın.")
        with self.uow_factory() as uow:
            actor = uow.users.get(command.actor_id)
        if actor is None:
            raise AccessDenied("Oturum geçersiz; yeniden giriş yap.")
        allowed = COMMAND_PERMISSIONS.get(type(command), frozenset())
        if actor.role not in allowed:
            raise AccessDenied(f"“{actor.role.label}” rolü bu işlemi yapamaz.")


# ---------------------------------------------------------------- profil kapısı


class ProfileReader(Protocol):
    def profile(self, nickname: str, viewer_id: str | None) -> PublicProfile: ...


class RepositoryProfileReader:
    """Gerçek nesne: kişisel verileri de içeren tam profili döndürür. Doğrudan arayüze verilmez."""

    def __init__(self, uow_factory: Callable[[], AbstractUnitOfWork]) -> None:
        self.uow_factory = uow_factory

    def profile(self, nickname: str, viewer_id: str | None) -> PublicProfile:
        with self.uow_factory() as uow:
            user = uow.users.get_by_nickname(nickname)
            if user is None:
                raise NotFound("Üye bulunamadı.")
            return user.private_profile()


class ProfileAccessProxy:
    """Vekil: hesap sahibi değilsen kişisel veriler ayıklanır, yalnızca takma adlı profil döner."""

    def __init__(self, inner: ProfileReader) -> None:
        self.inner = inner

    def profile(self, nickname: str, viewer_id: str | None) -> PublicProfile:
        full = self.inner.profile(nickname, viewer_id)
        if viewer_id is not None and viewer_id == full.user_id:
            return full
        return PublicProfile(
            user_id=full.user_id,
            nickname=full.nickname,
            role=full.role,
            reputation=full.reputation,
            interests=full.interests,
            expertise=full.expertise,
            joined_at=full.joined_at,
            agent_model=full.agent_model,
        )
