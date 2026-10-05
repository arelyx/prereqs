"""Render a program page into committed, normalized Markdown ("source text").

The source text is the hot path's deliverable for programs and the warm
path's ground truth: a deterministic, diff-friendly rendering of the whole
official page (policies, requirements, planners) with the structural markers
a reader needs and none of the CMS noise. It is committed per edition at
``data-committed/ucsc/editions/<edition>/sources/<slug>.md`` and hashed; a
harness records the hash it was authored against, so "the page changed since
this harness was written" is a byte comparison, not a judgment call.

Rendering rules (stable across re-fetches of an unchanged page):
- Headings keep their level; requirement-group headings are suffixed with
  their SmartCatalog class level, e.g. ``#### Plus one of the following {sc3}``.
- Course rows: ``- CSE 12 — Computer Systems and Assembly Language and Lab (7)``.
  Cross-listings are kept in brackets: ``- CSE 185E [/CSE 185S] — ...``.
- Narrative pseudo-rows (option-branch markers) render as
  ``- ⟨either these courses⟩`` — they carry OR semantics, never drop them.
- ``sc-requirementsNote`` blocks render as ``> NOTE: ...``.
- Non-course links in prose keep their URL (external distribution lists etc).
- Whitespace is collapsed; the breadcrumb and page chrome are dropped.
"""

from __future__ import annotations

import hashlib
import re

from bs4 import BeautifulSoup, NavigableString, Tag

from .. import editions
from .segment import HEADING_CLASS_RE

_WS = re.compile(r"\s+")


def _clean(text: str) -> str:
    return _WS.sub(" ", text).strip()


def _inline(el: Tag) -> str:
    """Text of an element with non-course hyperlinks preserved as Markdown."""
    parts: list[str] = []
    for node in el.descendants:
        if isinstance(node, NavigableString):
            if node.parent.name == "a" and _keep_link(node.parent):
                continue  # emitted with the <a>
            parts.append(str(node))
        elif node.name == "a" and _keep_link(node):
            label = _clean(node.get_text(" "))
            parts.append(f"[{label}]({_abs(node.get('href', ''))})" if label else "")
        elif node.name == "br":
            parts.append(" ")
    return _clean("".join(parts))


def _keep_link(a: Tag) -> bool:
    href = a.get("href") or ""
    if not href or href.startswith(("#", "javascript:", "mailto:")):
        return False
    return "/general-catalog/courses/" not in href


def _abs(href: str) -> str:
    return editions.BASE_URL + href if href.startswith("/") else href


def _course_row(tr: Tag) -> str | None:
    num = tr.find("td", class_="sc-coursenumber")
    if num is None:
        return None
    a = num.find("a")
    href = (a.get("href") if a else "") or ""
    title_td = tr.find("td", class_="sc-coursetitle")
    title = _clean(title_td.get_text(" ")) if title_td else ""
    if "narrative-courses" in href:
        return f"- ⟨{title or href.rsplit('/', 1)[-1].replace('-', ' ')}⟩"
    cross = [_clean(d.get_text(" ")) for d in num.find_all("div", class_="sc-crosslisted")]
    for d in num.find_all("div", class_="sc-crosslisted"):
        d.extract()
    code = _clean(num.get_text(" "))
    credits_el = tr.find("p", class_="credits")
    credits = _clean(credits_el.get_text(" ")) if credits_el else ""
    line = f"- {code}"
    if cross:
        line += " [" + " ".join(cross) + "]"
    if title:
        line += f" — {title}"
    if credits:
        line += f" ({credits})"
    return line


def _table(table: Tag) -> list[str]:
    rows = table.find_all("tr")
    if not rows:
        return []
    out: list[str] = []
    for tr in rows:
        line = _course_row(tr)
        if line is None:
            cells = [_inline(td) for td in tr.find_all(["td", "th"])]
            cells = [c for c in cells if c]
            if cells:
                line = "| " + " | ".join(cells) + " |"
        if line:
            out.append(line)
    return out


def _walk(el: Tag, out: list[str], list_depth: int = 0) -> None:
    for child in el.children:
        if isinstance(child, NavigableString):
            t = _clean(str(child))
            if t:
                out.append(t)
            continue
        if not isinstance(child, Tag):
            continue
        name = child.name
        classes = child.get("class") or []
        if name in ("h1", "h2", "h3", "h4", "h5", "h6"):
            text = _clean(child.get_text(" "))
            if not text:
                continue
            m = HEADING_CLASS_RE.search(" ".join(classes))
            suffix = f" {{sc{m.group(1)}}}" if m else ""
            out.append("")
            out.append("#" * int(name[1]) + " " + text + suffix)
        elif name == "table":
            out.extend(_table(child))
        elif name in ("ul", "ol"):
            for i, li in enumerate(child.find_all("li", recursive=False), 1):
                bullet = f"{i}." if name == "ol" else "-"
                nested = li.find(["ul", "ol"])
                if nested is not None:
                    nested.extract()
                text = _inline(li)
                if text:
                    out.append("  " * list_depth + f"{bullet} {text}")
                if nested is not None:
                    wrapper = Tag(name="div")
                    wrapper.append(nested)
                    _walk(wrapper, out, list_depth + 1)
        elif name == "div" and "sc-requirementsNote" in classes:
            text = _inline(child)
            if text:
                out.append(f"> NOTE: {text}")
        elif name == "p":
            text = _inline(child)
            if text:
                out.append(text)
        elif name in ("script", "style", "noscript"):
            continue
        else:
            _walk(child, out, list_depth)


def render(html: str, meta: dict) -> str:
    """Normalized Markdown for one program page. ``meta`` carries name/slug/url."""
    soup = BeautifulSoup(html, "html.parser")
    h1 = soup.find("h1")
    main = h1.parent
    edition = editions.detect(html)
    lines = [
        f"# {_clean(h1.get_text(' '))}",
        "",
        f"<!-- slug: {meta['slug']} | edition: {edition} | url: {meta['url']} -->",
    ]
    body: list[str] = []
    started = False
    for child in main.children:
        if child is h1:
            started = True
            continue
        if not started or not isinstance(child, Tag):
            continue
        _walk(child, body)
    # Collapse runs of blank lines; blank line before headings only.
    for line in body:
        if line == "" and lines and lines[-1] == "":
            continue
        lines.append(line)
    return "\n".join(lines).rstrip() + "\n"


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def skeleton(text: str) -> str:
    """The requirement *structure* of a source text: headings, course rows and
    option markers — no prose. Two editions with equal skeletons differ only
    in wording (policy text, learning outcomes); a skeleton change means
    course lists or rule groups moved, which always needs a harness review.
    Prose changes can still alter rules ("take four" -> "take five"), so a
    text-only change is a cheap review, not a free pass."""
    keep = []
    for ln in text.splitlines()[3:]:  # skip title + provenance comment
        if ln.startswith("#"):
            keep.append(ln)
        elif ln.startswith("- "):
            # course code (+ cross-listing) only: titles/credits get renamed
            keep.append(ln.split(" — ", 1)[0])
    return "\n".join(keep) + "\n"
