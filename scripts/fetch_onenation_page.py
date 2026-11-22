#!/usr/bin/env python3
"""Return visible text from public One Nation pages for wiki verification.

Plain HTTP clients receive a Cloudflare interstitial ("Just a moment...", or an
interactive check) instead of the policy page. This script opens each URL in
the installed Google Chrome, waits until that check clears, and prints the
visible page text as JSON. A person completes any captcha in the Chrome window.
The script does not solve checks, change browser fingerprints, or call a
captcha service.

A successful extract is page text only. It does not mark a wiki claim verified.

Examples:
  python3 scripts/fetch_onenation_page.py https://vic.onenation.org.au/policies/fiscal-management
  python3 scripts/fetch_onenation_page.py --from-data
  python3 scripts/fetch_onenation_page.py --from-data --output /tmp/onenation-pages.json

Requires: pip install playwright
Uses the Google Chrome already installed on the machine.
"""

from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path
import re
import sys
import time
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / "data" / "victoria-2026.json"
DEFAULT_PROFILE = Path.home() / ".cache" / "research-politics" / "onenation-chrome"
MELBOURNE = ZoneInfo("Australia/Melbourne")
ALLOWED_HOST = "onenation.org.au"
NAVIGATION_TIMEOUT_MS = 45000
POLL_SECONDS = 1.0
STABLE_READS = 2
MIN_PAGE_CHARS = 200
TRANSIENT_READ_ERRORS = (
    "execution context was destroyed",
    "cannot read properties of null",
    "frame was detached",
    "most likely because of a navigation",
)

CHALLENGE_PHRASES = (
    "just a moment",
    "enable javascript and cookies",
    "verify you are human",
    "checking your browser",
    "needs to review the security of your connection",
    "performance & security by cloudflare",
)

READ_PAGE = """
() => {
  const meta = (name) => {
    const element = document.querySelector(
      `meta[property="${name}"], meta[name="${name}"]`
    );
    return element ? element.getAttribute("content") : null;
  };
  const empty = {
    title: document.title || "",
    heading: "",
    text: "",
    published: null,
    modified: null,
  };
  if (!document.body) return empty;
  const root = document.querySelector("#main-content")
    || document.querySelector(".et_pb_post_content")
    || document.querySelector("main")
    || document.querySelector("article")
    || document.querySelector(".entry-content")
    || document.querySelector("#content")
    || document.body;
  const copy = root.cloneNode(true);
  copy.querySelectorAll("script, style, noscript, nav, footer, #back-link").forEach((node) => {
    node.remove();
  });
  const heading = document.querySelector("h1");
  return {
    title: document.title || "",
    heading: heading ? heading.innerText : "",
    text: copy.innerText || "",
    published: meta("article:published_time"),
    modified: meta("article:modified_time"),
  };
}
"""


def now_stamp():
    return datetime.now(MELBOURNE).isoformat(timespec="seconds")


def is_allowed_url(url):
    """True for http(s) URLs on onenation.org.au and its subdomains."""
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    host = (parts.hostname or "").lower().rstrip(".")
    if parts.scheme not in {"http", "https"} or not host:
        return False
    return host == ALLOWED_HOST or host.endswith("." + ALLOWED_HOST)


def clean_text(value):
    text = (value or "").replace("\u00a0", " ").replace("\r\n", "\n").replace("\r", "\n")
    text = "".join(char for char in text if not 0xE000 <= ord(char) <= 0xF8FF)
    lines = [re.sub(r"[ \t]{2,}", " ", line).strip() for line in text.split("\n")]
    collapsed = "\n".join(lines)
    while "\n\n\n" in collapsed:
        collapsed = collapsed.replace("\n\n\n", "\n\n")
    return collapsed.strip()


def is_challenge_page(title, text):
    """True when the visible document is still a Cloudflare interstitial."""
    title_l = (title or "").strip().lower()
    text_l = (text or "").strip().lower()
    if title_l.startswith("just a moment"):
        return True
    short = len(text_l) < 1500
    if short and any(phrase in title_l or phrase in text_l for phrase in CHALLENGE_PHRASES):
        return True
    return False


def is_edge_error(text, http_status):
    if http_status in {520, 521, 522, 523, 524, 525, 526}:
        return True
    flattened = " ".join((text or "").split()).lower()
    return flattened.startswith("error code:") and len(flattened) < 40


