"""Canlı meclis gösterimi: demo hesapları gerçek komutlarla oy verir, sonucu alan modeli belirler."""

from __future__ import annotations

import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from kurultay.entrypoints.demo import build_demo
from kurultay.entrypoints.live_demo import LiveDemo
from kurultay.entrypoints.web.app import create_app


@pytest.fixture(scope="module")
def client(tmp_path_factory: pytest.TempPathFactory) -> TestClient:
    data = tmp_path_factory.mktemp("veri")
    build_demo(data, uye_sayisi=700, ilerleme=lambda _: None)
    web = create_app(data, demo_mode=True)
    web.state.live.delay = 0
    return TestClient(web)


def run(client: TestClient, scenario: str) -> dict:  # type: ignore[type-arg]
    live: LiveDemo = client.app.state.live  # type: ignore[attr-defined]
    response = client.post("/canli/baslat", data={"senaryo": scenario}, follow_redirects=False)
    assert response.status_code == 303 and "teklif=" in response.headers["location"]
    for _ in range(400):
        if live.session is not None and not live.session.running:
            break
        time.sleep(0.05)
    assert live.session is not None and not live.session.error
    data = client.get(f"/api/canli/{live.session.proposal_id}").json()
    assert data["session"]["log"], "Message Bus günlüğü boş olmamalı"
    return data


def test_new_topic_is_accepted_and_becomes_active(client: TestClient) -> None:
    data = run(client, "konu")
    assert data["proposal"]["status"] == "kabul"
    assert data["proposal"]["topic_state"] == "Tartışmaya açık"
    assert any(seat["agent"] for seat in data["seats"])
    assert len(data["seats"]) >= 30


def test_quadratic_voting_protects_an_intense_minority(client: TestClient) -> None:
    data = run(client, "karesel")
    tally = data["tally"]
    assert data["proposal"]["status"] == "red"
    assert tally["yes_heads"] > tally["no_heads"]  # kişi sayısında çoğunluk evet dedi…
    assert tally["no"] > tally["yes"]  # …ama ağırlıkta azınlık kazandı


def test_regulation_change_creates_a_new_version(client: TestClient) -> None:
    data = run(client, "yonetmelik")
    assert data["proposal"]["status"] == "kabul"
    assert "Sürüm 2" in client.get("/yonetmelik").text


def test_pages_for_presentation_render(client: TestClient) -> None:
    assert "Hocanın şartı" in client.get("/tanitim").text
    assert 'id="meclis"' in client.get("/canli").text
