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
    # 'the following courses' must be anchored: unanchored it swallows
    # 'take three quarters of ANY of the following courses' / 'choose TWO of
    # the following courses' before the count cascade can read them.
    r"all of the following|take the following|^the following courses?\b|both of these"
    r"|^and these courses|^plus these\b|^and both\b"
    r"|plus the following|complete the following|following course is required"
    r"|all of these|^these courses|core requirements",
    # NB: 'satisfied by ...' is deliberately NOT all_of vocabulary — it is
    # followed by an arbitrary operator ('satisfied by completing two of the
    # following') and must fall through to the ONE_OF/N_OF cascade.
    re.IGNORECASE,
)
ONE_OF_RE = re.compile(
    r"\bone of the following|choose one\b|one of these"
    r"|(?:^|\band )either of the following"  # 'Either of the following' pairs = pick one
    r"|an? additional course from the following",  # CS BS DC phrasing
    re.IGNORECASE,
)
# Named course pools ("General Economics Electives", "List of B.S. electives:",
# "Breadth courses requiring CSE 101"): membership lists whose count/constraint
# lives in a sibling rule's prose. Not themselves a countable requirement.
POOL_RE = re.compile(
    r"electives?:?$|^list of|^approved elective|breadth courses"
    r"|courses (requiring|not requiring)",
    re.IGNORECASE,
)
N_OF_RE = re.compile(
    # Word counts freely; digit counts are 1-2 digits and must not follow a
    # subject code ('AM 115' / 'LIT109' are course numbers, not counts —
    # case-sensitively guarded so prose words don't trip it). Lookahead:
    # '5-credit'/'5 unit' are values, not counts.
    r"(?:\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b"
    r"|(?-i:(?<![A-Z])(?<![A-Z] ))\b(\d{1,2})\b(?!\d))"
    r"(?!\s*-?\s*(?:credit|unit))"
    r"[^.]{0,60}?\b(of the following|electives?|courses?|from)\b",
    re.IGNORECASE,
)


def _n_of_count(m: re.Match) -> int | None:
    word = (m.group(1) or m.group(2) or "").lower()
    return WORD_NUMBERS.get(word) or (int(word) if word.isdigit() else None)
OR_SIBLING_RE = re.compile(r"^or\b", re.IGNORECASE)
EACH_OF_RE = re.compile(
    r"\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+"
    r"courses?\s+(?:must be taken\s+)?from each of the",
    re.IGNORECASE,
)
# 'one course from THREE OF the following four groups (each from a different
# group)' — pick N groups, one course from each picked group.
PICK_GROUPS_RE = re.compile(
    r"course from\s+(one|two|three|four|five|six|\d+)\s+of the following\s+\w+\s+groups",
    re.IGNORECASE,
)

# 'FILM 100-149', 'FILM 152 -169', 'FILM 170A through FILM 179B',
# 'LIT 109-189' — subject-prefixed numeric spans; bound letters compared
# numerically (170A..179B ⇒ 170..179).
RANGE_SPAN_RE = re.compile(
    r"([A-Z]{2,5})\s?(\d{1,3})[A-Z]?\s*(?:-|–|through)\s*(?:[A-Z]{2,5}\s?)?(\d{1,3})[A-Z]?"
)
SERIES_RE = re.compile(r"([A-Z]{2,5})\s?(\d{1,3})\s+series")
# Pre-markers: the excluded items FOLLOW the marker ('...excluding LIT 179A').
# Post-markers: the excluded items PRECEDE it ('FILM 150 ... may not be used').
EXCLUDE_PRE_RE = re.compile(r"exclud\w+|except(?:\s+for)?", re.IGNORECASE)
EXCLUDE_POST_RE = re.compile(r"may not|not be used|do(?:es)? not count", re.IGNORECASE)
# Case-sensitive: prose words like 'seven 5-credit' must not become SEVEN5.
STRICT_CODE_RE = re.compile(r"\b([A-Z]{2,5})\s?(\d{1,3}[A-Z]{0,2})\b")


BETWEEN_RE = re.compile(
    r"([A-Z]{2,5})\s+courses?\s+with a number between\s+(\d{1,3})\s+and\s+(\d{1,3})"
)


