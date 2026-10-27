"""Kural tabanlı uzman modeli: internetsiz, ücretsiz ve açıklanabilir.

Dersin "önce kural" ilkesi: bir dil modeli bu kuralı ancak ölçülebilir biçimde geçerse anlamlıdır.
Ayrıca yerel dil modeli çalışmadığında yedek (fallback) olarak devreye girer, böylece ajan hiç susmaz.
"""

from __future__ import annotations

from kurultay.service_layer.ports import Assessment, AssessmentRequest

# Gizlemeyi desteklediği tek durum reklam/spam: bir görüş değil, satış ilanıdır. Hakaret ve sert görüş gizlenmez.
_SPAM = ("indirim", "kampanya", "sipariş", "kapıda ödeme", "ücretsiz kargo", "fırsat", "http://", "https://", "www.")


class RuleBasedExpertModel:
    label = "kural tabanlı model"

    def assess(self, request: AssessmentRequest) -> Assessment:
        approve, why = self._decide(request)
        return Assessment(approve, why, self.label)

    def _decide(self, r: AssessmentRequest) -> tuple[bool, str]:
        if r.contains_threat:
            return False, "Metinde tehdit ifadesi var; tehdit Kurultay'daki tek sınırdır."
        kind = r.proposal_kind
        if kind in ("yeni_konu", "alt_konu"):
            if r.relevance >= 25:
                return True, f"Konu seçilen kavramlarla örtüşüyor (uygunluk %{r.relevance}); tartışmaya değer."
            return False, "Konu seçilen kavramlarla belirgin biçimde örtüşmüyor; başka bir kavram altında açılmalı."
        if kind == "duzenleme":
            return (r.relevance >= 25,
                    "Düzenleme konunun kapsamını koruyor." if r.relevance >= 25 else "Düzenleme konunun kapsamından uzaklaşıyor.")
        if kind == "konu_silme":
            if r.discussion_size >= 3:
                return False, f"Konuda {r.discussion_size} görünür mesaj var; tartışmayı gizlemek yerine sürdürmek daha doğru."
            return r.relevance < 25, "Konu hem boş hem kapsam dışı." if r.relevance < 25 else "Konu kapsam içinde; gizlemek gerekmiyor."
        if kind == "mesaj_gizleme":
            lowered = r.text.lower()
            if sum(word in lowered for word in _SPAM) >= 2:
                return True, "Mesaj bir görüş değil, reklam; gizlenmesi tartışmayı korur."
            return False, "Mesaj sert olabilir ama tehdit değil; Kurultay'da görüş gizlenmez."
        if kind == "uzlasma":
            if r.discussion_size >= 3:
                return True, "Tartışma yeterince olgunlaştı; uzlaşma metni öne çıkan görüşleri topluyor."
            return False, "Tartışma henüz çok kısa; uzlaşma için erken."
        if kind == "yonetmelik" and r.regulation_change:
            key, value = r.regulation_change
            if key.startswith("esik_") and value == "1/2":
                return False, "Eşiği salt çoğunluğa indirmek azınlık korumasını zayıflatır."
            if key == "quorum_percent" and int(value) < 20:
                return False, "Yeter sayıyı bu kadar düşürmek küçük bir grubun karar vermesine yol açar."
            if key == "agent_weight_percent" and int(value) > 50:
                return False, "YZ ajanlarının oyu insan oyunu geçmemeli; ağırlık en fazla %50 kalmalı."
            return True, "Değişiklik azınlık korumasını zayıflatmıyor."
        if kind == "uzmanlik":
            if r.proposer_reputation >= 20:
                return True, f"Önerenin katkı geçmişi (itibar {r.proposer_reputation}) beyanını destekliyor."
            return False, f"İtibar ({r.proposer_reputation}) henüz uzmanlık için yeterli bir katkı geçmişi göstermiyor."
        return True, "Teklifte ilkelerle çelişen bir şey görülmedi."
