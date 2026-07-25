"""Interpretation of segmented rule nodes into the typed requirements tree.

Deterministic-first: the SmartCatalog heading vocabulary is semi-controlled,
so high-precision regex patterns classify most rules with zero LLM exposure.
The qwen3:4b fallback handles the open-set remainder, with hard validation:
- op must be in the enum;
- a claimed count must appear verbatim (digit or number-word) in the
  heading/prose, else the rule is quarantined (`needs_review`), never guessed.

Special OR encodings (research doc §3):
- Narrative-row branches → op=options (deterministic, from segment.py).
- Sibling-heading disjunction ("Or all of the following courses") → the rule
  is merged into an options node with its predecessor.
Range rules ("LIT 109-189, excluding LIT 179A...") are parsed deterministically
into bounds + exclusions.
"""

from __future__ import annotations

import re

from common.guards import FailureBudget
from common.ollama import DEFAULT_MODEL, OllamaError, chat_json
from common import codes

from . import prompts
from .segment import RawRule, RawSection, SegmentedProgram

WORD_NUMBERS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
    "both": 2,
}

ALL_OF_RE = re.compile(
    r"all of the following|take the following|the following courses?\b|both of these"
    r"|plus the following|complete the following|following course is required",
    re.IGNORECASE,
)
ONE_OF_RE = re.compile(r"\bone of the following|choose one\b|one of these", re.IGNORECASE)
N_OF_RE = re.compile(
    r"\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\b"
    r"[^.]{0,60}?\b(of the following|electives?|courses?|from)\b",
    re.IGNORECASE,
)
OR_SIBLING_RE = re.compile(r"^or\b", re.IGNORECASE)
RANGE_RE = re.compile(r"\b([A-Z]{2,5})\s?(\d{1,3})\s?-\s?(\d{1,3})\b")
EXCLUDING_RE = re.compile(r"exclud\w+[^.]*", re.IGNORECASE)

SECTION_KIND_RE = [
    (re.compile(r"disciplinary communication|\bDC\b", re.IGNORECASE), "dc"),
    (re.compile(r"comprehensive|capstone", re.IGNORECASE), "comprehensive"),
    (re.compile(r"lower[- ]division", re.IGNORECASE), "lower_div"),
    (re.compile(r"upper[- ]division", re.IGNORECASE), "upper_div"),
    (re.compile(r"elective", re.IGNORECASE), "electives"),
    (re.compile(r"concentration|track", re.IGNORECASE), "concentration"),
    (re.compile(r"qualification|declaration", re.IGNORECASE), "qualification"),
    (re.compile(r"screening|transfer", re.IGNORECASE), "screening"),
]


def classify_heading(rule: RawRule) -> tuple[str, int | None] | None:
    """Deterministic classification; None means 'needs the LLM fallback'."""
    heading = rule.heading
    text = heading + " " + " ".join(rule.prose[:2])
    if rule.branches:
        return ("options", None)
    if ONE_OF_RE.search(heading):
        return ("one_of", None)
    if ALL_OF_RE.search(heading):
        return ("all_of", None)
    m = N_OF_RE.search(heading)
    if m:
        word = m.group(1).lower()
        n = WORD_NUMBERS.get(word) or (int(word) if word.isdigit() else None)
        if n == 1:
            return ("one_of", None)
        if n and rule.courses:
            return ("n_of", n)
        if n and not rule.courses:
            return ("category_count", n)
    if RANGE_RE.search(text) and not rule.courses:
        return ("range", None)
    if not rule.courses and not rule.branches and not rule.prose:
        return ("all_of", None)  # bare heading with nothing under it; harmless
    return None


def stated_numbers(rule: RawRule) -> set[int]:
    """Every count literally stated in the rule's heading/prose."""
    text = (rule.heading + " " + " ".join(rule.prose)).lower()
    found = {n for w, n in WORD_NUMBERS.items() if re.search(rf"\b{w}\b", text)}
    found.update(int(d) for d in re.findall(r"\b(\d{1,2})\b", text))
    return found