def _collect(segment: str, out: dict, exclude: bool) -> None:
    spans = [
        {"subject": m.group(1), "lo": int(m.group(2)), "hi": int(m.group(3))}
        for m in RANGE_SPAN_RE.finditer(segment)
    ] + [
        {"subject": m.group(1), "lo": int(m.group(2)), "hi": int(m.group(3))}
        for m in BETWEEN_RE.finditer(segment)
    ]
    if exclude:
        out["exclude_ranges"].extend(spans)
        span_bounds = {f"{s['subject']}{b}" for s in spans for b in (s["lo"], s["hi"])}
        for m in STRICT_CODE_RE.finditer(segment):
            code = m.group(1) + m.group(2)
            # A span's endpoints stay represented by the range itself.
            if not any(code.startswith(sb) for sb in span_bounds):
                out["exclude_codes"].append(code)
    else:
        out["include_ranges"].extend(spans)
        out["include_series"].extend(
            {"subject": m.group(1), "prefix": m.group(2)}
            for m in SERIES_RE.finditer(segment)
        )


def extract_course_filter(text: str) -> dict:
    """Parse prose membership into include/exclude ranges, series, and codes.

    Per sentence: a pre-marker ('excluding', 'except') splits it — items
    before are includes, after are excludes. A post-marker ('may not be
    used', 'does not count') excludes the whole sentence's items. Otherwise
    the sentence contributes includes.
    """
    out = {
        "include_ranges": [],
        "include_series": [],
        "exclude_ranges": [],
        "exclude_codes": [],
    }
    for sentence in re.split(r"(?<=[.;])\s+", text):
        pre = EXCLUDE_PRE_RE.search(sentence)
        if pre:
            _collect(sentence[: pre.start()], out, exclude=False)
            rest = sentence[pre.end():]
            # A parenthesized exclusion scopes only to its parenthetical:
            # 'chosen from EART 100-199 (excluding EART 196B) or OCEA
            # 100-199' resumes INCLUDES after the close paren.
            open_paren = sentence.rfind("(", 0, pre.start())
            close = rest.find(")") if open_paren != -1 else -1
            if close != -1:
                _collect(rest[:close], out, exclude=True)
                _collect(rest[close + 1:], out, exclude=False)
            else:
                _collect(rest, out, exclude=True)
        elif EXCLUDE_POST_RE.search(sentence):
            _collect(sentence, out, exclude=True)
        else:
            _collect(sentence, out, exclude=False)
    out["exclude_codes"] = sorted(set(out["exclude_codes"]))
    return out
_NUM = r"(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})"
# Tight count-noun binding for the pools conversion: 'Three Electives are
# Required', 'Four courses must be completed', 'Plus five economics
# electives:', 'Three courses from the list'. Loose N_OF_RE is NOT safe here —
# pool prose contains range descriptions ('number between 100 and 189, except
# for the DC courses') whose numbers must never be read as counts.
COUNT_FROM_RE = re.compile(
    rf"\b{_NUM}\s+(?:\w+\s+)?(?:additional\s+)?(?:courses?|electives?)\b"
    rf"|(?:complete|choose|take)\s+(?:at least\s+)?{_NUM}\b"
    rf"|at least\s+{_NUM}\b"
    rf"|{_NUM}\s+(?:or more\s+)?from the following",
    re.IGNORECASE,
)
FROM_LISTS_GATE_RE = re.compile(
    r"from (?:the|either)\b[^.]{0,60}\blists?\b|chosen from|are required|must be completed"
    r"|from the following|of the following",
    re.IGNORECASE,
)
RANGE_RE = re.compile(r"\b([A-Z]{2,5})\s?(\d{1,3})[A-Z]?\s?[-–]\s?(?:[A-Z]{2,5}\s?)?(\d{1,3})\b")

