"""The refresh work order: cadence rules over a fake ledger."""

from datetime import date, datetime, timedelta, timezone

from ucsc import refresh
from ucsc.pisa_offerings import terms

TODAY = date(2026, 10, 5)


def _iso(days_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


def _ledger(**over):
    base = {
        "pisa_offerings": {"terms": {
            "2262": {"final": True}, "2264": {"final": True}, "2268": {"final": False},
        }},
        "soe_schedule": {"academic_year": "2026-27", "fetched_at": _iso(3)},
        "catalog_courses": {"edition": "2026-27", "fetched_at": _iso(3)},
        "editions": {"2026-27": {"fetched_at": _iso(3), "live": True, "programs": {
            "music-bm": {"text": "t1", "skeleton": "s1"},
            "cs-bs": {"text": "t2", "skeleton": "s2"},
        }}},
    }
    base.update(over)
    return base


def _plan(monkeypatch, led, live=None, manifests=None):
    monkeypatch.setattr(refresh.ledger, "load", lambda: led)
    monkeypatch.setattr(refresh, "harness_manifests", lambda: manifests or {})
    return refresh.plan(live, today=TODAY)


def test_nonfinal_term_is_refetched_and_fresh_sources_are_quiet(monkeypatch):
    tasks = _plan(monkeypatch, _ledger(), live={
        "pisa_terms": ["2262", "2264", "2268"], "catalog_edition": "2026-27", "soe_cse_sha256": "x"})
    assert [t.source for t in tasks] == ["pisa_offerings"]
    assert "--terms 2268" in tasks[0].commands[0]


def test_new_terms_from_probe_and_long_gaps_use_backfill(monkeypatch):
    led = _ledger(pisa_offerings={"terms": {"2240": {"final": True}}})
    live = {"pisa_terms": ["2240", "2242", "2244", "2248", "2250", "2252"],
            "catalog_edition": "2026-27", "soe_cse_sha256": "x"}
    pisa = [t for t in _plan(monkeypatch, led, live) if t.source == "pisa_offerings"][0]
    assert pisa.commands[0] == "python -m ucsc.pisa_offerings.backfill --from 2242 --to 2252"


def test_new_edition_triggers_courses_programs_and_archive_refetch(monkeypatch):
    live = {"pisa_terms": ["2268"], "catalog_edition": "2027-28", "soe_cse_sha256": "x"}
    tasks = _plan(monkeypatch, _ledger(), live)
    cmds = [c for t in tasks for c in t.commands]
    assert "python -m ucsc.catalog_courses.fetch" in cmds
    assert "python -m ucsc.major_requirements.fetch" in cmds
    assert "python -m ucsc.major_requirements.fetch --edition 2026-27" in cmds


def test_stale_soe_and_catalog_by_age(monkeypatch):
    led = _ledger(soe_schedule={"academic_year": "2026-27", "fetched_at": _iso(45)},
                  catalog_courses={"edition": "2026-27", "fetched_at": _iso(120)})
    sources = {t.source for t in _plan(monkeypatch, led)}
    assert {"soe_schedule", "catalog_courses"} <= sources


def test_harness_staleness_structure_vs_wording(monkeypatch):
    manifests = {
        ("2026-27", "music-bm"): {"source_sha256": "old", "skeleton_sha256": "s1"},  # wording only
        ("2026-27", "cs-bs"): {"source_sha256": "old", "skeleton_sha256": "old"},    # structure
    }
    warm = [t for t in _plan(monkeypatch, _ledger(), manifests=manifests) if t.path == "warm"]
    by_why = {t.why: t.items for t in warm}
    assert by_why["edition 2026-27: requirement STRUCTURE changed since authored"] == ["cs-bs"]
    assert any(items == ["music-bm"] for why, items in by_why.items() if "wording" in why)


def test_offline_estimate_lists_every_published_term(monkeypatch):
    led = _ledger(pisa_offerings={"terms": {"2258": {"final": True}}})
    pisa = [t for t in _plan(monkeypatch, led) if t.source == "pisa_offerings"][0]
    assert "2260" in pisa.why and "2268" in pisa.why and "2270" not in pisa.why


def test_term_finality_and_successor():
    assert terms.is_final("2264", TODAY)        # summer 2026 graded by mid-Sept
    assert not terms.is_final("2268", TODAY)    # fall 2026 in progress
    assert terms.next_code("2268") == "2270" and terms.next_code("2264") == "2268"