def interpret_rule(
    rule: RawRule,
    llm_stats: dict,
    budget: FailureBudget,
    model: str = DEFAULT_MODEL,
) -> dict:
    """RawRule → typed rule node (docs/DATA_MODEL.md shape)."""
    node: dict = {
        "op": None,
        "n": None,
        "courses": [c["code"] for c in rule.courses],
        "branches": [[c["code"] for c in b] for b in rule.branches] or None,
        "constraints": [],
        "source": {"heading": rule.heading, "prose": rule.prose},
        "notes": rule.notes,
        "needs_review": False,
    }

    # Range rules resolve deterministically to bounds + exclusions.
    text = rule.heading + " " + " ".join(rule.prose)
    range_m = RANGE_RE.search(text)
    det = classify_heading(rule)
    if det is not None:
        node["op"], node["n"] = det
    else:
        result = None
        try:
            parsed, _ = chat_json(
                prompts.SYSTEM_PROMPT,
                prompts.user_message(
                    rule.heading, rule.prose, len(rule.courses), len(rule.branches)
                ),
                model=model,
            )
            llm_stats["calls"] += 1
            if isinstance(parsed, dict):
                result = parsed
        except OllamaError as exc:
            budget.record(rule.heading[:60], f"ollama error: {exc}")

        op = (result or {}).get("op")
        n = (result or {}).get("n")
        valid_ops = {"all_of", "one_of", "n_of", "options", "category_count", "unknown"}
        if op not in valid_ops:
            op, n = "unknown", None
        if n is not None and (not isinstance(n, int) or n not in stated_numbers(rule)):
            # The model invented a count — quarantine rather than trust.
            budget.record(rule.heading[:60], f"unverifiable count {n!r}")
            op, n = "unknown", None
        node["op"], node["n"] = op, n
        if op == "unknown":
            node["needs_review"] = True
        llm_stats["fallbacks"] += 1

    if node["op"] == "range" or (range_m and not rule.courses and node["op"] in (None, "unknown")):
        node["op"] = "range"
        subj, lo, hi = range_m.group(1), int(range_m.group(2)), int(range_m.group(3))
        excl_m = EXCLUDING_RE.search(text)
        exclusions = sorted(codes.extract_codes(excl_m.group(0))) if excl_m else []
        node["range"] = {"subject": subj, "lo": lo, "hi": hi, "exclude": exclusions}
        n_m = N_OF_RE.search(rule.heading)
        if n_m:
            w = n_m.group(1).lower()
            node["n"] = WORD_NUMBERS.get(w) or (int(w) if w.isdigit() else None)

    # Constraint riders stay verbatim (auditable; machine-evaluation later).
    for prose in rule.prose:
        if re.search(r"at least|no more than|at most|must (be|come|include)", prose, re.IGNORECASE):
            node["constraints"].append({"type": "prose", "text": prose})

    return node


def build_program(
    seg: SegmentedProgram,
    meta: dict,
    budget: FailureBudget,
    model: str = DEFAULT_MODEL,
) -> dict:
    """SegmentedProgram → program record with typed requirements tree."""
    llm_stats = {"calls": 0, "fallbacks": 0}
    sections: list[dict] = []

    for raw_section in seg.sections:
        subsections = _split_by_heading2(raw_section)
        for kind, title, rules, concentration in subsections:
            typed_rules: list[dict] = []
            for rule in rules:
                node = interpret_rule(rule, llm_stats, budget, model=model)
                # Sibling-heading OR: "Or all of the following courses" merges
                # into an options node with the previous rule.
                if OR_SIBLING_RE.match(rule.heading) and typed_rules:
                    prev = typed_rules[-1]
                    if prev.get("op") != "options" or prev.get("_sibling_or") is not True:
                        prev_branch = prev["courses"] or []
                        typed_rules[-1] = {
                            "op": "options",
                            "n": None,
                            "courses": [],
                            "branches": [prev_branch],
                            "constraints": prev["constraints"],
                            "source": prev["source"],
                            "notes": prev["notes"],
                            "needs_review": prev["needs_review"],
                            "_sibling_or": True,
                        }
                    typed_rules[-1]["branches"].append(node["courses"])
                    typed_rules[-1]["notes"].extend(node["notes"])
                    continue
                typed_rules.append(node)
            for r in typed_rules:
                r.pop("_sibling_or", None)
            if typed_rules:
                sections.append(
                    {
                        "kind": kind,
                        "title": title,
                        "concentration": concentration,
                        "rules": typed_rules,
                    }
                )

    return {
        **meta,
        "requirements": {"sections": sections},
        "stats": {
            **llm_stats,
            "rules": sum(len(s["rules"]) for s in sections),
            "needs_review": sum(
                1 for s in sections for r in s["rules"] if r["needs_review"]
            ),
        },
    }


def _split_by_heading2(section: RawSection):
    """Group a RawSection's flat rule list into subsections at heading_class 2.

    Yields (kind, title, rules, concentration). A class-2 rule that itself has
    courses is both a boundary and a rule.
    """
    out: list[tuple[str, str, list[RawRule], str | None]] = []
    current_title = section.title
    current_kind = _kind_for(section, current_title)
    current_rules: list[RawRule] = []

    for rule in section.rules:
        if rule.heading_class == 2:
            if current_rules:
                out.append((current_kind, current_title, current_rules, section.concentration))
            current_title = rule.heading
            current_kind = _kind_for(section, rule.heading)
            current_rules = []
            if rule.courses or rule.branches or rule.prose or rule.notes:
                current_rules.append(rule)
        else:
            current_rules.append(rule)
    if current_rules:
        out.append((current_kind, current_title, current_rules, section.concentration))
    return out


def _kind_for(section: RawSection, title: str) -> str:
    if section.kind == "qualification":
        base = "qualification"
    else:
        base = "other"
    for pattern, kind in SECTION_KIND_RE:
        if pattern.search(title):
            return kind if base != "qualification" else base
    return base
