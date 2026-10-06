"""General program information, derived from the committed source text.

The catalog page's "Information and Policies" part (introduction, learning
outcomes, advising, transfer/qualification policy, honors...) is shown as
collapsible panels beside the degree dashboard. It is read straight from
``programs.source_md`` (the committed normalized page), so it is always the
same text the harness was verified against.
"""

from __future__ import annotations

import re

_HEADING = re.compile(r"^(#{2,6}) (.*?)(?: \{sc\d\})?$")
INFO_H2 = "Information and Policies"


def info_sections(source_md: str | None) -> list[dict]:
    """[{title, paragraphs}] for each h3 under the page's Information h2.

    Minors have no Information h2; their pages start with requirements, so
    they get no panels. Deeper headings inside a panel become bold lead-ins.
    """
    if not source_md:
        return []
    out: list[dict] = []
    in_info = False
    cur: dict | None = None
    for line in source_md.splitlines():
        m = _HEADING.match(line)
        if m:
            level, title = len(m.group(1)), m.group(2).strip()
            if level == 2:
                in_info = title == INFO_H2
                # Text directly under the h2 (before any h3) is the overview.
                cur = {"title": "Overview", "paragraphs": []} if in_info else None
                if cur is not None:
                    out.append(cur)
                continue
            if not in_info:
                continue
            if level == 3:
                cur = {"title": title, "paragraphs": []}
                out.append(cur)
            elif cur is not None:
                cur["paragraphs"].append(f"**{title}**")
            continue
        if in_info and cur is not None and line.strip() and not line.startswith("<!--"):
            cur["paragraphs"].append(line.strip())
    return [s for s in out if s["paragraphs"]]
