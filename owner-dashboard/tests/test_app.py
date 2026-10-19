"""Run from the owner-dashboard folder:  pytest tests"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    import config

    monkeypatch.setattr(config, "DATABASE", str(tmp_path / "test.db"))
    import app as app_module
    import db
    import manage

    manage.main(["add-restaurant", "burgerlab", "Burger Lab", "--password", "secret123", "--whatsapp", "923001234567"])
    app_module.app.config["TESTING"] = True
    with app_module.app.test_client() as c:
        c.db = db
        yield c


def post(client, path, body):
    return client.post(path, data=json.dumps(body), content_type="text/plain")


CATALOG = {"restaurant": "burgerlab", "dishes": [
    {"id": "quadra", "name": "Quadra", "category": "beef"},
    {"id": "doopler", "name": "Doopler", "category": "chicken"},
]}


def login(client):
    return client.post("/login", data={"restaurant": "burgerlab", "password": "secret123"})


def test_events_are_saved_and_validated(client):
    post(client, "/api/catalog", CATALOG)
    r = post(client, "/api/events", {"restaurant": "burgerlab", "session": "abcdefgh1234", "events": [
        {"type": "view", "dish": "quadra", "source": "qr"},
        {"type": "explode", "dish": "quadra"},
        {"type": "time", "dish": "quadra", "value": 42},
        {"type": "hack", "dish": "quadra"},          # unknown type: dropped
        {"type": "view", "dish": "../etc"},          # bad id: dropped
    ]})
    assert r.status_code == 200 and r.get_json()["saved"] == 3
    assert r.headers["Access-Control-Allow-Origin"] == "*"


def test_unknown_restaurant_is_rejected(client):
    r = post(client, "/api/events", {"restaurant": "nope", "session": "abcdefgh1234", "events": []})
    assert r.status_code == 404


def test_dashboard_needs_login(client):
    assert client.get("/dashboard").status_code == 302
    assert client.post("/login", data={"restaurant": "burgerlab", "password": "wrong"}).status_code == 200
    assert login(client).status_code == 302
    assert client.get("/dashboard").status_code == 200


def test_dashboard_counts(client):
    post(client, "/api/catalog", CATALOG)
    for i in range(3):
        post(client, "/api/events", {"restaurant": "burgerlab", "session": f"session{i}xyz", "events": [
            {"type": "view", "dish": "quadra", "source": "qr"},
            {"type": "ar", "dish": "quadra"},
        ]})
    login(client)
    page = client.get("/dashboard?days=7").get_data(as_text=True)
    assert "Dish views" in page and ">3<" in page


def test_badges_and_banner_reach_public_config(client):
    post(client, "/api/catalog", CATALOG)
    login(client)
    client.get("/promotions")
    with client.session_transaction() as s:
        token = s["csrf"]
    r = client.post("/promotions", data={
        "csrf": token,
        "badge-quadra": ["bestseller", "spicy"],
        "unavailable-doopler": "on",
        "banner_active": "on",
        "banner_text": "New: Quadra",
        "banner_dish": "quadra",
    })
    assert r.status_code == 302
    cfg = client.get("/api/config/burgerlab").get_json()
    assert cfg["banner"] == {"text": "New: Quadra", "dish": "quadra"}
    assert cfg["dishes"]["quadra"]["badges"] == ["bestseller", "spicy"]
    assert cfg["dishes"]["doopler"]["unavailable"] is True


def test_promotions_rejects_missing_csrf(client):
    post(client, "/api/catalog", CATALOG)
    login(client)
    assert client.post("/promotions", data={"banner_text": "x"}).status_code == 400


def test_monthly_report_with_demo_data(client):
    import manage
    import report
    import stats

    post(client, "/api/catalog", CATALOG)
    manage.main(["demo-data", "burgerlab", "--days", "40", "--per-day", "20"])
    conn = client.db.connect()
    message, s = report.build(conn, "burgerlab", stats.month(stats.today().year, stats.today().month))
    assert "Burger Lab" in message and "dish views" in message
    assert "wa.me/923001234567?text=" in report.whatsapp_link(message, "+92 300 1234567")
    login(client)
    assert client.get("/report").status_code == 200
