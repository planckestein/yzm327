"""Ölçümü çalıştırır: ``python -m kurultay.evaluation``

Tablolar ekrana yazılır ve ``docs/olcum.json`` dosyasına kaydedilir (rapor ve web sayfası bu dosyayı okur).
"""

from __future__ import annotations

import json
from pathlib import Path

from kurultay.entrypoints.demo_konular import KONULAR
from kurultay.evaluation.baselines import section_ladder, threat_ladder
from kurultay.evaluation.threat_set import THREAT_SET
from kurultay.reference_data import build_ontology


def run() -> dict[str, object]:
    rows, misses = threat_ladder()
    ontology = build_ontology()
    items = [(f"{k.baslik} {k.metin}", k.kavramlar[0]) for k in KONULAR if k.kavramlar]
    sections = section_ladder(ontology, items)
    return {
        "tehdit": {
            "ornek": len(THREAT_SET),
            "tehdit": sum(label for _, label in THREAT_SET),
            "satirlar": [
                {
                    "yontem": r.method, "aciklama": r.description,
                    "dp": r.result.tp, "yp": r.result.fp, "yn": r.result.fn, "dn": r.result.tn,
                    "dogruluk": r.result.accuracy, "kesinlik": r.result.precision,
                    "duyarlilik": r.result.recall, "f1": r.result.f1, "f05": r.result.f05,
                    "maliyet": r.result.cost(),
                }
                for r in rows
            ],
            "hatalar": [{"metin": m.text, "tur": m.kind} for m in misses],
        },
        "ontoloji": {
            "ornek": len(items),
            "sinif": len({ontology.ancestors(c)[0].id for _, c in items}),
            "satirlar": [
                {"yontem": s.method, "aciklama": s.description, "dogruluk": s.accuracy, "makro_f1": s.macro_f1}
                for s in sections
            ],
        },
    }


def main() -> None:
    report = run()
    threat = report["tehdit"]
    assert isinstance(threat, dict)
    print(f"Tehdit kuralı: {threat['ornek']} etiketli cümle ({threat['tehdit']} tehdit)\n")
    print(f"{'Yöntem':<22}{'DP':>4}{'YP':>4}{'YN':>4}{'DN':>4}{'Kesinlik':>10}{'Duyarlılık':>12}{'F1':>7}{'F0.5':>7}")
    for r in threat["satirlar"]:
        print(
            f"{r['yontem']:<22}{r['dp']:>4}{r['yp']:>4}{r['yn']:>4}{r['dn']:>4}"
            f"{r['kesinlik']:>10.2f}{r['duyarlilik']:>12.2f}{r['f1']:>7.2f}{r['f05']:>7.2f}"
        )
    print("\nBizim kuralın hataları:")
    for h in threat["hatalar"]:
        print(f"  [{h['tur']}] {h['metin']}")
    onto = report["ontoloji"]
    assert isinstance(onto, dict)
    print(f"\nKonu → ana bölüm: {onto['ornek']} konu, {onto['sinif']} sınıf\n")
    for s in onto["satirlar"]:
        print(f"{s['yontem']:<22} doğruluk {s['dogruluk']:.2f}   makro F1 {s['makro_f1']:.2f}")
    out = Path(__file__).resolve().parents[3] / "docs" / "olcum.json"
    if out.parent.is_dir():
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n→ {out}")


if __name__ == "__main__":
    main()
