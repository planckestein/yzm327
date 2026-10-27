"""Güvenlik adaptörleri: şifre özetleme ve oturum çerezi imzalama (yalnızca standart kütüphane, ücretsiz)."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from pathlib import Path


class Pbkdf2PasswordHasher:
    """PBKDF2-HMAC-SHA256, kullanıcı başına rastgele tuz. ``PasswordHasher`` portunu uygular."""

    def __init__(self, iterations: int = 200_000) -> None:
        self.iterations = iterations

    def hash(self, password: str) -> str:
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), self.iterations).hex()
        return f"pbkdf2${self.iterations}${salt}${digest}"

    def verify(self, password: str, hashed: str) -> bool:
        try:
            _, iterations, salt, digest = hashed.split("$")
        except ValueError:
            return False
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations)).hex()
        return hmac.compare_digest(candidate, digest)


class SessionSigner:
    """Oturum çerezi: ``kullanıcı_id.imza``. İmza HMAC-SHA256; anahtar yerel dosyada saklanır."""

    def __init__(self, secret: bytes) -> None:
        self.secret = secret

    @classmethod
    def from_file(cls, path: Path) -> SessionSigner:
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(secrets.token_bytes(32))
        return cls(path.read_bytes())

    def sign(self, user_id: str) -> str:
        signature = hmac.new(self.secret, user_id.encode(), hashlib.sha256).hexdigest()[:32]
        return f"{user_id}.{signature}"

    def unsign(self, token: str | None) -> str | None:
        if not token or "." not in token:
            return None
        user_id, signature = token.rsplit(".", 1)
        return user_id if hmac.compare_digest(self.sign(user_id), f"{user_id}.{signature}") else None
