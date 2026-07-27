def auth_headers(client, email="student@example.com"):
    r = client.post("/auth/register", json={"email": email, "password": "hunter2hunter2"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_auth_lifecycle(client, seeded):
    headers = auth_headers(client)
    assert client.get("/auth/me", headers=headers).json()["email"] == "student@example.com"

    # duplicate email rejected; wrong password rejected without leaking existence
    assert client.post(
        "/auth/register", json={"email": "student@example.com", "password": "hunter2hunter2"}
    ).status_code == 409
    assert client.post(
        "/auth/login", json={"email": "student@example.com", "password": "wrongwrong1"}
    ).status_code == 401

    login = client.post(
        "/auth/login", json={"email": "student@example.com", "password": "hunter2hunter2"}
    )
    assert login.status_code == 200

    assert client.delete("/auth/account", headers=headers).status_code == 204
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_course_search_detail_graph(client, seeded):
    r = client.get("/u/ucsc/courses", params={"q": "cse 10"})
    assert r.status_code == 200
    codes = [c["code"] for c in r.json()["courses"]]
    assert "CSE101" in codes

    detail = client.get("/u/ucsc/courses/CSE101").json()
    assert detail["prereq_groups"] == [["CSE12"], ["CSE16"], ["CSE30"]]
    assert [p["code"] for p in detail["postreqs"]] == ["CSE130"]

    history = detail["offering_history"]
    assert [h["term_code"] for h in history] == ["2268", "2262", "2260"]  # newest first
    assert history[0]["planned"] is True and history[0]["instructors"] == ["Ishtiyaque Ahmad"]
    assert history[1]["planned"] is False and history[1]["instructors"] == ["Tantalo,P."]

    graph = client.get("/u/ucsc/courses/CSE101/graph").json()
    node_codes = {n["code"] for n in graph["nodes"]}
    assert {"CSE101", "CSE12", "CSE16", "CSE30", "CSE130"} <= node_codes
    assert {"from": "CSE12", "to": "CSE30", "group": 0} in graph["edges"]


def test_validate_missing_and_concurrent_prereqs(client, seeded):
    body = {
        "content": {
            "completed": ["CSE12"],
            "terms": [
                {"term_code": "2270", "courses": ["CSE101", "CSE16"]},  # CSE30 missing, CSE16 concurrent
                {"term_code": "2272", "courses": ["CSE130"]},
            ],
        },
        "program_ids": [],
    }
    r = client.post("/u/ucsc/validate", json=body)
    assert r.status_code == 200
    issues = r.json()["issues"]
    kinds = {(i["kind"], i["course"]) for i in issues}
    assert ("missing_prereq", "CSE101") in kinds  # CSE30 not taken anywhere before
    assert ("concurrent_prereq", "CSE101") in kinds  # CSE16 same quarter
    # CSE130 in a later term sees CSE101 from the earlier term: no missing_prereq
    assert ("missing_prereq", "CSE130") not in kinds


def test_validate_availability_and_ge(client, seeded):
    body = {
        "content": {
            "completed": ["ANTH2"],
            "terms": [{"term_code": "2272", "courses": ["CSE101"]}],  # spring; never offered
        },
        "program_ids": [],
    }
    out = client.post("/u/ucsc/validate", json=body).json()
    kinds = {i["kind"] for i in out["issues"]}
    assert "season_mismatch" in kinds
    ge = {g["category"]: g["satisfied"] for g in out["ge_progress"]}
    assert ge["CC"] is True and ge["TA"] is False


def test_validate_requirements_progress(client, seeded):
    programs = client.get("/u/ucsc/programs").json()
    prog_id = programs[0]["id"]
    body = {
        "content": {
            "completed": ["CSE12", "CSE16", "CSE101"],
            "terms": [],
        },
        "program_ids": [prog_id],
    }
    out = client.post("/u/ucsc/validate", json=body).json()
    sections = out["programs"][0]["sections"]
    lower = next(s for s in sections if s["kind"] == "lower_div")["rules"][0]
    assert lower["done"] == 2 and lower["needed"] == 3 and not lower["satisfied"]
    upper = next(s for s in sections if s["kind"] == "upper_div")["rules"][0]
    assert upper["done"] == 1 and upper["needed"] == 2


def test_plan_crud_requires_auth(client, seeded):
    assert client.get("/plans").status_code == 401
    headers = auth_headers(client, "planner@example.com")
    plan = {
        "name": "4-year",
        "university_id": "ucsc",
        "program_ids": [],
        "content": {"completed": ["CSE12"], "terms": [{"term_code": "2270", "courses": ["CSE30"]}]},
    }
    created = client.post("/plans", json=plan, headers=headers)
    assert created.status_code == 201
    pid = created.json()["id"]

    plan["name"] = "renamed"
    assert client.put(f"/plans/{pid}", json=plan, headers=headers).json()["name"] == "renamed"
    assert len(client.get("/plans", headers=headers).json()) == 1

    other = auth_headers(client, "other@example.com")
    assert client.put(f"/plans/{pid}", json=plan, headers=other).status_code == 404

    assert client.delete(f"/plans/{pid}", headers=headers).status_code == 204
    assert client.get("/plans", headers=headers).json() == []


def test_dormant_flag_and_endpoint(client, seeded):
    r = client.get("/u/ucsc/dormant")
    assert r.json()["codes"] == ["CSE199X"]
    hits = client.get("/u/ucsc/courses", params={"q": "Ghost"}).json()["courses"]
    assert hits[0]["code"] == "CSE199X" and hits[0]["dormant"] is True
    live = client.get("/u/ucsc/courses", params={"q": "CSE101"}).json()["courses"]
    assert live[0]["dormant"] is False


def test_validate_dormant_course_error(client, seeded):
    body = {
        "content": {
            "completed": [],
            "terms": [{"term_code": "2270", "courses": ["CSE199X"]}],
        },
        "program_ids": [],
    }
    out = client.post("/u/ucsc/validate", json=body).json()
    dormant = [i for i in out["issues"] if i["kind"] == "dormant"]
    assert len(dormant) == 1
    assert dormant[0]["severity"] == "error"
    assert "five years" in dormant[0]["message"]
