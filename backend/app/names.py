"""Instructor-name unification across sources.

pisa renders 'Last,F.M.'; the SOE schedule renders 'First [Middle] Last'.
Both reduce to (lowercase last name, first initial) for identity; the fuller
human-readable form wins for display. Collisions are possible but rare within
a single course's instructor pool.
"""

from __future__ import annotations


def name_key(name: str) -> tuple[str, str]:
    if "," in name:
        last, _, rest = name.partition(",")
        first_initial = rest.strip()[:1]
    else:
        parts = name.split()
        last = parts[-1] if parts else name
        first_initial = parts[0][:1] if len(parts) > 1 else ""
    return last.strip().lower(), first_initial.lower()


def better_display(a: str, b: str) -> str:
    a_full, b_full = "," not in a, "," not in b
    if a_full != b_full:
        return a if a_full else b
    return a if len(a) >= len(b) else b
