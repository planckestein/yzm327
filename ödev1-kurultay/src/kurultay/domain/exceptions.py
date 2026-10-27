"""Alan katmanının istisnaları.

Her istisna bir iş kuralının ihlalini anlatır; mesajları doğrudan kullanıcıya gösterilebilecek Türkçedir.
"""


class DomainError(Exception):
    """Bütün alan hatalarının atası."""


class InvalidValue(DomainError):
    """Bir değer nesnesi (value object) geçersiz veriyle kurulmaya çalışıldı."""


class InvalidTransition(DomainError):
    """State deseni: bulunulan durumda izin verilmeyen bir geçiş istendi."""


class NotEligible(DomainError):
    """Chain of Responsibility: kullanıcı bu oylamada oy kullanamaz."""


class ProposalClosed(DomainError):
    """Kapanmış bir teklif üzerinde işlem yapılmaya çalışıldı."""


class ContentRejected(DomainError):
    """İçerik denetim zinciri metni kabul etmedi (yalnızca gerçek tehdit ve boş metin)."""


class AccessDenied(DomainError):
    """Protection Proxy: kullanıcının bu işleme yetkisi yok."""


class NotFound(DomainError):
    """İstenen kayıt bulunamadı."""
