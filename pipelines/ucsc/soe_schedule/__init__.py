"""UCSC Baskin SOE planned-schedule pipeline (courses.engineering.ucsc.edu).

Scrapes the per-department "Calendar" pages: the SOE's *planned* offerings
(sections + instructor assignments) for the upcoming academic year. Output
maps to `course_offerings` rows with source='soe', is_planned=true.

See README.md in this package for page quirks, and
docs/universities/ucsc/source-soe-schedule.md for the full source research.
"""
