"""Polite HTTP fetching for scrapers: throttled, retried, fail-fast."""

from __future__ import annotations

import time

import requests

from .guards import ScrapeDriftError

DEFAULT_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/150.0.0.0 Safari/537.36"
)


class PoliteSession:
    """requests.Session wrapper: min-interval throttle, limited retries.

    Non-2xx after retries raises ScrapeDriftError — an endpoint that stops
    answering is treated the same as one that changed shape.
    """

    def __init__(self, min_interval: float = 1.0, timeout: int = 30, retries: int = 2):
        self.session = requests.Session()
        self.session.headers["User-Agent"] = DEFAULT_UA
        self.min_interval = min_interval
        self.timeout = timeout
        self.retries = retries
        self._last_request = 0.0

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self._last_request = time.monotonic()

    def _request(self, method: str, url: str, **kwargs) -> requests.Response:
        last_err: Exception | None = None
        for attempt in range(self.retries + 1):
            self._throttle()
            try:
                resp = self.session.request(method, url, timeout=self.timeout, **kwargs)
                if resp.status_code == 200:
                    return resp
                last_err = ScrapeDriftError(
                    f"{method} {url} returned HTTP {resp.status_code}"
                )
            except requests.RequestException as exc:  # network-level failure
                last_err = exc
            time.sleep(2.0 * (attempt + 1))
        raise ScrapeDriftError(f"{method} {url} failed after {self.retries + 1} attempts: {last_err}")

    def get(self, url: str, **kwargs) -> requests.Response:
        return self._request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> requests.Response:
        return self._request("POST", url, **kwargs)
