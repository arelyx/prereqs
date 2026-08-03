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


def test_filter_passthrough_on_non_range_rules(client, db_session, seeded):
    """Filters are requirement content: every op must expose filter+matching
    (the CS B.S. electives bug hid 'any CSE 100-189' behind a list op)."""
    from app.models import Program

    prog = Program(
        university_id="ucsc",
        name="Filter Passthrough Test B.S.",
        degree="BS",
        kind="major",
        slug="filter-passthrough-test",
        url="https://example.test/fpt",
        requirements={
            "sections": [
                {
                    "kind": "electives",
                    "title": "Electives",
                    "concentration": None,
                    "rules": [
                        {"op": "n_of", "n": 4, "courses": [], "branches": None,
                         "constraints": [], "source": {"heading": "Electives"},
                         "notes": [], "needs_review": False,
                         "from_following_lists": True},
                        {"op": "list", "n": None, "courses": ["ANTH2"],
                         "branches": None, "constraints": [],
                         "source": {"heading": "List:"}, "notes": [],
                         "needs_review": False,
                         "filter": {"include_ranges": [{"subject": "CSE", "lo": 100, "hi": 189}],
                                    "include_series": [], "exclude_ranges": [],
                                    "exclude_codes": ["CSE115A"]}},
                    ],
                }
            ]
        },
    )
    db_session.add(prog)
    db_session.commit()
    body = {
        "content": {"completed": ["CSE101", "CSE130"], "terms": []},
        "program_ids": [prog.id],
    }
    out = client.post("/u/ucsc/validate", json=body).json()
    rules = out["programs"][0]["sections"][0]["rules"]
    # the list rule must expose its filter and the taken courses matching it
    lst = rules[1]
    assert lst["filter"]["include_ranges"][0]["subject"] == "CSE"
    assert lst["matching"] == ["CSE101", "CSE130"]
    # and the pool-fed parent counts range matches (evaluation was already right)
    assert rules[0]["done"] == 2 and rules[0]["have"] == ["CSE101", "CSE130"]
