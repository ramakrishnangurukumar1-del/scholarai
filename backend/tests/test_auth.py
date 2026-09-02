from tests.conftest import DEMO_PASSWORD, auth


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_creates_student_and_returns_tokens(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"full_name": "New User", "email": "new@example.com", "password": "secret123"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["access_token"] and body["refresh_token"]

    me = client.get("/api/v1/auth/me", headers=auth(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["role"] == "student"
    assert me.json()["email"] == "new@example.com"


def test_register_rejects_duplicate_email(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Dup", "email": "student@scholarai.dev", "password": "secret123"},
    )
    assert r.status_code == 409


def test_register_rejects_short_password(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Short", "email": "s@example.com", "password": "abc"},
    )
    assert r.status_code == 422


def test_login_wrong_password(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "student@scholarai.dev", "password": "wrong"},
    )
    assert r.status_code == 401


def test_login_and_refresh(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "student@scholarai.dev", "password": DEMO_PASSWORD},
    )
    assert r.status_code == 200
    refresh = r.json()["refresh_token"]

    r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 200
    assert r2.json()["access_token"]


def test_me_requires_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_login_rate_limited(client):
    for _ in range(15):
        client.post(
            "/api/v1/auth/login", json={"email": "student@scholarai.dev", "password": "wrong"}
        )
    r = client.post(
        "/api/v1/auth/login", json={"email": "student@scholarai.dev", "password": DEMO_PASSWORD}
    )
    assert r.status_code == 429
