"""Çalışma verisinin yeri.

Demo verisi her kuruluşta ``veri/`` altında yeni bir alt klasöre yazılır ve ``veri/etkin.txt`` o klasörü gösterir.
Böylece eski veritabanı dosyasını silmek gerekmez: Windows'ta açık kalmış bir dosya (eski bir süreç, virüs taraması,
eşitleme programı) yeni kurulumu engelleyemez. Eski klasörler, kilitli değillerse sonradan temizlenir.
"""

from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path

POINTER = "etkin.txt"


def etkin(kok: Path) -> Path:
    """Kullanılacak veri klasörü: işaretçi varsa onun gösterdiği alt klasör, yoksa kökün kendisi."""
    pointer = kok / POINTER
    if pointer.exists():
        name = pointer.read_text(encoding="utf-8").strip()
        if name and (kok / name / "kurultay.db").exists():
            return kok / name
    return kok


def yeni(kok: Path) -> Path:
    """Yeni bir demo kurulumu için boş alt klasör."""
    kok.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    path, n = kok / f"demo-{stamp}", 1
    while path.exists():
        n += 1
        path = kok / f"demo-{stamp}-{n}"
    path.mkdir()
    return path


def etkinlestir(kok: Path, klasor: Path) -> None:
    """İşaretçiyi yeni klasöre çevirir ve eski demo klasörlerini (silinebilenleri) temizler."""
    (kok / POINTER).write_text(klasor.name, encoding="utf-8")
    for eski in kok.glob("demo-*"):
        if eski.is_dir() and eski != klasor:
            shutil.rmtree(eski, ignore_errors=True)
    for name in ("kurultay.db", "kurultay.db-wal", "kurultay.db-shm"):  # ilk sürümlerin doğrudan köke yazdığı dosyalar
        try:
            (kok / name).unlink(missing_ok=True)
        except OSError:
            pass  # kilitliyse kalır; artık kullanılmıyor
    shutil.rmtree(kok / "defter-dugumleri", ignore_errors=True)
