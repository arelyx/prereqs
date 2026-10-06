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
    assert ("concurrent_prereq", "CSE101") in kinds  # CSE16 same quarter, allowed
    # CSE130 in a later term sees CSE101 from the earlier term: no missing_prereq
    assert ("missing_prereq", "CSE130") not in kinds
    assert ("missing_coreq", "CSE130") not in kinds  # coreq CSE16 taken earlier


def test_same_quarter_prereq_only_when_catalog_allows(client, seeded):
    body = {
        "content": {
            "completed": ["CSE12", "CSE16", "CSE30"],
            "terms": [{"term_code": "2270", "courses": ["CSE101", "CSE130"]}],
        },
        "program_ids": [],
    }
    issues = client.post("/u/ucsc/validate", json=body).json()["issues"]
    by_course = {(i["kind"], i["course"]): i for i in issues}
    # CSE101 is not on CSE130's concurrent-allowed list: must come first.
    assert ("missing_prereq", "CSE130") in by_course
    assert "same quarter" in by_course[("missing_prereq", "CSE130")]["message"]


def test_strict_coreq_reported(client, seeded):
    body = {
        "content": {
            "completed": ["CSE12", "CSE30", "CSE101"],
            "terms": [{"term_code": "2270", "courses": ["CSE130"]}],
        },
        "program_ids": [],
    }
    issues = client.post("/u/ucsc/validate", json=body).json()["issues"]
    assert ("missing_coreq", "CSE130") in {(i["kind"], i["course"]) for i in issues}


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


def test_program_detail_info_and_source(client, seeded):
    programs = client.get("/u/ucsc/programs").json()
    p = programs[0]
    assert p["slug"] == "computer-science-bs" and p["edition"] == "2026-27"
    detail = client.get(f"/u/ucsc/programs/{p['id']}").json()
    assert detail["info_sections"] == [{"title": "Introduction", "paragraphs": ["Study computing."]}]
    src = client.get(f"/u/ucsc/programs/{p['id']}/source").json()
    assert "CSE 12" in src["markdown"]
    # validation accepts the program (requirements are evaluated client-side)
    out = client.post("/u/ucsc/validate", json={"content": {"completed": ["CSE12"], "terms": []},
                                               "program_ids": [p["id"]]}).json()
    assert "issues" in out and "programs" not in out


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


def test_multiple_plans_per_user(client, seeded):
    headers = auth_headers(client, "multi@example.com")

    def plan(name, completed):
        return {
            "name": name,
            "university_id": "ucsc",
            "program_ids": [],
            "content": {"completed": completed, "terms": []},
        }

    ids = []
    for name, completed in [("Plan A", ["CSE12"]), ("Plan B", ["CSE16"]), ("Plan C", [])]:
        r = client.post("/plans", json=plan(name, completed), headers=headers)
        assert r.status_code == 201, r.text
        ids.append(r.json()["id"])

    listed = client.get("/plans", headers=headers).json()
    assert [p["id"] for p in listed] == ids  # ordered by id
    assert [p["name"] for p in listed] == ["Plan A", "Plan B", "Plan C"]

    # Updating one plan leaves the others untouched.
    r = client.put(f"/plans/{ids[1]}", json=plan("Plan B2", ["CSE30"]), headers=headers)
    assert r.status_code == 200 and r.json()["name"] == "Plan B2"
    listed = {p["id"]: p for p in client.get("/plans", headers=headers).json()}
    assert listed[ids[0]]["content"]["completed"] == ["CSE12"]
    assert listed[ids[1]]["content"]["completed"] == ["CSE30"]
    assert listed[ids[2]]["content"]["completed"] == []

    # A different user cannot see or touch these plans.
    other = auth_headers(client, "multi-other@example.com")
    assert client.get("/plans", headers=other).json() == []
    assert client.put(f"/plans/{ids[0]}", json=plan("steal", []), headers=other).status_code == 404
    assert client.delete(f"/plans/{ids[0]}", headers=other).status_code == 404
    assert len(client.get("/plans", headers=headers).json()) == 3


def test_plan_count_cap(client, seeded):
    from app.api.plans import MAX_PLANS

    headers = auth_headers(client, "capped@example.com")
    body = {
        "name": "n",
        "university_id": "ucsc",
        "program_ids": [],
        "content": {"completed": [], "terms": []},
    }
    for i in range(MAX_PLANS):
        assert client.post("/plans", json=body, headers=headers).status_code == 201
    over = client.post("/plans", json=body, headers=headers)
    assert over.status_code == 422
    assert "plan limit" in over.json()["detail"]
    # Deleting one frees a slot.
    pid = client.get("/plans", headers=headers).json()[0]["id"]
    assert client.delete(f"/plans/{pid}", headers=headers).status_code == 204
    assert client.post("/plans", json=body, headers=headers).status_code == 201


def test_plan_content_shape_rejected(client, seeded):
    """Terms are structured content, not free-form dicts: non-string codes,
    non-list courses, and unbounded blobs must all 422 instead of landing in
    the DB (they used to crash the client at sign-in)."""
    headers = auth_headers(client, "shapes@example.com")

    def post(content):
        body = {"name": "n", "university_id": "ucsc", "program_ids": [], "content": content}
        return client.post("/plans", json=body, headers=headers)

    assert post({"completed": [], "terms": [{"term_code": "2258", "courses": [123]}]}).status_code == 422
    assert post({"completed": [], "terms": [{"term_code": "2258", "courses": "CSE12"}]}).status_code == 422
    assert post({"completed": [], "terms": [{"courses": []}]}).status_code == 422
    assert post({"completed": [123], "terms": []}).status_code == 422
    # bounded, not just typed: courses per term, code length, term_code length
    too_many = {"term_code": "2258", "courses": [f"C{i}" for i in range(31)]}
    assert post({"completed": [], "terms": [too_many]}).status_code == 422
    assert post({"completed": ["X" * 33], "terms": []}).status_code == 422
    assert post({"completed": [], "terms": [{"term_code": "X" * 17, "courses": []}]}).status_code == 422
    # the real shape still round-trips
    ok = post({"completed": ["CSE12"], "terms": [{"term_code": "2258", "courses": ["CSE16"]}]})
    assert ok.status_code == 201
    assert ok.json()["content"]["terms"] == [{"term_code": "2258", "courses": ["CSE16"]}]


def test_validate_rejects_non_string_courses(client, seeded):
    """Used to 500 on c.replace() over a non-str course; must be a 422."""
    bad_term = {"content": {"completed": [], "terms": [{"term_code": "2270", "courses": [123]}]},
                "program_ids": []}
    assert client.post("/u/ucsc/validate", json=bad_term).status_code == 422
    bad_completed = {"content": {"completed": [123], "terms": []}, "program_ids": []}
    assert client.post("/u/ucsc/validate", json=bad_completed).status_code == 422


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


def test_catalog_compact(client, seeded):
    r = client.get("/u/ucsc/catalog/compact")
    assert r.status_code == 200
    body = r.json()
    assert body["described"] == []
    codes = {c["code"] for c in body["courses"]}
    assert "CSE12" in codes
    assert all("description" not in c for c in body["courses"])
    subj = body["courses"][0]["subject"]
    r = client.get(f"/u/ucsc/catalog/compact?describe={subj.lower()}")
    with_desc = [c for c in r.json()["courses"] if "description" in c]
    assert with_desc and all(c["subject"] == subj for c in with_desc)
