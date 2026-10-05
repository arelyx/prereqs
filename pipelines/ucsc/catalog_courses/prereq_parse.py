"""Deterministic prerequisite parser (the "hot path").

Turns a course's catalog `raw_requirements` prose into CNF prerequisite
groups (outer list AND, inner list OR) with no model inference. It replaces
the qwen3:4b structuring step; the semantics follow that prompt's rules
(and/";" separate, "or" joins, "; or" runs are one OR group, non-course
requirements and "recommended"/"e.g." courses are excluded, antirequisites
ignored, inline "previous or concurrent enrollment" kept as a group).

One deliberate difference: a mixed expression is converted to CNF by real
boolean distribution, so "CSE 30, or CSE 15 and CSE 15L" becomes
[[CSE30, CSE15], [CSE30, CSE15L]] (CSE 30 alone satisfies it), where the
prompt's few-shot example flattened it to [[CSE30, CSE15], [CSE15L]].

When the precedence of a text is unclear, the parser does not guess: it
returns confidence="ambiguous" with a reason, and the text is resolved by
hand in prereq_overrides.json (the "warm path", keyed by the text's sha1).

Pipeline:
  1. normalize text, split into sentences, classify each sentence
     (prereq / coreq / antireq / recommended / restriction / advisory).
  2. tokenize prereq clauses: course codes (with subject carry-over for
     "MATH 19A, 19B"), connectors (; , and or /), brackets, "either"/
     "one of" openers, concurrency markers, filler words.
  3. recursive descent with explicit precedence:
     ";" (loosest)  >  ","-lists  >  and  >  or  >  "/" (tightest).
  4. prune non-course atoms (permission, standing, placement, ELWR),
     distribute to CNF, apply coreq/concurrent flags.
"""

from __future__ import annotations

import hashlib
import itertools
import re
from dataclasses import dataclass, field

PARSER_VERSION = "prereq_parse_v1"

CERTAIN = "certain"
AMBIGUOUS = "ambiguous"

# Subjects that appear in current/recent UCSC catalog text. Used only when the
# caller gives no known_codes; with known_codes the subject set is derived.
_FALLBACK_SUBJECTS = frozenset(
    "AM AMS ANCS ANTH APLX ARBC ART ARTG ASTR BIOC BIOE BIOL BME CHEM CHIN CLNI "
    "CLST CMMU CMPE CMPM CMPS COWL CRES CRSN CRWN CSE CSP CT DANM EART ECE ECON "
    "EDUC EE ENVS ESCI FIL FILM FMST FREN GAME GCH GIST GRAD GREE HAVC HCI HEBR "
    "HIS HISC HTEC ITAL JAPN JRLC JWST KRSG LAAD LALS LATN LGST LING LIT MATH "
    "MERR METX MSE MUSC NLP OAKS OCEA PBS PHIL PHYE PHYS POLI PORT PRTR PSYC "
    "PUNJ SCIC SOCD SOCY SPAN SPHS STAT STEV THEA TIM UCDC VAST WRIT YIDD".split()
)
# Uppercase tokens that look like subjects but are not.
_NOT_SUBJECTS = frozenset({"MPE", "GPA", "AP", "IB", "SAT", "ACT", "AWPE", "MLS", "ELWR", "TOEFL", "GRE", "PDF"})

_MAX_CNF_CLAUSES = 48


@dataclass
class ParseResult:
    groups: list[list[str]] | None  # CNF; None = no course prerequisites
    coreqs: list[list[str]] = field(default_factory=list)  # CNF of strictly-concurrent courses
    concurrent_ok: list[str] = field(default_factory=list)  # codes in groups that may be taken same term
    confidence: str = CERTAIN
    reason: str | None = None
    restrictions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "groups": self.groups,
            "coreqs": self.coreqs,
            "concurrent_ok": self.concurrent_ok,
            "confidence": self.confidence,
            "reason": self.reason,
            "restrictions": self.restrictions,
        }


class Ambiguous(Exception):
    """Raised inside the parser when precedence/meaning is unclear."""


def normalize_text(raw: str | None) -> str:
    """Whitespace-insensitive form used for override hashing: the catalog
    re-renders 'CSE 12 .' vs 'CSE 12.' between scrapes without any change
    in meaning, and that must not make an override stale."""
    s = re.sub(r"\s+", " ", (raw or "").replace("\u00a0", " ")).strip()
    return re.sub(r"\s+([,.;:)\]])", r"\1", s)