SECTION_KIND_RE = [
    (re.compile(r"disciplinary communication|\bDC\b", re.IGNORECASE), "dc"),
    (re.compile(r"comprehensive|capstone", re.IGNORECASE), "comprehensive"),
    (re.compile(r"lower[- ]division", re.IGNORECASE), "lower_div"),
    (re.compile(r"upper[- ]division", re.IGNORECASE), "upper_div"),
    (re.compile(r"elective|breadth", re.IGNORECASE), "electives"),
    (re.compile(r"concentration|track", re.IGNORECASE), "concentration"),
    (re.compile(r"qualification|declaration", re.IGNORECASE), "qualification"),
    (re.compile(r"screening|transfer", re.IGNORECASE), "screening"),
]


def classify_heading(rule: RawRule) -> tuple[str, int | None] | None:
    """Deterministic classification; None means 'needs the LLM fallback'.

    Priority: heading text first (it is deliberate vocabulary), then the
    leading prose — section-title headings like 'Disciplinary Communication
    (DC) Requirement' carry their operator in prose ('…satisfied by completing
    one of the following courses:').
    """
    heading = rule.heading
    text = heading + " " + " ".join(rule.prose[:2])
    first_sentence = rule.prose[0].split(".")[0] if rule.prose else ""
    if DO_NOT_RE.search(heading) or DO_NOT_RE.search(first_sentence):
        # Exclusion blocks ('these DO NOT satisfy...') outrank all other
        # vocabulary — they must never read as requirements. Scoped to the
        # heading/first sentence so exclusion RIDERS inside membership prose
        # (Film electives) don't demote the whole rule.
        return ("info", None)
    if rule.branches:
        return ("options", None)

    def match_scope(scope: str, is_heading: bool) -> tuple[str, int | None] | None:
        if ONE_OF_RE.search(scope):
            return ("one_of", None)
        if ALL_OF_RE.search(scope):
            return ("all_of", None)
        m = N_OF_RE.search(scope)
        if m:
            n = _n_of_count(m)
            if n == 1 and (rule.courses or rule.branches):
                return ("one_of", None)
            if n == 1 and is_heading:
                # 'Plus one upper-division or graduate elective' with no
                # table: a category pick, not an (unsatisfiable) empty one_of.
                return ("category_count", 1)
            if n and rule.courses:
                if n > len(rule.courses):
                    # The count describes a larger context than this table
                    # ('The core curriculum consists of four courses total:
                    # FILM 120, plus one course from three of the following
                    # groups' — table has just FILM 120). The listed courses
                    # themselves are required.
                    return ("all_of", None)
                return ("n_of", n)
            if n and not rule.courses and is_heading:
                return ("category_count", n)
        return None

    # Heading first (deliberate vocabulary), then the POOL check, then prose.
    # Pools must outrank prose-scope matching: pool prose describes range
    # memberships ('between 100 and 189, except ... courses') whose numbers
    # would otherwise be read as counts (observed: n_of/100).
    r = match_scope(heading, is_heading=True)
    if r is not None:
        return r
    if POOL_RE.search(heading) and rule.courses and not ONE_OF_RE.search(text):
        # A pool-named heading whose PROSE says 'one of the following' is a
        # choice, not a pool (Robotics 'Advanced Robotics Elective').
        return ("list", None)
    r = match_scope(text, is_heading=False)
    if r is not None:
        return r
    if RANGE_RE.search(text) and not rule.courses:
        return ("range", None)
    if RECOMMENDED_RE.search(rule.heading) or (
        rule.prose and RECOMMENDED_RE.search(rule.prose[0])
    ):
        # 'Recommended Course for Transfer Students' etc.: advisory content,
        # never a requirement — display as a note with its courses.
        return ("info", None)
    if len(rule.courses) == 1 and not rule.branches:
        # A single-course table with no operator wording is unambiguous
        # (Math BS DC: 'The DC requirement ... is satisfied by' + [MATH 100]).
        return ("all_of", None)
    if not rule.courses and not rule.branches:
        # Prose-only policy/informational block (GPA thresholds, appeal
        # process, transfer notes). Kept verbatim, never a course rule.
        return ("info", None)
    return None


RECOMMENDED_RE = re.compile(r"recommend|suggested|preparation|optional", re.IGNORECASE)
DO_NOT_RE = re.compile(r"do not (?:satisfy|count)|cannot be (?:used|counted)|may not be used", re.IGNORECASE)


