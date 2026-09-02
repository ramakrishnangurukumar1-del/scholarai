from tests.conftest import auth


def test_list_scholarships_public(client):
    r = client.get("/api/v1/scholarships")
    assert r.status_code == 200
    names = [s["name"] for s in r.json()]
    assert "Merit Excellence Scholarship 2026" in names


def test_filter_by_category(client):
    r = client.get("/api/v1/scholarships", params={"category": "Merit"})
    assert r.status_code == 200
    assert all(s["category"]["name"] == "Merit" for s in r.json())


def test_scholarship_detail_has_criteria(client):
    sid = client.get("/api/v1/scholarships").json()[0]["id"]
    r = client.get(f"/api/v1/scholarships/{sid}")
    assert r.status_code == 200
    assert "criteria" in r.json()


def test_student_cannot_create_scholarship(client, student_token):
    r = client.post(
        "/api/v1/scholarships",
        headers=auth(student_token),
        json={"name": "X", "slug": "x"},
    )
    assert r.status_code == 403


def test_admin_can_create_and_delete_scholarship(client, admin_token):
    r = client.post(
        "/api/v1/scholarships",
        headers=auth(admin_token),
        json={"name": "Sports Grant", "slug": "sports-grant", "amount_max": 30000},
    )
    assert r.status_code == 201
    new_id = r.json()["id"]

    assert any(s["id"] == new_id for s in client.get("/api/v1/scholarships").json())

    d = client.delete(f"/api/v1/scholarships/{new_id}", headers=auth(admin_token))
    assert d.status_code == 204
    assert not any(s["id"] == new_id for s in client.get("/api/v1/scholarships").json())


def test_recommendations_ranked_for_student(client, student_token):
    r = client.get("/api/v1/students/me/recommendations", headers=auth(student_token))
    assert r.status_code == 200
    data = r.json()
    assert data == sorted(data, key=lambda x: x["match"], reverse=True)


def test_profile_update_recomputes_completion(client, student_token):
    r = client.put(
        "/api/v1/students/me/profile",
        headers=auth(student_token),
        json={"cgpa": 6.0, "annual_income": 900000},
    )
    assert r.status_code == 200
    assert r.json()["cgpa"] == 6.0

    # weaker profile -> lower merit match
    recs = client.get("/api/v1/students/me/recommendations", headers=auth(student_token)).json()
    merit = next(x for x in recs if "Merit" in x["name"])
    assert merit["match"] < 100
