import json

import pytest

from common import codes
from common.guards import FailureBudget, GuardViolation, ScrapeDriftError, expect, expect_range
from common.ollama import _extract_json
from common.snapshot import SnapshotWriter, latest


def test_expect_raises_with_context():
    with pytest.raises(ScrapeDriftError, match=r"dept count.*\[url='x'\]"):
        expect(False, "dept count", url="x")
    expect(True, "fine")
    expect_range(5, 1, 10, "count")
    with pytest.raises(ScrapeDriftError):
        expect_range(50, 1, 10, "count")


def test_failure_budget_aborts_over_threshold():
    budget = FailureBudget(total=100, max_ratio=0.05)
    for i in range(5):
        budget.record(f"c{i}", "bad json")
    with pytest.raises(GuardViolation, match="failure budget exceeded"):
        budget.record("c5", "bad json")


def test_code_normalization():
    assert codes.normalize("Cse 12") == "CSE12"
    assert codes.is_course_id("MATH19B")
    assert codes.is_course_id("CSE115A")
    assert not codes.is_course_id("PERMISSION")
    assert codes.extract_codes("Math 117 and CSE 101; or by permission") == {"MATH117", "CSE101"}
    assert codes.display("CSE12") == "CSE 12"


def test_extract_json_variants():
    assert _extract_json('{"groups": []}') == {"groups": []}
    assert _extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert _extract_json('noise {"a": 1} trailing') == {"a": 1}
    assert _extract_json("not json") is None
    assert _extract_json("") is None


def test_snapshot_staging_and_finalize(tmp_path, monkeypatch):
    monkeypatch.setattr("common.snapshot.DATA_ROOT", tmp_path)
    w = SnapshotWriter("ucsc", "unit-test")
    w.write_json("out.json", {"n": 1})
    # Unfinalized snapshots are invisible to latest()
    assert latest("ucsc", "unit-test") is None
    final = w.finalize({"counts": {"n": 1}})
    assert latest("ucsc", "unit-test") == final
    manifest = json.loads((final / "manifest.json").read_text())
    assert manifest["university"] == "ucsc"
    assert manifest["counts"] == {"n": 1}


def test_snapshot_abort_cleans_staging(tmp_path, monkeypatch):
    monkeypatch.setattr("common.snapshot.DATA_ROOT", tmp_path)
    w = SnapshotWriter("ucsc", "unit-test")
    w.write_json("out.json", {})
    w.abort()
    assert latest("ucsc", "unit-test") is None
    assert list((tmp_path / "ucsc" / "unit-test").iterdir()) == []