def default_for_section(rule: RawRule, section_kind: str) -> tuple[str, int | None] | None:
    """Division-section fallback: a bare subject-heading table is required.

    SmartCatalog convention (verified on EE/CE/CS pages): inside
    Lower-/Upper-Division blocks, course tables under plain subject headings
    ('Electrical and Computer Engineering', 'Physics') with no operator
    wording list required courses. Never applied to electives/qualification
    sections or recommendation-flavored headings.
    """
    if (
        section_kind in ("lower_div", "upper_div")
        and rule.courses
        and len(rule.courses) <= 12
        and not rule.branches
        and not RECOMMENDED_RE.search(rule.heading)
    ):
        # Bounded: the largest hand-verified required list is EE's 11-course
        # core. A bare heading over a bigger table is almost always a
        # pool/choice (Music ensembles, survey lists) — those must fall
        # through to the LLM/needs_review rather than assert take-everything.
        return ("all_of", None)
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
    model: str | None = DEFAULT_MODEL,
    section_kind: str = "other",
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
        "_hclass": rule.heading_class,  # stripped before output
    }

    text = rule.heading + " " + " ".join(rule.prose)
    det = classify_heading(rule) or default_for_section(rule, section_kind)
    if det is not None:
        node["op"], node["n"] = det
    elif model is None:
        # --no-llm mode: leave unmatched headings honestly unknown. Used for
        # fast iteration on the deterministic layer and in unit tests.
        node["op"], node["n"] = "unknown", None
        node["needs_review"] = True
        llm_stats["fallbacks"] += 1
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
        if op == "all_of" and len(rule.courses) > 12:
            # Same bound as the deterministic default: a small model asserting
            # 'take all 20+' of a bare list is a guess, not a reading.
            op, n = "unknown", None
        node["op"], node["n"] = op, n
        if op == "unknown":
            node["needs_review"] = True
        llm_stats["fallbacks"] += 1

    # Prose-defined memberships ('numbered FILM 100-149, FILM 152-169, ... or
    # from the FILM 194 series. Production studio courses (FILM 150 ... FILM
    # 170A through FILM 179B) may not be used'): fully deterministic. Applies
    # when a countable rule has no explicit course table but its prose carries
    # range spans.
    if (
        (RANGE_RE.search(text) or BETWEEN_RE.search(text))
        and not rule.courses
        and node["op"] in ("range", "category_count", "unknown", None)
    ):
        course_filter = extract_course_filter(text)
        if course_filter["include_ranges"] or course_filter["include_series"]:
            node["op"] = "range"
            node["filter"] = course_filter
            node["needs_review"] = False
            if node["n"] is None:
                n_m = N_OF_RE.search(rule.heading) or N_OF_RE.search(text)
                if n_m:
                    node["n"] = _n_of_count(n_m)
                elif rule.prose:
                    lead = re.match(
                        r"\s*(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b",
                        rule.prose[0], re.IGNORECASE,
                    )
                    if lead:
                        w = lead.group(1).lower()
                        node["n"] = WORD_NUMBERS.get(w) or (int(w) if w.isdigit() else None)

    if (
        rule.courses
        and node.get("filter") is None
        and node["op"] in ("n_of", "list", "one_of", "all_of", "unknown")
        and (RANGE_RE.search(" ".join(rule.prose)) or BETWEEN_RE.search(" ".join(rule.prose)))
        and re.search(r"\bany\b|chosen from|numbered", " ".join(rule.prose), re.IGNORECASE)
    ):
        hybrid = extract_course_filter(" ".join(rule.prose))
        if hybrid["include_ranges"] or hybrid["include_series"]:
            # Union membership: explicit table PLUS prose ranges (CS BS
            # electives). Op unchanged; the planner unions both.
            node["filter"] = hybrid
            if node["op"] == "unknown":
                node["op"], node["needs_review"] = "list", False

    # Constraint riders stay verbatim (auditable; machine-evaluation later).
    for prose in rule.prose:
        if re.search(r"at least|no more than|at most|must (be|come|include)", prose, re.IGNORECASE):
            node["constraints"].append({"type": "prose", "text": prose})

    return node


