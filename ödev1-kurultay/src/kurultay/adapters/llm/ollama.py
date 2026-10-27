"""Adapter: Ollama'nın HTTP arayüzünü (``POST /api/generate``) ``ExpertModel`` arayüzüne uyarlar.

Ollama bilgisayarda yerel çalışan ücretsiz bir dil modeli sunucusudur (https://ollama.com). Kurulu değilse ya da
yanıt vermezse ``FallbackExpertModel`` kural tabanlı modele düşer; uygulama hiçbir ücretli servise bağlı değildir.
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request

from kurultay.service_layer.ports import Assessment, AssessmentRequest, ExpertModel


class ModelUnavailable(Exception):
    pass


class OllamaExpertModel:
    def __init__(self, model: str = "llama3.2", url: str | None = None, timeout: float = 20.0) -> None:
        self.model = model or "llama3.2"
        self.url = (url or os.environ.get("OLLAMA_URL", "http://localhost:11434")).rstrip("/")
        self.timeout = timeout
        self.label = f"yerel dil modeli: {self.model}"

    def assess(self, request: AssessmentRequest) -> Assessment:
        body = json.dumps({"model": self.model, "prompt": request.prompt, "stream": False}).encode()
        http_request = urllib.request.Request(
            f"{self.url}/api/generate", data=body, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(http_request, timeout=self.timeout) as response:
                text = json.loads(response.read().decode()).get("response", "")
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            raise ModelUnavailable(str(exc)) from exc
        return self.parse(text, self.label)

    @staticmethod
    def parse(text: str, label: str) -> Assessment:
        decision = re.search(r"KARAR\s*:\s*(EVET|HAYIR)", text, re.IGNORECASE)
        if decision is None:
            raise ModelUnavailable("Model yanıtında KARAR satırı yok.")
        reason = re.search(r"GEREK[CÇ]E\s*:\s*(.+)", text, re.IGNORECASE)
        rationale = reason.group(1).strip() if reason else "Gerekçe belirtilmedi."
        return Assessment(decision.group(1).upper() == "EVET", rationale[:300], label)


class FallbackExpertModel:
    """Asıl model başarısız olursa yedeğe düşer (Cascade). Dışarıdan tek bir ``ExpertModel`` gibi görünür."""

    def __init__(self, primary: ExpertModel, fallback: ExpertModel) -> None:
        self.primary = primary
        self.fallback = fallback
        self.label = f"{primary.label} → {fallback.label}"

    def assess(self, request: AssessmentRequest) -> Assessment:
        try:
            return self.primary.assess(request)
        except ModelUnavailable:
            result = self.fallback.assess(request)
            return Assessment(result.approve, result.rationale, f"{result.model_label}; yerel model kapalıydı")
