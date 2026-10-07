"""Committed hand resolutions for requirement texts the parser can't settle.

prereq_overrides.json maps course code -> {
    "raw_sha1": prereq_parse.raw_sha1(raw_requirements) -- sha1 of the
                whitespace-normalized text it was written for,
    "groups": CNF ([] = no course prerequisites),
    "concurrent_ok": [codes in groups that may be taken the same term],
    "coreqs": CNF of strictly-concurrent courses (optional, default []),
    "note": why / how it was read,
}

An override applies only while the course's current text hashes to
raw_sha1. When the catalog rewords the text the override goes stale: it is
ignored (the parser result is used if certain, otherwise the course is
unresolved) and reported so it can be re-read and rewritten.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from common import codes

from .prereq_parse import CERTAIN, ParseResult, raw_sha1

OVERRIDES_PATH = Path(__file__).with_name("prereq_overrides.json")


@dataclass
class Resolved:
    groups: list[list[str]] | None
    coreqs: list[list[str]] = field(default_factory=list)
    concurrent_ok: list[str] = field(default_factory=list)
    source: str = "parser"  # parser | override | unresolved
    stale: bool = False  # an override exists but its raw_sha1 no longer matches
    note: str | None = None


def load(path: Path = OVERRIDES_PATH) -> dict[str, dict]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text())
    for code, entry in data.items():
        validate_entry(code, entry)
    return data


def validate_entry(code: str, entry: dict) -> None:
    if not isinstance(entry.get("raw_sha1"), str) or len(entry["raw_sha1"]) != 40:
        raise ValueError(f"override {code}: raw_sha1 missing/invalid")
    for key in ("groups", "coreqs"):
        val = entry.get(key, [])
        if not isinstance(val, list) or not all(
            isinstance(g, list) and g and all(isinstance(c, str) and codes.is_course_id(c) for c in g)
            for g in val
        ):
            raise ValueError(f"override {code}: {key} must be CNF of canonical course ids")
    conc = entry.get("concurrent_ok", [])
    in_groups = {c for g in entry.get("groups", []) for c in g}
    if not isinstance(conc, list) or not set(conc) <= in_groups:
        raise ValueError(f"override {code}: concurrent_ok must be a subset of groups' codes")


def resolve(code: str, raw: str, parsed: ParseResult, overrides: dict[str, dict]) -> Resolved:
    entry = overrides.get(code)
    if entry is not None:
        if entry["raw_sha1"] == raw_sha1(raw):
            return Resolved(
                groups=entry["groups"] or None,
                coreqs=entry.get("coreqs", []),
                concurrent_ok=entry.get("concurrent_ok", []),
                source="override",
                note=entry.get("note"),
            )
        stale = True
    else:
        stale = False
    if parsed.confidence == CERTAIN:
        return Resolved(parsed.groups, parsed.coreqs, parsed.concurrent_ok, "parser", stale)
    return Resolved(None, [], [], "unresolved", stale)
