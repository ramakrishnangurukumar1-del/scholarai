from tests.conftest import DEMO_PASSWORD, auth


def test_admin_lists_users(client, admin_token):
    r = client.get("/api/v1/admin/users", headers=auth(admin_token))
    assert r.status_code == 200
    emails = [u["email"] for u in r.json()]
    assert "student@scholarai.dev" in emails


def test_non_admin_cannot_list_users(client, authority_token):
    r = client.get("/api/v1/admin/users", headers=auth(authority_token))
    assert r.status_code == 403


def test_admin_creates_authority_that_can_log_in(client, admin_token):
    r = client.post(
        "/api/v1/admin/authorities",
        headers=auth(admin_token),
        json={
            "full_name": "New Officer",
            "email": "officer@scholarai.dev",
            "password": "officer123",
            "department": "Scholarships",
        },
    )
    assert r.status_code == 201
    assert r.json()["role"] == "authority"

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "officer@scholarai.dev", "password": "officer123"},
    )
    assert login.status_code == 200
    tok = login.json()["access_token"]

    # the new officer has authority access
    assert client.get("/api/v1/authority/dashboard", headers=auth(tok)).status_code == 200


def test_create_authority_rejects_duplicate_email(client, admin_token):
    r = client.post(
        "/api/v1/admin/authorities",
        headers=auth(admin_token),
        json={"full_name": "Dup", "email": "student@scholarai.dev", "password": "abcdef"},
    )
    assert r.status_code == 409


def test_admin_can_disable_a_user(client, admin_token):
    users = client.get("/api/v1/admin/users", headers=auth(admin_token)).json()
    student = next(u for u in users if u["email"] == "student@scholarai.dev")

    r = client.patch(
        f"/api/v1/admin/users/{student['id']}",
        headers=auth(admin_token),
        json={"is_active": False},
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False

    # disabled account can't log in
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "student@scholarai.dev", "password": DEMO_PASSWORD},
    )
    assert login.status_code == 403


def test_admin_cannot_change_own_account(client, admin_token):
    users = client.get("/api/v1/admin/users", headers=auth(admin_token)).json()
    me = next(u for u in users if u["email"] == "admin@scholarai.dev")
    r = client.patch(
        f"/api/v1/admin/users/{me['id']}", headers=auth(admin_token), json={"is_active": False}
    )
    assert r.status_code == 400