def raw_sha1(raw: str | None) -> str:
    """sha1 of the whitespace-normalized requirement text (see normalize_text)."""
    return hashlib.sha1(normalize_text(raw).encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------
# Sentence-level classification
# --------------------------------------------------------------------------

_ABBREV_RE = re.compile(
    r"\b(e\.g|i\.e|ph\.d|m\.a|m\.s|m\.f\.a|b\.a|b\.s|b\.f\.a|u\.s|etc|vs|st|dr|no|approx)\.",
    re.IGNORECASE,
)
_SENT_SPLIT_RE = re.compile(r"\s*\.(?:\s+|$)")

_PREREQ_LABEL_RE = re.compile(
    r"^\W*(?:requirements\s+)?(?:prerequisites?(?:\s*\(s\))?|prereqs?(?:\s*\(s\))?)\s*:\s*",
    re.IGNORECASE,
)
_COREQ_LABEL_RE = re.compile(
    r"^\W*(?:requirements\s+)?(?:co-?requisites?(?:\s*\(s\))?|co-?reqs?(?:\s*\(s\))?)\s*:\s*",
    re.IGNORECASE,
)
_ANTIREQ_RE = re.compile(
    r"antirequisite|cannot\s+(?:enroll|receive|take|be\s+taken)|may\s+not\s+(?:enroll|receive|take|be\s+taken)"
    r"|should\s+not\s+(?:take|enroll)|not\s+open\s+to\s+students\s+who|will\s+not\s+receive\s+credit"
    r"|no\s+credit\s+(?:for|will)|not\s+allowed\s+to\s+(?:enroll|take)",
    re.IGNORECASE,
)
_RECOMMEND_RE = re.compile(
    r"recommend|encourag|suggest|helpful|preferred|preferable|advis|benefit\s+from|desirable|useful|not\s+required",
    re.IGNORECASE,
)
_ADVISORY_RE = re.compile(
    r"may\s+enroll|permission|consent|expected\s+to|assumed\s+to|should\s+have|knowledge\s+of"
    r"|background|familiar|\bsee\b|experience|contact\s+the|application|inquire|similar\s+to|waived"
    r"|in\s+conjunction\s+with|requirements\s+for\s+the|need\s+(?:to\s+have|at\s+least)",
    re.IGNORECASE,
)
_RESTRICT_START_RE = re.compile(
    r"^\W*(?:enrollment\s+(?:is\s+)?(?:restricted|limited)|course\s+(?:is\s+)?restricted|restricted\s+to|open\s+(?:only\s+)?to|limited\s+to)",
    re.IGNORECASE,
)
_COMPLETION_TRIGGER_RE = re.compile(
    r"(?:previous|prior)\s+enrollment\s+in|(?:successful\s+)?completion\s+of|(?:who\s+have|having)\s+(?:completed|taken|passed)",
    re.IGNORECASE,
)
_STRICT_COREQ_SENT_RE = re.compile(
    r"concurrent(?:ly)?\s+enroll|taken\s+concurrently\s+with|must\s+be\s+taken\s+concurrently",
    re.IGNORECASE,
)
_PREV_OR_CONC_RE = re.compile(
    r"(?:(?:previous|prior|completion\s+of|completed)\s+or\s+concurrent(?:ly)?|concurrent\s+or\s+(?:previous|prior))"
    r"(?:\s+(?:enrollment|enrolled)\s+in)?",
    re.IGNORECASE,
)
_PREVIOUS_ENROLL_START_RE = re.compile(
    r"^\W*(?:previous|prior)(?:\s+or\s+concurrent)?\s+enrollment\s+in", re.IGNORECASE
)


def _split_sentences(text: str) -> list[str]:
    protected = _ABBREV_RE.sub(lambda m: m.group(0).replace(".", "\x00"), text)
    parts = _SENT_SPLIT_RE.split(protected)
    return [p.replace("\x00", ".").strip() for p in parts if p and p.strip(" .")]


# --------------------------------------------------------------------------
# Tokenizer
# --------------------------------------------------------------------------

@dataclass
class Tok:
    kind: str  # CODE UNKNOWN WORD NUM CONN LP RP OPEN KOFn EG CONC COREQ
    text: str
    code: str | None = None
    conc: bool = False
    coreq: bool = False


_NUMBER_WORDS = {"two": 2, "three": 3, "four": 4, "2": 2, "3": 3, "4": 4}

_PHRASE_SUBS: list[tuple[re.Pattern, object]] = [
    (re.compile(r"\band\s*/\s*or\b", re.I), " or "),
    (re.compile(r"&"), " and "),
    (re.compile(r"\bplus\b", re.I), " and "),
    # grade / score qualifiers whose internal "or" is not a connector
    (re.compile(r"['\"‘’“”]*\b[A-DF][+-]?['\"‘’“”]*\s+or\s+(?:better|higher|above)\b", re.I), " gradequalifier "),
    (re.compile(r"\b([A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2})\s+or\s+higher(?:-numbered)?\b(?!\s+on)", re.I), r"\1 "),
    (re.compile(r"\b([A-Z]{2,5})\s*/\s*([A-Z]{2,5})\s*(\d{1,3}[A-Z]{0,2})\b"), r"\1 \3 / \2 \3"),
    (re.compile(r"\b([A-Za-z]{2,5}\s*(\d{1,3}[A-Z]?))\s*/\s*L\b"), r"\1 / \2L"),
    (re.compile(r"\b(\d+)\s+or\s+(?:better|higher|above|greater|more)(?:\s+or\s+higher)?\b", re.I), r" \1_orhigher "),
    (re.compile(r"\bor\s+(?:better|higher|above)\b", re.I), " "),
    (_PREV_OR_CONC_RE, " \x01CONC\x01 "),
    (re.compile(r"\b(?:must\s+be\s+)?taken\s+concurrently\s+with\b|\bconcurrent(?:ly)?\s+enroll(?:ment|ed)?\s+in\b|\bmust\s+concurrently\s+enroll\s+in\b", re.I), " \x01COREQ\x01 "),
    (re.compile(r"\be\.g\.,?|\bi\.e\.,?|\bsuch\s+as\b|\bfor\s+example\b", re.I), " \x01EG\x01 "),
    # "two courses from: A, B, C" / "three of the following" -> k-of-n group
    (re.compile(
        r"\b(two|three|four|2|3|4)\s+(?:(?:of\s+the\s+following)|(?:(?:[\w/-]+\s+){0,5}?(?:from|chosen\s+from)))"
        r"(?:\s+the\s+following)?(?:\s+courses)?\s*:?", re.I),
        lambda m: f" \x01KOF{_NUMBER_WORDS[m.group(1).lower()]}\x01 "),
    (re.compile(r"\b(?:either|one\s+course\s+from|one\s+from|one\s+of\s+the\s+following(?:\s+(?:courses|series))?|one\s+of)\b\s*:?", re.I), " \x01OPEN\x01 "),
    (re.compile(r"\bboth\b", re.I), " "),
    (re.compile(r":"), " "),
]

_TOKEN_RE = re.compile(
    r"\x01(?P<marker>CONC|COREQ|EG|OPEN|KOF\d)\x01"
    r"|(?P<code>\b[A-Za-z]{2,5}\s*\d{1,3}[A-Za-z]{0,2}\b)"
    r"|(?P<num>\b\d{1,3}[A-Z]{0,2}\b(?!_))"
    r"|(?P<conn>;|,|/|\band\b|\bor\b)"
    r"|(?P<lp>[(\[])|(?P<rp>[)\]])"
    r"|(?P<word>[^\s;,/()\[\]\x01]+)",
    re.IGNORECASE,
)
_CODE_SPLIT_RE = re.compile(r"^([A-Za-z]{2,5})\s*(\d{1,3}[A-Za-z]{0,2})$")


_SUBJECT_CACHE: dict[int, tuple[object, frozenset, int]] = {}


def _subjects_from(known_codes: set[str] | None) -> frozenset:
    if not known_codes:
        return _FALLBACK_SUBJECTS
    hit = _SUBJECT_CACHE.get(id(known_codes))
    if hit is not None and hit[0] is known_codes and len(hit[1]) and len(known_codes) == hit[2]:
        return hit[1]
    subs = frozenset(m.group(0) for c in known_codes if (m := re.match(r"^[A-Z]+", c))) | _FALLBACK_SUBJECTS
    _SUBJECT_CACHE.clear()
    _SUBJECT_CACHE[id(known_codes)] = (known_codes, subs, len(known_codes))
    return subs


def _as_code(text: str, subjects: set[str]) -> str | None:
    m = _CODE_SPLIT_RE.match(text)
    if not m:
        return None
    subj, num = m.group(1), m.group(2)
    up = subj.upper()
    if up in _NOT_SUBJECTS:
        return None
    if up in subjects:
        return up + num.upper()  # lowercase suffix allowed ("ANTH 161s")
    if subj.isupper() and up not in {"OR", "AND", "OF", "TO", "IN"}:
        return "?" + up + num.upper()  # code-shaped, unknown subject
    return None


def _tokenize(text: str, subjects: set[str]) -> list[Tok]:
    for pat, rep in _PHRASE_SUBS:
        text = pat.sub(rep, text)
    raw: list[Tok] = []
    for m in _TOKEN_RE.finditer(text):
        if m.group("marker"):
            raw.append(Tok(m.group("marker"), m.group(0)))
        elif m.group("code"):
            code = _as_code(m.group("code"), subjects)
            if code and code.startswith("?"):
                raw.append(Tok("UNKNOWN", m.group("code"), code=code[1:]))
            elif code:
                raw.append(Tok("CODE", m.group("code"), code=code))
            else:
                # not a subject ("or 20", "of 300"): re-emit the pieces
                cm = _CODE_SPLIT_RE.match(m.group("code"))
                word, num = cm.group(1), cm.group(2)
                if word.lower() in ("and", "or"):
                    raw.append(Tok("CONN", word.lower()))
                else:
                    raw.append(Tok("WORD", word))
                if re.fullmatch(r"\d{1,3}[A-Z]{0,2}", num):
                    raw.append(Tok("NUM", num))
                else:
                    raw.append(Tok("WORD", num))
        elif m.group("num"):
            raw.append(Tok("NUM", m.group("num")))
        elif m.group("conn"):
            raw.append(Tok("CONN", m.group("conn").lower()))
        elif m.group("lp"):
            raw.append(Tok("LP", m.group("lp")))
        elif m.group("rp"):
            raw.append(Tok("RP", m.group("rp")))
        else:
            raw.append(Tok("WORD", m.group("word")))

    # Subject carry-over: "MATH 11A , 19A or 20A" -> MATH19A, MATH20A.
    # A bare number becomes a code only when it directly follows a connector
    # whose previous non-connector token is a code, and is itself followed by
    # a connector / bracket / end (so "CSE 12 and 2 upper-division courses"
    # and "score of 4 or 5" never carry).
    out: list[Tok] = []
    for i, t in enumerate(raw):
        if t.kind == "NUM":
            prev_conn = bool(out) and out[-1].kind == "CONN" and out[-1].text != ";"
            prev_code = None
            if prev_conn:
                j = len(out) - 1
                while j >= 0 and out[j].kind == "CONN" and out[j].text != ";":
                    j -= 1
                if j >= 0 and out[j].kind == "CODE":
                    prev_code = out[j].code
            nxt = raw[i + 1] if i + 1 < len(raw) else None
            next_ok = nxt is None or nxt.kind in ("CONN", "RP")
            if prev_code and next_ok:
                subj = re.match(r"^[A-Z]+", prev_code).group(0)
                out.append(Tok("CODE", t.text, code=subj + t.text.upper()))
                continue
            out.append(Tok("WORD", t.text))
            continue
        out.append(t)

    # Concurrency markers flag the codes after them until the end of the
    # enclosing ";"-segment / bracket.
    depth = 0
    active: list[tuple[str, int]] = []
    for t in out:
        if t.kind == "LP":
            depth += 1
        elif t.kind == "RP":
            depth -= 1
            active = [(k, d) for k, d in active if d <= depth]
        elif t.kind == "CONN" and t.text == ";":
            active = [(k, d) for k, d in active if d < depth]
        elif t.kind in ("CONC", "COREQ"):
            active.append((t.kind, depth))
        elif t.kind == "CODE":
            kinds = {k for k, _ in active}
            t.conc = "CONC" in kinds
            t.coreq = "COREQ" in kinds and not t.conc
    return [t for t in out if t.kind not in ("CONC", "COREQ")]


# --------------------------------------------------------------------------
# Expression tree
# --------------------------------------------------------------------------
# Node: ("code", Tok) | ("and", [nodes]) | ("or", [nodes]); None = no course
# content (a non-course atom, pruned).

_QUANTIFIER_RE = re.compile(
    r"^(?:two|three|four|five|six|any|all|2|3|4|series|additional|upper-division|lower-division|"
    r"several|another|other)$",
    re.IGNORECASE,
)


class _Parser:
    def __init__(self, restrictions: list[str]):
        self.restrictions = restrictions

    # -- grouping -------------------------------------------------------
    def group(self, toks: list[Tok]) -> list:
        """Nest brackets and OPEN (either/one of) into sub-lists.

        Items are Tok or ("paren", items) / ("open", items)."""
        pos = 0

        def parse_seq(stop_rp: bool) -> list:
            nonlocal pos
            items: list = []
            while pos < len(toks):
                t = toks[pos]
                if t.kind == "LP":
                    pos += 1
                    inner = parse_seq(True)
                    items.append(("paren", inner))
                elif t.kind == "RP":
                    if stop_rp:
                        pos += 1
                        return items
                    raise Ambiguous("unbalanced closing bracket")
                elif t.kind == "OPEN" or t.kind.startswith("KOF"):
                    pos += 1
                    inner = parse_open()
                    items.append(("open" if t.kind == "OPEN" else t.kind.lower(), inner))
                else:
                    items.append(t)
                    pos += 1
            if stop_rp:
                raise Ambiguous("unbalanced opening bracket")
            return items

        def parse_open() -> list:
            # an either/one-of group runs to the end of the ";"-segment or the
            # enclosing bracket.
            nonlocal pos
            items: list = []
            while pos < len(toks):
                t = toks[pos]
                if t.kind == "CONN" and t.text == ";":
                    return items
                if t.kind == "RP":
                    return items
                if t.kind == "LP":
                    pos += 1
                    items.append(("paren", parse_seq(True)))
                    continue
                if t.kind == "OPEN" or t.kind.startswith("KOF"):
                    pos += 1
                    items.append(("open" if t.kind == "OPEN" else t.kind.lower(), parse_open()))
                    continue
                items.append(t)
                pos += 1
            return items

        return parse_seq(False)

    # -- levels ---------------------------------------------------------
    def expr(self, items: list, in_open: bool = False):
        segs = _split(items, ";")
        parsed: list[tuple[str | None, object]] = []
        for seg in segs:
            lead, body = _lead(seg)
            if _segment_is_dropped(body, self.restrictions):
                continue
            node = self.comma_list(body, in_open)
            parsed.append((lead, node))
        if not parsed:
            return None
        # drop non-course ";"-segments; an or-led one is a dropped alternative
        kept = [(l, n) for l, n in parsed if n is not None]
        if not kept:
            return None
        leads = {l for l, _ in kept[1:]}
        if len(kept) == 1:
            return kept[0][1]
        if leads <= {None, "and"}:
            return ("and", [n for _, n in kept])
        if leads == {"or"}:
            return ("or", [n for _, n in kept])
        if leads == {None, "or"} and in_open:
            return ("or", [n for _, n in kept])
        # mixed "; and" / "; or" or bare ";" mixed with "; or"
        if leads == {"and", "or"} or leads == {None, "and", "or"}:
            raise Ambiguous("mixed '; and' and '; or' segments")
        raise Ambiguous("';'-list mixes bare ';' with '; or'")

    def comma_list(self, items: list, in_open: bool):
        parts = _split(items, ",")
        entries: list[tuple[str | None, list]] = []
        for i, part in enumerate(parts):
            lead, body = _lead(part)
            entries.append((lead, body))
        # Strip trailing ", or <non-course>" alternatives (", or by permission").
        evaluated = [(lead, self.chain(body), body) for lead, body in entries]
        stripped_or = False
        while len(evaluated) > 1 and evaluated[-1][1] is None and evaluated[-1][0] == "or":
            self.restrictions.append(_text(evaluated[-1][2]))
            evaluated.pop()
            stripped_or = True
        if len(evaluated) == 1:
            return evaluated[0][1]
        kept = [(i, lead, node) for i, (lead, node, _) in enumerate(evaluated) if node is not None]
        if not kept:
            return None
        if len(kept) == 1:
            return kept[0][2]
        explicit_kept = {lead for i, lead, _ in kept if i > 0 and lead is not None}
        explicit_all = {lead for lead, _, _ in evaluated[1:] if lead is not None}
        if in_open:
            # "one of the following: A, B, and C" still means one of them
            if explicit_kept == {"and", "or"}:
                raise Ambiguous("either/one-of list mixes ', and' and ', or'")
            conn = "or"
        elif len(explicit_kept) > 1:
            raise Ambiguous("comma list mixes ', and' and ', or'")
        elif explicit_kept:
            conn = next(iter(explicit_kept))
        elif len(explicit_all) == 1:
            conn = next(iter(explicit_all))  # "A, B, and satisfaction of ELWR"
        elif stripped_or:
            conn = "or"  # "A, B, or equivalent"
        else:
            # "A, B, C or D" (no serial comma) takes the last part's
            # connector; a bare "A, B, C" is a conjunction.
            last_body = evaluated[-1][2]
            inner = {t.text for t in last_body if isinstance(t, Tok) and t.kind == "CONN" and t.text in ("and", "or")}
            if len(inner) > 1:
                raise Ambiguous("comma list without a clear connector")
            conn = next(iter(inner)) if inner else "and"
        # In an OR list, a non-leading part with an inner "and" and no
        # explicit connector ("A, B and C, or D") is unclear: the commas may
        # be an AND list. Inner-"or" parts in an AND list are normal
        # ("MATH 22 or MATH 23A, PHYS 5B or PHYS 6B, and PHYS 102").
        for i, lead, node in kept:
            if i == 0 or lead is not None:
                continue
            if conn == "or" and isinstance(node, tuple) and node[0] == "and" and i != len(evaluated) - 1:
                raise Ambiguous("comma list part with conflicting inner connector")
        return (conn, [node for _, _, node in kept])

    def chain(self, items: list):
        """and/or/slash chain without commas or semicolons."""
        if not items:
            return None
        # split into units on connectors
        units: list[list] = [[]]
        conns: list[str] = []
        for it in items:
            if isinstance(it, Tok) and it.kind == "CONN":
                conns.append(it.text)
                units.append([])
            else:
                units[-1].append(it)
        nodes = [self.unit(u) for u in units]
        # record maximal runs of non-course units as one restriction
        # ("Entry Level Writing and Composition requirements")
        run: list = []
        for i, (u, n) in enumerate(zip(units, nodes)):
            if n is None and u:
                if run and i > 0:
                    run.append(Tok("CONN", conns[i - 1]))
                run.extend(u)
            elif run:
                self.restrictions.append(_text(run))
                run = []
        if run:
            self.restrictions.append(_text(run))
        grouped = [any(isinstance(it, tuple) for it in u) for u in units]  # bracket / either unit
        only_or = set(conns) <= {"or", "/"}
        # "/" binds tightest, then lab pairs ("X and XL"), then "or", then "and"
        seq: list[tuple[str | None, object, bool]] = [(None, nodes[0], grouped[0])]
        for c, n, g in zip(conns, nodes[1:], grouped[1:]):
            prev_c, prev_n, prev_g = seq[-1]
            if c == "/":
                seq[-1] = (prev_c, _slash(prev_n, n, allow_or=only_or), prev_g)
            elif c == "and" and _is_lab_pair(prev_n, n):
                # "CSE 15 and CSE 15L" is one unit: "CSE 15 and CSE 15L or CSE 30"
                seq[-1] = (prev_c, ("and", [prev_n, n]), prev_g)
            else:
                seq.append((c, n, g))
        # prune non-course atoms
        kept = [(c, n, g) for c, n, g in seq if n is not None]
        if not kept:
            return None
        kept[0] = (None, kept[0][1], kept[0][2])
        cs = [c for c, _, _ in kept[1:]]
        if "or" in cs and "and" in cs:
            # The prompt's rule reads "A and B or C" as A AND (B OR C), but
            # the catalog uses it both ways ("BIOC 100A and 100B or BIOL 100"
            # means (100A AND 100B) OR BIOL 100), so an and/or mix without
            # punctuation is left for a human -- unless every "and" introduces
            # a bracketed / either-group ("MATH 21 or AM 10 and either MATH 100
            # or CSE 101").
            if not all(g for c, _, g in kept[1:] if c == "and"):
                raise Ambiguous("and/or mixed without commas")
            # an "or" after an and-introduced group would be unclear too
            seen_and = False
            for c, _, _ in kept[1:]:
                if c == "and":
                    seen_and = True
                elif c == "or" and seen_and:
                    raise Ambiguous("and/or mixed without commas")
        kept = [(c, n) for c, n, _ in kept]
        runs: list[list] = [[kept[0][1]]]
        for c, n in kept[1:]:
            if c == "or":
                runs[-1].append(n)
            else:
                runs.append([n])
        run_nodes = [r[0] if len(r) == 1 else ("or", r) for r in runs]
        return run_nodes[0] if len(run_nodes) == 1 else ("and", run_nodes)

    def unit(self, items: list):
        codes = [it for it in items if isinstance(it, Tok) and it.kind == "CODE"]
        subs = [it for it in items if isinstance(it, tuple)]
        words = [it.text for it in items if isinstance(it, Tok) and it.kind == "WORD"]
        has_eg = any(isinstance(it, Tok) and it.kind == "EG" for it in items)
        if has_eg:
            # "e.g. X" outside brackets: the example(s) are not required
            idx = next(i for i, it in enumerate(items) if isinstance(it, Tok) and it.kind == "EG")
            items = items[:idx]
            codes = [it for it in items if isinstance(it, Tok) and it.kind == "CODE"]
            subs = [it for it in items if isinstance(it, tuple)]
            words = [it.text for it in items if isinstance(it, Tok) and it.kind == "WORD"]
        for it in items:
            if isinstance(it, Tok) and it.kind == "UNKNOWN":
                raise Ambiguous(f"unknown subject in code-like token '{it.text}'")
        sub_nodes = []
        for kind, inner in subs:
            if kind == "paren" and _paren_is_aside(inner):
                continue
            n = self.expr(inner, in_open=(kind != "paren"))
            if kind.startswith("kof"):
                _check_k_of_n_members(inner)
            if n is not None and kind.startswith("kof"):
                n = _k_of_n(int(kind[3:]), n)
            if n is not None:
                sub_nodes.append(n)
        # bare "course 100" references to an unnamed subject
        for a, b in zip(items, items[1:]):
            if (
                isinstance(a, Tok) and a.kind == "WORD" and re.fullmatch(r"courses?", a.text, re.I)
                and isinstance(b, Tok) and b.kind == "WORD" and re.fullmatch(r"\d{1,3}[A-Z]{0,2}", b.text)
            ):
                raise Ambiguous(f"subject-less course reference '{a.text} {b.text}'")
        for w in words:
            if re.fullmatch(r"\d{1,3}[A-Z]{1,2}", w):
                raise Ambiguous(f"subject-less course number '{w}'")
        if codes and any(_QUANTIFIER_RE.match(w) for w in words):
            raise Ambiguous("quantified course requirement: " + _text(items)[:80])
        if not codes and sub_nodes and any(_QUANTIFIER_RE.match(w) for w in words):
            raise Ambiguous("quantified course requirement: " + _text(items)[:80])
        leaves = [("code", c) for c in codes] + sub_nodes
        if not leaves:
            return None  # chain() records the text as a restriction
        if len(leaves) > 1:
            raise Ambiguous("adjacent course references without connector: " + _text(items)[:80])
        return leaves[0]


def _split(items: list, sep: str) -> list[list]:
    out: list[list] = [[]]
    for it in items:
        if isinstance(it, Tok) and it.kind == "CONN" and it.text == sep:
            out.append([])
        else:
            out[-1].append(it)
    return [o for o in out if o]


def _lead(items: list) -> tuple[str | None, list]:
    if items and isinstance(items[0], Tok) and items[0].kind == "CONN" and items[0].text in ("and", "or"):
        return items[0].text, items[1:]
    return None, items


def _flat_tokens(items: list, skip_parens: bool = False) -> list[Tok]:
    out: list[Tok] = []
    for it in items:
        if isinstance(it, Tok):
            out.append(it)
        elif not (skip_parens and it[0] == "paren"):
            out.extend(_flat_tokens(it[1], skip_parens))
    return out


def _text(items: list) -> str:
    parts = []
    for t in _flat_tokens(items):
        if t.kind in ("WORD", "CODE", "CONN", "UNKNOWN"):
            parts.append(t.text)
    s = " ".join(parts).replace(" ,", ",").strip(" ,;")
    s = s.replace("gradequalifier", "<grade> or better").replace("_orhigher", " or higher")
    return s


def _paren_is_aside(inner: list) -> bool:
    toks = _flat_tokens(inner)
    if any(t.kind == "EG" for t in toks):
        return True
    words = " ".join(t.text for t in toks if t.kind == "WORD").lower()
    return bool(re.search(r"formerly|recommend|preferred|strongly|suggest|see\b", words))


def _segment_is_dropped(items: list, restrictions: list[str]) -> bool:
    toks = _flat_tokens(items)
    # bracketed asides ("(strongly preferred)") don't make the segment optional
    text = " ".join(t.text for t in _flat_tokens(items, skip_parens=True))
    has_code = any(t.kind == "CODE" for t in toks)
    if _ANTIREQ_RE.search(text):
        return True
    if _RECOMMEND_RE.search(text) and has_code:
        comma_parts_with_codes = sum(
            1 for p in _split(items, ",") if any(t.kind == "CODE" for t in _flat_tokens(p))
        )
        if comma_parts_with_codes > 1:
            # "X, Y, and Z recommended (as preparation)": the whole list is
            # recommended when the word sits in the last part.
            last = " ".join(t.text for t in _flat_tokens(_split(items, ",")[-1]))
            if not _RECOMMEND_RE.search(last):
                raise Ambiguous("'recommended' inside a multi-part list")
        return True
    return False


# --------------------------------------------------------------------------
# CNF
# --------------------------------------------------------------------------

def _split_code(code: str) -> tuple[str, str]:
    m = re.match(r"^([A-Z]+)(\d+)([A-Z]*)$", code)
    return (m.group(1), m.group(2) + "|" + m.group(3)) if m else (code, "")


def _is_lab_pair(a, b) -> bool:
    """CSE15 + CSE15L, PHYS6A + PHYS6L, PHYS5A + PHYS5L."""
    if not (isinstance(a, tuple) and isinstance(b, tuple) and a[0] == b[0] == "code"):
        return False
    sa, ra = _split_code(a[1].code)
    sb, rb = _split_code(b[1].code)
    na, la = ra.split("|")
    nb, lb = rb.split("|")
    return sa == sb and na == nb and lb.endswith("L") and not la.endswith("L")


def _slash(a, b, allow_or: bool = False):
    """'X / Y': a lecture/lab pair means both; cross-listed codes (same
    number, different subject) mean either; anything else is unclear."""
    if a is None or b is None:
        return _combine("or", a, b)
    if _is_lab_pair(a, b):
        return ("and", [a, b])
    if a[0] == b[0] == "code":
        sa, ra = _split_code(a[1].code)
        sb, rb = _split_code(b[1].code)
        if sa != sb and ra == rb:
            return ("or", [a, b])
    if allow_or:
        return ("or", [a, b])  # "FILM 132C/ FILM 165G or FILM 134A": alternatives
    raise Ambiguous("'/' between courses that are neither a lab pair nor cross-listed")


def _check_k_of_n_members(inner: list) -> None:
    """Every listed member of a k-of-n must be a course; a pruned
    non-course member ("logic design (...)") would change the count."""
    flat = _flat_tokens(inner)
    if any(t.kind == "EG" for t in flat):
        raise Ambiguous("k-of-n list given by example")
    members: list[list] = [[]]
    for it in inner:
        if isinstance(it, Tok) and it.kind == "CONN" and it.text in (",", "and", "or", ";"):
            members.append([])
        else:
            members[-1].append(it)
    for m in members:
        toks = _flat_tokens(m)
        if not toks:
            continue
        if not any(t.kind == "CODE" for t in toks):
            words = " ".join(t.text for t in toks).lower()
            if re.fullmatch(r"(?:by\s+)?(?:permission|consent)(?:\s+of)?(?:\s+the)?(?:\s+instructor)?", words):
                continue
            raise Ambiguous("k-of-n list with a non-course member: " + words[:60])
        if any(isinstance(it, tuple) for it in m):
            raise Ambiguous("k-of-n list with a bracketed member")


def _k_of_n(k: int, node):
    """"two courses from A, B, C": at least k of the listed courses."""
    leaves = [node] if node[0] == "code" else node[1] if node[0] == "or" else None
    if leaves is None or not all(l[0] == "code" for l in leaves):
        raise Ambiguous("k-of-n list with compound members")
    if k >= len(leaves):
        return ("and", leaves)
    return ("kof", k, leaves)


def _combine(op: str, a, b):
    if a is None:
        return b
    if b is None:
        return a
    return (op, [a, b])


def _cnf(node) -> list[list[Tok]]:
    kind = node[0]
    if kind == "code":
        return [[node[1]]]
    if kind == "kof":
        # at least k of n  <=>  every (n-k+1)-subset contains one of them
        k, leaves = node[1], node[2]
        size = len(leaves) - k + 1
        combos = list(itertools.combinations([l[1] for l in leaves], size))
        if len(combos) > _MAX_CNF_CLAUSES:
            raise Ambiguous("k-of-n expansion too large")
        return [list(c) for c in combos]
    if kind == "and":
        out: list[list[Tok]] = []
        for ch in node[1]:
            out.extend(_cnf(ch))
        return out
    # or: distribute
    child_cnfs = [_cnf(ch) for ch in node[1]]
    total = 1
    for c in child_cnfs:
        total *= len(c)
        if total > _MAX_CNF_CLAUSES:
            raise Ambiguous("CNF expansion too large")
    out = []
    for combo in itertools.product(*child_cnfs):
        clause: list[Tok] = []
        for part in combo:
            clause.extend(part)
        out.append(clause)
    return out


def _finalize(clauses: list[list[Tok]]):
    """Dedupe, absorb, and split coreq-only clauses out."""
    groups: list[list[str]] = []
    coreqs: list[list[str]] = []
    conc: list[str] = []
    norm: list[tuple[list[str], set[str], set[str]]] = []
    for cl in clauses:
        codes: list[str] = []
        coreq_codes: set[str] = set()
        conc_codes: set[str] = set()
        for t in cl:
            if t.code not in codes:
                codes.append(t.code)
            if t.coreq:
                coreq_codes.add(t.code)
            if t.conc:
                conc_codes.add(t.code)
        norm.append((codes, coreq_codes, conc_codes))
    # absorption: drop a clause that is a superset of another clause
    sets = [set(c) for c, _, _ in norm]
    keep = []
    for i, s in enumerate(sets):
        dominated = any(
            (sets[j] < s) or (sets[j] == s and j < i) for j in range(len(sets)) if j != i
        )
        if not dominated:
            keep.append(i)
    for i in keep:
        codes, coreq_codes, conc_codes = norm[i]
        if coreq_codes and set(codes) <= coreq_codes:
            coreqs.append(codes)
            continue
        groups.append(codes)
        for c in codes:
            if (c in conc_codes or c in coreq_codes) and c not in conc:
                conc.append(c)
    return groups, coreqs, conc


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------

def _has_code(s: str, subjects: set[str]) -> bool:
    return any(t.kind in ("CODE", "UNKNOWN") for t in _tokenize(s, subjects))


def _short(s: str, n: int = 200) -> str:
    s = re.sub(r"\s+", " ", s).strip(" .;,")
    s = re.sub(r"\s+([,.;])", r"\1", s)
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


_MID_PREREQ_LABEL_RE = re.compile(r"\bprerequisites?(?:\s*\(s\))?\s*:\s*", re.IGNORECASE)
_CERTAIN_TRIGGER_RE = re.compile(
    r"\bor\s+(?:by\s+)?(?:previous|prior)\s+enrollment\s+in|\bor\s+students\s+previously\s+enrolled\s+in|\bor\s+(?:successful\s+)?completion\s+of",
    re.IGNORECASE,
)
_UNDERGRAD_COMPLETION_RE = re.compile(
    r"\b(?:undergrad\w*|seniors|juniors)\b[^.;]*?\b(?:if\s+they\s+have|who\s+have|that\s+have|having)\s+(?:successfully\s+)?(?:completed|taken|passed)\b",
    re.IGNORECASE,
)
_RESTRICTION_ADVISORY_RE = re.compile(r"may\s+enroll|by\s+permission|with\s+permission", re.IGNORECASE)
_TRIVIAL_RESTRICTION_RE = re.compile(
    r"^(?:or |and )?(?:by )?(?:the )?(?:equivalent|equivalents|is required|are required|required|courses?)$",
    re.IGNORECASE,
)


def _starts_with_code(s: str, subjects: set[str]) -> bool:
    toks = _tokenize(s, subjects)
    return bool(toks) and (toks[0].kind == "CODE" or (toks[0].kind == "LP" and len(toks) > 1 and toks[1].kind == "CODE"))


def parse(
    raw_requirements: str | None,
    known_codes: set[str] | None = None,
    self_code: str | None = None,
) -> ParseResult:
    """Parse one course's requirement prose. `self_code` (the course's own
    code) is never emitted as its own prerequisite/coreq."""
    if not raw_requirements or not raw_requirements.strip():
        return ParseResult(groups=None)
    subjects = _subjects_from(known_codes)
    text = re.sub(r"\s+", " ", raw_requirements.replace("\u00a0", " ")).strip()
    text = re.sub(r"^requirements\s+", "", text, flags=re.I)

    restrictions: list[str] = []
    prereq_clauses: list[str] = []
    coreq_clauses: list[str] = []
    ambiguous_reason: str | None = None

    def ambiguous(why: str) -> None:
        nonlocal ambiguous_reason
        ambiguous_reason = ambiguous_reason or why

    for idx, sent in enumerate(_split_sentences(text)):
        has_code = _has_code(sent, subjects)
        m_pre = _PREREQ_LABEL_RE.match(sent)
        m_co = _COREQ_LABEL_RE.match(sent)
        if m_co:
            coreq_clauses.append(sent[m_co.end():])
            continue
        if m_pre:
            body = sent[m_pre.end():]
            if _has_code(body, subjects):
                prereq_clauses.append(body)
            elif body.strip():
                restrictions.append(body)
            continue
        if not has_code:
            if (
                (_STRICT_COREQ_SENT_RE.search(sent) or _PREV_OR_CONC_RE.search(sent))
                and re.search(r"(?:\bin|\bcourses?)\s+\d{1,3}[A-Z]{0,2}\b", sent, re.I)
                and not _RECOMMEND_RE.search(sent)
            ):
                ambiguous(f"subject-less course reference: {_short(sent, 80)!r}")
            restrictions.append(sent)
            continue
        if _ANTIREQ_RE.search(sent):
            continue
        if _STRICT_COREQ_SENT_RE.search(sent) and not _PREV_OR_CONC_RE.search(sent):
            if re.search(r"after\s+or\s+concurrently|students\s+taking|requirements\s+for\s+the", sent, re.I):
                continue  # advisory / program note, not a course coreq
            coreq_clauses.append(sent)
            continue
        m_mid = _MID_PREREQ_LABEL_RE.search(sent)
        if m_mid:  # "Undergraduates may enroll with prerequisite(s): X"
            restrictions.append(sent[: m_mid.start()])
            prereq_clauses.append(sent[m_mid.end():])
            continue
        if _PREVIOUS_ENROLL_START_RE.match(sent):
            prereq_clauses.append(sent)
            continue
        if _RECOMMEND_RE.search(sent):
            continue
        m_ug = _UNDERGRAD_COMPLETION_RE.search(sent)
        if m_ug:
            # graduate course: "undergraduates may enroll if they have
            # completed X" -- the planner serves undergraduates, so X is the
            # prerequisite that applies to them.
            restrictions.append(sent[: m_ug.start()])
            prereq_clauses.append(sent[m_ug.end():])
            continue
        if _RESTRICT_START_RE.match(sent):
            m = _CERTAIN_TRIGGER_RE.search(sent)
            if m:  # "restricted to graduate students or previous enrollment in X"
                restrictions.append(sent[: m.start()])
                prereq_clauses.append(sent[m.end():])
            elif (
                _RESTRICTION_ADVISORY_RE.search(sent) and not _COMPLETION_TRIGGER_RE.search(sent)
            ) or re.search(r"should\s+(?:enroll|take)\s+in|instead", sent, re.I):
                restrictions.append(sent)
            else:
                restrictions.append(sent)
                ambiguous("course code inside an enrollment-restriction sentence")
            continue
        if _starts_with_code(sent, subjects):
            prereq_clauses.append(sent)  # unlabeled requirement list / continuation
            continue
        if _ADVISORY_RE.search(sent):
            continue
        if idx == 0 and not prereq_clauses:
            prereq_clauses.append(sent)
            continue
        ambiguous(f"unclassified sentence with course codes: {_short(sent, 80)!r}")

    all_clauses: list[list[Tok]] = []
    coreq_cnf: list[list[Tok]] = []
    try:
        parser = _Parser(restrictions)
        for clause in prereq_clauses:
            node = parser.expr(parser.group(_tokenize(clause, subjects)))
            if node is not None:
                all_clauses.extend(_cnf(node))
        for clause in coreq_clauses:
            toks = _tokenize(clause, subjects)
            for t in toks:
                if t.kind == "CODE":
                    t.coreq, t.conc = True, False
            node = parser.expr(parser.group(toks))
            if node is not None:
                coreq_cnf.extend(_cnf(node))
    except Ambiguous as exc:
        ambiguous(str(exc))

    if self_code:
        all_clauses = [c for c in ([t for t in cl if t.code != self_code] for cl in all_clauses) if c]
        coreq_cnf = [c for c in ([t for t in cl if t.code != self_code] for cl in coreq_cnf) if c]
    groups, coreqs, conc = _finalize(all_clauses)
    _, co2, _ = _finalize(coreq_cnf)
    for g in co2:
        if g not in coreqs:
            coreqs.append(g)
    cleaned = []
    for r in restrictions:
        r = _short(r)
        r = re.sub(r"\s+(?:or|and)$", "", r).strip(" ,;")
        if r and not _TRIVIAL_RESTRICTION_RE.match(r):
            cleaned.append(r)
    return ParseResult(
        groups=groups or None,
        coreqs=coreqs,
        concurrent_ok=conc,
        confidence=AMBIGUOUS if ambiguous_reason else CERTAIN,
        reason=ambiguous_reason,
        restrictions=_dedupe(cleaned),
    )


def _dedupe(xs: list[str]) -> list[str]:
    seen: list[str] = []
    for x in xs:
        if x not in seen:
            seen.append(x)
    return seen
