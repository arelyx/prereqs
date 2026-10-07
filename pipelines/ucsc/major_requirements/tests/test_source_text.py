"""Source-text rendering: stable, faithful markers."""

from ucsc.major_requirements import source_text

# Real pages wrap everything after the <h1> in container divs.
PAGE = """<html><body><div><div>2026-2027 UCSC General Catalog</div><h1>Test B.S.</h1><div>
<h4 class="sc-RequiredCoursesHeading2">Advanced Lab</h4>
<table>
<tr><td class="sc-coursenumber"><a class="sc-courselink" href="/en/current/general-catalog/courses/astr/upper-division/astr-136">ASTR 136</a></td>
<td class="sc-coursetitle">Advanced Astronomy Laboratory</td><td><p class="credits">5</p></td></tr>
<tr><td class="sc-coursenumber"><a class="sc-courselink" href="/en/current/general-catalog/courses/narrative-courses/phys-astrophysics">or any three of these courses</a></td>
<td class="sc-coursetitle"></td><td><p class="credits"></p></td></tr>
<tr><td class="sc-coursenumber"><a class="sc-courselink" href="/en/current/general-catalog/courses/narrative-courses/or-these-courses"> </a></td>
<td class="sc-coursetitle">or these courses</td><td><p class="credits"></p></td></tr>
</table></div></div></body></html>"""


def test_narrative_label_from_title_or_number_cell():
    md = source_text.render(PAGE, {"slug": "t", "url": "u"})
    assert "- ASTR 136 — Advanced Astronomy Laboratory (5)" in md
    assert "- ⟨or any three of these courses⟩" in md  # text in the number cell
    assert "- ⟨or these courses⟩" in md  # usual: text in the title cell
    assert "phys astrophysics" not in md
    assert "#### Advanced Lab {sc2}" in md


def test_skeleton_ignores_prose_and_titles():
    md = source_text.render(PAGE, {"slug": "t", "url": "u"})
    sk = source_text.skeleton(md)
    assert "ASTR 136" in sk and "Advanced Astronomy" not in sk