def onenation_sources(path):
    """Return (source id, url) pairs from a wiki data file, in file order."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    sources = data.get("sources", {})
    if not isinstance(sources, dict):
        raise ValueError(f"{path} has no sources object.")
    found = []
    for source_id, source in sources.items():
        if not isinstance(source, dict):
            continue
        url = source.get("url")
        if isinstance(url, str) and is_allowed_url(url):
            found.append((str(source_id), url))
    return found


def collect_targets(urls, data_path):
    ordered = []
    seen = {}
    for url in urls:
        if not is_allowed_url(url):
            raise ValueError(f"Only {ALLOWED_HOST} URLs are accepted: {url}")
        if url not in seen:
            seen[url] = []
            ordered.append(url)
    if data_path is not None:
        for source_id, url in onenation_sources(data_path):
            if url not in seen:
                seen[url] = []
                ordered.append(url)
            if source_id not in seen[url]:
                seen[url].append(source_id)
    if not ordered:
        raise ValueError("No One Nation URLs to fetch.")
    return [(url, seen[url]) for url in ordered]


def launch_chrome(playwright, profile, headless):
    profile.mkdir(parents=True, exist_ok=True)
    options = {
        "user_data_dir": str(profile),
        "headless": headless,
        "locale": "en-AU",
        "viewport": {"width": 1280, "height": 900},
        "args": ["--no-first-run", "--no-default-browser-check"],
    }
    try:
        return playwright.chromium.launch_persistent_context(channel="chrome", **options)
    except Exception as chrome_error:
        message = str(chrome_error).lower()
        if "channel" not in message and "not found" not in message:
            raise
        return playwright.chromium.launch_persistent_context(**options)


def read_page(page):
    raw = page.evaluate(READ_PAGE)
    return {
        "title": clean_text(raw.get("title")),
        "heading": clean_text(raw.get("heading")),
        "text": clean_text(raw.get("text")),
        "published": raw.get("published") or None,
        "modified": raw.get("modified") or None,
        "finalUrl": page.url,
    }


def page_is_ready(snapshot, http_status):
    if is_edge_error(snapshot["text"], http_status):
        return False
    if is_challenge_page(snapshot["title"], snapshot["text"]):
        return False
    return len(snapshot["text"]) >= MIN_PAGE_CHARS and bool(snapshot["title"])


def fetch_page(page, url, source_ids, wait_seconds, headless, document_status):
    started = time.monotonic()
    document_status["value"] = None
    challenge_seen = False
    prompted = False
    print(f"Opening {url}", file=sys.stderr)
    try:
        page.goto(url, wait_until="commit", timeout=NAVIGATION_TIMEOUT_MS)
    except Exception as error:
        message = str(error).splitlines()[0]
        return result_record(
            url, source_ids, status="error", challenge_seen=False,
            access_note=f"Navigation failed: {message}",
        )

    previous = None
    stable = 0
    last = None
    deadline = time.monotonic() + wait_seconds
    while time.monotonic() < deadline:
        try:
            last = read_page(page)
        except Exception as error:
            message = str(error).splitlines()[0]
            if any(part in message.lower() for part in TRANSIENT_READ_ERRORS):
                time.sleep(POLL_SECONDS)
                continue
            return result_record(
                url, source_ids, status="error", challenge_seen=challenge_seen,
                access_note=f"Could not read the page: {message}",
            )
        http_status = document_status["value"]
        if is_challenge_page(last["title"], last["text"]):
            challenge_seen = True
            stable = 0
            previous = None
            if not headless and not prompted:
                print(
                    f"Browser check is showing for {url}. Complete it in the Chrome window.",
                    file=sys.stderr,
                )
                prompted = True
        elif page_is_ready(last, http_status):
            if last["text"] == previous:
                stable += 1
            else:
                stable = 1
                previous = last["text"]
            if stable >= STABLE_READS:
                return success_record(url, source_ids, last, http_status, challenge_seen)
        elif is_edge_error(last["text"], http_status):
            note = f"Cloudflare returned {http_status or 'an origin error'} and no policy text."
            return result_record(
                url, source_ids, status="error", challenge_seen=challenge_seen,
                final_url=last["finalUrl"], http_status=http_status, title=last["title"] or None,
                access_note=note,
            )
        time.sleep(POLL_SECONDS)

    http_status = document_status["value"]
    if last and page_is_ready(last, http_status):
        return success_record(url, source_ids, last, http_status, challenge_seen)
    if last and is_challenge_page(last["title"], last["text"]):
        waited = int(time.monotonic() - started)
        return result_record(
            url, source_ids, status="challenge", challenge_seen=True,
            final_url=last["finalUrl"], http_status=http_status, title=last["title"] or None,
            access_note=(
                f"Cloudflare check was still showing after {waited}s. "
                "Page text was not returned. Complete the check in a visible Chrome window and run again."
            ),
        )
    return result_record(
        url, source_ids, status="error", challenge_seen=challenge_seen,
        final_url=last["finalUrl"] if last else None,
        http_status=http_status,
        title=(last or {}).get("title") or None,
        access_note=f"No policy text was available after {int(wait_seconds)}s.",
    )


def success_record(url, source_ids, snapshot, http_status, challenge_seen):
    if challenge_seen:
        note = "Opened in Chrome. The Cloudflare check cleared before extraction. Visible main text extracted."
    else:
        note = "Opened in Chrome. No Cloudflare interstitial was showing. Visible main text extracted."
    return result_record(
        url, source_ids, status="ok", challenge_seen=challenge_seen,
        final_url=snapshot["finalUrl"], http_status=http_status,
        title=snapshot["title"] or None, heading=snapshot["heading"] or None,
        text=snapshot["text"], published=snapshot["published"], modified=snapshot["modified"],
        access_note=note,
    )


def result_record(
    url, source_ids, status, challenge_seen, access_note,
    final_url=None, http_status=None, title=None, heading=None, text=None,
    published=None, modified=None,
):
    return {
        "requestedUrl": url,
        "finalUrl": final_url,
        "sourceIds": source_ids,
        "retrievedAt": now_stamp(),
        "httpStatus": http_status,
        "title": title,
        "heading": heading,
        "publishedOnPage": published,
        "modifiedOnPage": modified,
        "challengeSeen": challenge_seen,
        "status": status,
        "text": text,
        "accessNote": access_note,
    }


def fetch_all(targets, profile, headless, wait_seconds):
    from playwright.sync_api import sync_playwright

    results = []
    with sync_playwright() as playwright:
        context = launch_chrome(playwright, profile, headless)
        document_status = {"value": None}

        def on_response(response):
            try:
                main_document = (
                    response.request.resource_type == "document"
                    and response.frame == page.main_frame
                )
            except Exception:
                return
            if main_document:
                document_status["value"] = response.status

        try:
            page = context.pages[0] if context.pages else context.new_page()
            page.on("response", on_response)
            for url, source_ids in targets:
                results.append(fetch_page(
                    page, url, source_ids, wait_seconds, headless, document_status,
                ))
        finally:
            context.close()
    return results


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("urls", nargs="*", help="One Nation page URLs to open.")
    parser.add_argument(
        "--from-data", nargs="?", const=str(DEFAULT_DATA), default=None, metavar="PATH",
        help=f"Also fetch One Nation URLs from a wiki data file (default: {DEFAULT_DATA}).",
    )
    parser.add_argument("--output", type=Path, help="Write JSON to this file as well as stdout.")
    parser.add_argument("--headless", action="store_true", help="Hide Chrome. An interactive captcha cannot be completed.")
    parser.add_argument(
        "--wait", type=float, default=None,
        help="Seconds to wait for the check to clear and the page text to settle (default: 120, or 25 with --headless).",
    )
    parser.add_argument("--profile", type=Path, default=DEFAULT_PROFILE, help="Chrome profile directory used to keep a cleared check.")
    args = parser.parse_args(argv)
    if args.wait is None:
        args.wait = 25 if args.headless else 120
    if args.wait <= 0:
        parser.error("--wait must be greater than 0.")
    if not args.urls and args.from_data is None:
        parser.error("Pass a One Nation URL or --from-data.")
    return args


def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        targets = collect_targets(args.urls, args.from_data)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        return 2
    try:
        pages = fetch_all(targets, args.profile, args.headless, args.wait)
    except ModuleNotFoundError:
        print("Playwright is not installed. Run: pip install playwright", file=sys.stderr)
        return 2
    except Exception as error:
        message = str(error).splitlines()[0]
        print(f"Could not open Chrome: {message}", file=sys.stderr)
        print("Install Google Chrome, or run: pip install playwright && playwright install chromium", file=sys.stderr)
        return 2

    payload = {"retrievedAt": now_stamp(), "pages": pages}
    encoded = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf-8")
        print(f"Wrote {args.output}", file=sys.stderr)
    sys.stdout.write(encoded)
    return 0 if all(page["status"] == "ok" for page in pages) else 1


if __name__ == "__main__":
    sys.exit(main())