def build_program(
    seg: SegmentedProgram,
    meta: dict,
    budget: FailureBudget,
    model: str | None = DEFAULT_MODEL,
) -> dict:
    """SegmentedProgram → program record with typed requirements tree."""
    llm_stats = {"calls": 0, "fallbacks": 0}
    sections: list[dict] = []

    for raw_section in seg.sections:
        subsections = _split_by_heading2(raw_section)
        for kind, title, rules, concentration in subsections:
            typed_rules: list[dict] = []
            for rule in rules:
                node = interpret_rule(rule, llm_stats, budget, model=model, section_kind=kind)
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
                            # preserve depth or the section_choice conversion
                            # can't see this node as a child alternative
                            "_hclass": prev.get("_hclass", 0),
                        }
                    typed_rules[-1]["branches"].append(node["courses"])
                    typed_rules[-1]["notes"].extend(node["notes"])
                    continue
                typed_rules.append(node)
            # A count over named pools (CS BS Electives: heading prose 'Four
            # courses must be completed from the list below' + child 'List of
            # B.S. electives:' pool): info rule with a stated count followed
            # by list rules becomes n_of drawing from those lists.
            for i, r in enumerate(typed_rules):
                # Count-carrying parents: intro prose (info), a category count
                # ('Plus five economics electives:'), or a pool whose own
                # prose states the count (Math BS: table directly under
                # 'Electives' + 'Three Electives are Required... chosen from').
                if r["op"] not in ("info", "category_count", "list"):
                    continue
                prose_text = r["source"]["heading"] + " " + " ".join(r["source"]["prose"])
                m = COUNT_FROM_RE.search(prose_text)
                if not m or not FROM_LISTS_GATE_RE.search(prose_text):
                    continue
                word = next((g for g in m.groups() if g), "").lower()
                n = WORD_NUMBERS.get(word) or (int(word) if word.isdigit() else None)
                if not n:
                    continue
                # Following course-bearing rules without their own stated
                # count ARE the lists being drawn from (CS BS 'List of B.S.
                # electives'; EE's per-concentration subject lists).
                converted = False
                for r2 in typed_rules[i + 1:]:
                    if not (r2["courses"] and r2.get("n") is None):
                        continue
                    h2txt = r2["source"]["heading"]
                    # Confident vocabulary-classified requirements are never
                    # stripped into pools ('Complete all of the following'
                    # cores stay required); pool-named/unknown/defaulted
                    # rules are claimable.
                    if r2["op"] in ("all_of", "one_of") and (
                        ALL_OF_RE.search(h2txt) or ONE_OF_RE.search(h2txt)
                    ) and not POOL_RE.search(h2txt):
                        continue
                    if r2["op"] in ("list", "one_of", "unknown", "all_of", "n_of"):
                        r2["op"], r2["needs_review"] = "list", False
                        converted = True
                if converted or r["courses"]:
                    # A self-pool parent (op 'list' with the count in its own
                    # prose) keeps its courses; the planner unions them with
                    # any later lists.
                    r["op"], r["n"] = "n_of", n
                    r["from_following_lists"] = True
                    r["needs_review"] = False
                    break  # one count parent per subsection is the pattern

            # 'N course(s) from EACH of the following groups/categories/areas'
            # parents (Film BA groups, GCH context areas, DC categories): the
            # contiguous deeper-level children each become an N-of pick; the
            # parent becomes a total count over the union when it states one
            # larger than the child count ('Six electives ... one from each of
            # the four areas plus two more'), else a plain note.
            for i, r in enumerate(typed_rules):
                ptext = r["source"]["heading"] + " " + " ".join(r["source"]["prose"])
                em = EACH_OF_RE.search(ptext)
                if not em or r["courses"] or r["branches"]:
                    continue
                n_each = WORD_NUMBERS.get(em.group(1).lower()) or (
                    int(em.group(1)) if em.group(1).isdigit() else None
                )
                children = []
                for r2 in typed_rules[i + 1:]:
                    if r2.get("_hclass", 0) <= r.get("_hclass", 0):
                        break
                    if r2["courses"] and r2["op"] != "options":
                        children.append(r2)
                if not children or not n_each:
                    continue
                for child in children:
                    child["op"] = "one_of" if n_each == 1 else "n_of"
                    child["n"] = None if n_each == 1 else n_each
                    child["needs_review"] = False
                total_m = N_OF_RE.search(r["source"]["heading"])
                total = _n_of_count(total_m) if total_m else None
                if total and total > len(children):
                    r["op"], r["n"] = "n_of", total
                    r["pool"] = sorted({c for ch in children for c in ch["courses"]})
                    r["needs_review"] = False
                else:
                    r["op"], r["n"] = "info", None
                    r["needs_review"] = False

            # 'one course from N of the following M groups': pick N distinct
            # groups, one course from each. Children become display pools;
            # the parent carries branches and the count.
            for i, r in enumerate(typed_rules):
                ptext = r["source"]["heading"] + " " + " ".join(r["source"]["prose"])
                pm = PICK_GROUPS_RE.search(ptext)
                if not pm or r["courses"] or r["branches"]:
                    continue
                n_groups = WORD_NUMBERS.get(pm.group(1).lower()) or (
                    int(pm.group(1)) if pm.group(1).isdigit() else None
                )
                children = []
                for r2 in typed_rules[i + 1:]:
                    if r2.get("_hclass", 0) <= r.get("_hclass", 0):
                        break
                    if r2["courses"]:
                        children.append(r2)
                if not children or not n_groups:
                    continue
                r["op"], r["n"] = "n_of_groups", n_groups
                r["branches"] = [list(ch["courses"]) for ch in children]
                r["needs_review"] = False
                for ch in children:
                    ch["op"], ch["n"] = "list", None
                    ch["needs_review"] = False

            # A grouping header stated as a count whose children enumerate the
            # actual picks ('Two courses to satisfy the senior comprehensive
            # requirement:' + [FILM 199, one of 195/196/197]) is a note — the
            # children carry the evaluable semantics.
            for i, r in enumerate(typed_rules):
                if r["op"] != "category_count":
                    continue
                has_children = any(
                    r2.get("_hclass", 0) > r.get("_hclass", 0) and r2["courses"]
                    for r2 in typed_rules[i + 1:]
                )
                if has_children:
                    r["op"], r["n"] = "info", None
                    r["needs_review"] = False

            # A choice among named sub-blocks (CS BS Comprehensive: prose
            # "one of the following" with 'Capstone Courses' / 'Senior
            # Thesis' sub-headings): an empty one_of followed by deeper-class
            # rules becomes section_choice — satisfied when ANY following
            # rule in the subsection is satisfied.
            for i, r in enumerate(typed_rules):
                if (
                    r["op"] == "one_of"
                    and not r["courses"]
                    and not r["branches"]
                    and any(
                        r2.get("_hclass", 0) > r.get("_hclass", 0)
                        for r2 in typed_rules[i + 1:]
                    )
                ):
                    r["op"] = "section_choice"

            # Countable rules that ended up with nothing to count (a section
            # intro classified all_of by its prose, an empty unknown) are
            # display noise as requirements — demote to info; prose stays.
            # Runs AFTER section_choice so empty choice parents survive.
            for r in typed_rules:
                if (
                    r["op"] in ("all_of", "one_of", "n_of", "unknown")
                    and not r["courses"]
                    and not r["branches"]
                    and not r.get("from_following_lists")
                    and not r.get("pool")
                ):
                    r["op"], r["n"] = "info", None
                    r["needs_review"] = False

            for r in typed_rules:
                r.pop("_sibling_or", None)
                r.pop("_hclass", None)
            if typed_rules:
                conc = concentration
                if (
                    conc is None
                    and kind == "concentration"
                    and re.search(r"concentration", title, re.IGNORECASE)
                    and not re.search(r"all concentrations", title, re.IGNORECASE)
                ):
                    conc = title  # 'Computer Systems Concentration Requirements'
                sections.append(
                    {
                        "kind": kind,
                        "title": title,
                        "concentration": conc,
                        "rules": typed_rules,
                    }
                )

    return {
        **meta,
        "requirements": {"sections": sections, "info_sections": seg.info_sections},
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
        if rule.heading_class == 2 and not OR_SIBLING_RE.match(rule.heading):
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
