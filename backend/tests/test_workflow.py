import io

from tests.conftest import auth


def _fake_file(name: str, content: str = "x", mime: str = "text/plain"):
    return {"file": (name, io.BytesIO(content.encode()), mime)}


def _new_application(client, token, scholarship_name="Merit"):
    sid = next(
        s["id"] for s in client.get("/api/v1/scholarships").json() if scholarship_name in s["name"]
    )
    r = client.post("/api/v1/applications", headers=auth(token), json={"scholarship_id": sid})
    assert r.status_code == 201
    return r.json()["id"]


def test_full_application_flow_clean(client, student_token):
    app_id = _new_application(client, student_token)

    client.put(
        f"/api/v1/applications/{app_id}",
        headers=auth(student_token),
        json={"form_data": {"full_name": "Ramakrishnan G", "annual_income": 180000, "cgpa": 8.6}},
    )
    for doc_type in ("identity", "marksheet"):
        client.post(
            f"/api/v1/applications/{app_id}/documents",
            headers=auth(student_token),
            data={"doc_type": doc_type},
            files=_fake_file(f"{doc_type}.txt"),
        )
    client.post(
        f"/api/v1/applications/{app_id}/documents",
        headers=auth(student_token),
        data={"doc_type": "income_certificate"},
        files=_fake_file("inc.txt", "Name: Ramakrishnan G\nAnnual Income: Rs 1,80,000"),
    )

    r = client.post(f"/api/v1/applications/{app_id}/submit", headers=auth(student_token))
    assert r.status_code == 200
    assert r.json()["status"] == "under_review"
    assert r.json()["ai_flagged"] is False


def test_uploaded_document_is_viewable(client, student_token, authority_token):
    app_id = _new_application(client, student_token)
    up = client.post(
        f"/api/v1/applications/{app_id}/documents",
        headers=auth(student_token),
        data={"doc_type": "identity"},
        files=_fake_file("id.txt", "AADHAAR 1234 5678 9012"),
    )
    assert up.status_code == 201
    doc_id = up.json()["id"]

    # the applicant can retrieve their own file
    r = client.get(f"/api/v1/documents/{doc_id}/file", headers=auth(student_token))
    assert r.status_code == 200
    assert r.content == b"AADHAAR 1234 5678 9012"

    # so can a reviewing officer
    assert client.get(f"/api/v1/documents/{doc_id}/file", headers=auth(authority_token)).status_code == 200

    # but not an anonymous request
    assert client.get(f"/api/v1/documents/{doc_id}/file").status_code == 401


def test_application_flagged_on_income_mismatch(client, student_token):
    app_id = _new_application(client, student_token)
    client.put(
        f"/api/v1/applications/{app_id}",
        headers=auth(student_token),
        json={"form_data": {"full_name": "Ramakrishnan G", "annual_income": 180000}},
    )
    client.post(
        f"/api/v1/applications/{app_id}/documents",
        headers=auth(student_token),
        data={"doc_type": "identity"},
        files=_fake_file("id.txt"),
    )
    client.post(
        f"/api/v1/applications/{app_id}/documents",
        headers=auth(student_token),
        data={"doc_type": "marksheet"},
        files=_fake_file("ms.txt"),
    )
    client.post(
        f"/api/v1/applications/{app_id}/documents",
        headers=auth(student_token),
        data={"doc_type": "income_certificate"},
        files=_fake_file("inc.txt", "Name: Ramakrishnan G\nAnnual Income: Rs 2,40,000"),
    )

    r = client.post(f"/api/v1/applications/{app_id}/submit", headers=auth(student_token))
    assert r.status_code == 200
    body = r.json()
    assert body["ai_flagged"] is True
    assert body["status"] == "ai_verification"
    assert any("mismatch" in i["type"].lower() for i in body["ai_analysis"]["issues"])


def test_upload_rejects_unknown_type(client, student_token):
    app_id = _new_application(client, student_token)
    r = client.post(
        f"/api/v1/applications/{app_id}/documents",
        headers=auth(student_token),
        data={"doc_type": "identity"},
        files={"file": ("x.exe", io.BytesIO(b"x"), "application/x-msdownload")},
    )
    assert r.status_code == 415


def test_submit_requires_documents(client, student_token):
    app_id = _new_application(client, student_token)
    r = client.post(f"/api/v1/applications/{app_id}/submit", headers=auth(student_token))
    assert r.status_code == 400


def test_authority_decision_flow(client, student_token, authority_token):
    app_id = _new_application(client, student_token)
    client.put(
        f"/api/v1/applications/{app_id}",
        headers=auth(student_token),
        json={"form_data": {"full_name": "Ramakrishnan G", "annual_income": 180000}},
    )
    for dt in ("identity", "marksheet", "income_certificate"):
        client.post(
            f"/api/v1/applications/{app_id}/documents",
            headers=auth(student_token),
            data={"doc_type": dt},
            files=_fake_file(f"{dt}.txt", "Annual Income: Rs 1,80,000"),
        )
    client.post(f"/api/v1/applications/{app_id}/submit", headers=auth(student_token))

    # authority sees it
    rows = client.get("/api/v1/authority/applications", headers=auth(authority_token)).json()
    assert any(r["id"] == app_id for r in rows)

    # approve
    d = client.post(
        f"/api/v1/authority/applications/{app_id}/decision",
        headers=auth(authority_token),
        json={"action": "approve", "remark": "ok"},
    )
    assert d.status_code == 200

    # student sees approved + notification
    detail = client.get(f"/api/v1/applications/{app_id}", headers=auth(student_token)).json()
    assert detail["status"] == "approved"
    notes = client.get("/api/v1/students/me/notifications", headers=auth(student_token)).json()
    assert any("approved" in n["title"].lower() for n in notes)


def test_student_cannot_access_authority_dashboard(client, student_token):
    r = client.get("/api/v1/authority/dashboard", headers=auth(student_token))
    assert r.status_code == 403


def test_analytics_shape(client, authority_token):
    r = client.get("/api/v1/analytics", headers=auth(authority_token))
    assert r.status_code == 200
    body = r.json()
    assert {"totals", "counts", "overTime", "byCategory", "topScholarships"} <= body.keys()
