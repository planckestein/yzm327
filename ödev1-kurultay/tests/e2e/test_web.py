"""Uçtan uca: FastAPI arayüzü, gerçek SQLite dosyası ve gerçek bağımlılıklarla."""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from kurultay.entrypoints.web.app import create_app


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(tmp_path / "veri", demo_mode=True))


def register(client: TestClient, nickname: str, interests: list[str], first: str = "Gizli", last: str = "Kisi") -> None:
    client.cookies.clear()
    response = client.post(
        "/kayit",
        data={"ad": first, "soyad": last, "dogum_tarihi": "1990-04-04", "takma_ad": nickname, "adres": "Gizli Sokak 7",
              "sifre": "sifre1234", "ilgi": interests},
        follow_redirects=False,
    )
    assert response.status_code == 303


def test_pages_render(client: TestClient) -> None:
    for path in ("/", "/teklifler", "/ontoloji", "/defter", "/yonetmelik", "/uyeler", "/mimari", "/giris", "/kayit", "/yeni-konu"):
        assert client.get(path).status_code == 200, path
    assert client.get("/konu/yok").status_code == 404


def test_full_flow_through_the_web(client: TestClient) -> None:
    register(client, "ikinci", ["ekonomi"])
    register(client, "ucuncu", ["ekonomi"])
    register(client, "kurucu", ["ekonomi"], first="Zehra", last="Gizlisoyad")

    response = client.post("/yeni-konu", data={"baslik": "Vergi adaleti", "aciklama": "KDV ve bütçe", "kavram": ["vergi"]},
                           follow_redirects=False)
    assert response.status_code == 303 and response.headers["location"].startswith("/konu/")
    topic_url = response.headers["location"]
    page = client.get(topic_url).text
    assert "Vergi adaleti" in page and "Oylamada" in page

    proposal_id = re.search(r'href="/teklif/(\w+)"', page).group(1)  # type: ignore[union-attr]
    assert "Kimlik" in client.get(f"/teklif/{proposal_id}").text
    client.post(f"/teklif/{proposal_id}/oy", data={"secim": "evet", "yogunluk": "1"})
    for nick in ("ikinci", "ucuncu"):
        client.cookies.clear()
        client.post("/giris", data={"takma_ad": nick, "sifre": "sifre1234"})
        client.post(f"/teklif/{proposal_id}/oy", data={"secim": "evet", "yogunluk": "1"})
    assert "Tartışmaya açık" in client.get(topic_url).text

    client.post(f"{topic_url}/mesaj", data={"metin": "Dolaylı vergiler adaletsiz."})
    assert "Dolaylı vergiler adaletsiz." in client.get(topic_url).text

    ledger = client.get("/defter").text
    assert "Bütün düğümler aynı zinciri taşıyor" in ledger
    assert "Gizlisoyad" not in client.get("/defter/indir").text


def test_pii_is_visible_only_to_its_owner(client: TestClient) -> None:
    register(client, "baska_biri", ["ekonomi"], first="Ali", last="Baskasoyad")
    register(client, "sahibi", ["ekonomi"], first="Elif", last="Ozelsoyad")
    assert "Ozelsoyad" in client.get("/profil/sahibi").text  # kendisi görür
    client.cookies.clear()
    client.post("/giris", data={"takma_ad": "baska_biri", "sifre": "sifre1234"})
    assert "Ozelsoyad" not in client.get("/profil/sahibi").text
    assert "Ozelsoyad" not in client.get("/uyeler").text
    client.cookies.clear()
    assert "Ozelsoyad" not in client.get("/profil/sahibi").text


def test_threat_is_rejected_with_a_message(client: TestClient) -> None:
    register(client, "yazar", ["ekonomi"])
    response = client.post("/yeni-konu", data={"baslik": "Seni bulacağım", "aciklama": "", "kavram": ["vergi"]})
    assert "tehdit" in response.text


def test_anonymous_cannot_propose(client: TestClient) -> None:
    response = client.post("/yeni-konu", data={"baslik": "Başlık", "aciklama": "", "kavram": ["vergi"]})
    assert "giriş yapmalısın" in response.text


def test_ledger_tamper_demo_is_detected_and_repaired(client: TestClient) -> None:
    register(client, "a_kisi", ["ekonomi"])
    register(client, "b_kisi", ["ekonomi"])
    client.post("/defter/kurcala")
    assert "kurcalanmış" in client.get("/defter").text
    client.post("/defter/onar")
    assert "Bütün düğümler aynı zinciri taşıyor" in client.get("/defter").text


def test_forum_search_and_category_filter(client: TestClient) -> None:  # type: ignore[no-redef]
    page = client.get("/?q=zzz_yok")
    assert page.status_code == 200 and "Aramana uyan konu yok" in page.text
    assert client.get("/?kavram=ekonomi").status_code == 200
    assert client.get("/?kavram=olmayan").status_code == 200
