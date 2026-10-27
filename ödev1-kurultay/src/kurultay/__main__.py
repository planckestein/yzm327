"""``python -m kurultay`` — demo verisi yoksa hazırlar, sunucuyu açar ve tarayıcıyı başlatır."""

from __future__ import annotations

import os
import threading
import webbrowser
from pathlib import Path


def _schema_version(database: Path) -> int:
    """Veritabanı eski bir sürümle kurulduysa (şema değiştiyse) demo verisi yeniden kurulur."""
    import sqlite3

    with sqlite3.connect(database) as conn:
        return int(conn.execute("PRAGMA user_version").fetchone()[0])


def main() -> None:
    import uvicorn

    from kurultay.adapters import veri_klasoru
    from kurultay.adapters.orm import SCHEMA_VERSION
    from kurultay.entrypoints.demo import build_demo
    from kurultay.entrypoints.web.app import PROJECT_ROOT, create_app

    data_dir = Path(os.environ.get("KURULTAY_VERI", PROJECT_ROOT / "veri"))
    database = veri_klasoru.etkin(data_dir) / "kurultay.db"
    if not database.exists() or os.environ.get("KURULTAY_DEMO_YENILE") == "1" or _schema_version(database) < SCHEMA_VERSION:
        build_demo(data_dir)
    port = int(os.environ.get("KURULTAY_PORT", "8000"))
    url = f"http://127.0.0.1:{port}"
    if os.environ.get("KURULTAY_TARAYICI", "1") == "1":
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    print(f"Sunucu başlatılıyor: {url}")
    uvicorn.run(create_app(data_dir), host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    main()
