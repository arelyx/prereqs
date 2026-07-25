"""Fail-fast primitives for scraping and LLM pipelines.

The contract (docs/ARCHITECTURE.md): any violated expectation about upstream
page structure or LLM output aborts the run BEFORE the serving database or the
previous snapshot is touched. Failures are meant for a human/frontier-LLM
audit, not silent recovery.
"""

from __future__ import annotations

from dataclasses import dataclass, field


class PipelineAbort(Exception):
    """Base for all deliberate pipeline halts."""


class ScrapeDriftError(PipelineAbort):
    """An upstream page no longer matches our structural expectations."""


class GuardViolation(PipelineAbort):
    """LLM output or derived data failed a validation guard."""


def expect(condition: bool, message: str, **context) -> None:
    """Assert a structural expectation about scraped content.

    Raises ScrapeDriftError with the given context so the audit log shows
    exactly which assumption broke and where.
    """
    if not condition:
        detail = "; ".join(f"{k}={v!r}" for k, v in context.items())
        raise ScrapeDriftError(f"{message}" + (f" [{detail}]" if detail else ""))


def expect_range(value: float, lo: float, hi: float, what: str, **context) -> None:
    expect(lo <= value <= hi, f"{what} out of expected range [{lo}, {hi}]: got {value}", **context)


@dataclass
class FailureBudget:
    """Tracks per-item guard failures against a hard threshold.

    Individual items (a course, a major) may be quarantined rather than
    aborting the whole run, but if failures exceed `max_ratio` of `total`,
    something systemic changed and the run must halt.
    """

    total: int
    max_ratio: float = 0.05
    failures: list = field(default_factory=list)

    def record(self, item_id: str, reason: str) -> None:
        self.failures.append({"item": item_id, "reason": reason})
        if self.total > 0 and len(self.failures) / self.total > self.max_ratio:
            raise GuardViolation(
                f"failure budget exceeded: {len(self.failures)}/{self.total} items failed "
                f"(max {self.max_ratio:.0%}); first failures: {self.failures[:5]}"
            )
