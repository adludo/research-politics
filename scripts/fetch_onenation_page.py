#!/usr/bin/env python3
"""Return visible text from a cited public page for wiki verification.

Plain HTTP clients often receive a CAPTCHA or browser-check interstitial instead
of the page. This script opens each http(s) URL in a browser, waits until that
check clears, and prints the visible page text as JSON. On a Mac it uses the
installed Google Chrome and leaves the window visible so a person can complete
a check. In Codex cloud, and on any Linux machine without a display, it uses
headless Playwright Chromium, follows HTTP(S)_PROXY, and installs Chromium when
the browser is missing. It does not solve checks, change browser fingerprints,
or call a captcha service.

A successful extract is page text only. It does not mark a wiki claim verified,
and it does not turn a source into a ranking.

Examples:
  python3 scripts/fetch_onenation_page.py https://demosau.com/wp-content/uploads/DemosAU/vic-poll-nov-2026.html
  python3 scripts/fetch_onenation_page.py --from-data --host demosau.com
  python3 scripts/fetch_onenation_page.py --from-data --output /tmp/source-pages.json

Requires: pip install playwright
"""

from __future__ import annotations

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.parse import unquote, urlsplit
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / "data" / "victoria-2026.json"
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
    "verify you're a human",
    "verify that you are human",
    "checking your browser",
    "needs to review the security of your connection",
    "performance & security by cloudflare",
    "attention required",
    "please complete the security check",
    "complete the captcha",
    "security check",
    "i'm not a robot",
    "i am human",
    "hcaptcha",
    "recaptcha",
    "cf-turnstile",
    "checking if the site connection is secure",
    "pardon our interruption",
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
  if (!document.body) return { ...empty, challengeFrame: false };
  const root = document.querySelector("main")
    || document.querySelector("article")
    || document.querySelector("[role='main']")
    || document.querySelector(".entry-content")
    || document.querySelector("#content")
    || document.querySelector("#main-content")
    || document.querySelector(".et_pb_post_content")
    || document.body;
  const copy = root.cloneNode(true);
  copy.querySelectorAll("script, style, noscript, nav, footer, #back-link").forEach((node) => {
    node.remove();
  });
  const heading = document.querySelector("h1");
  const challengeFrame = Boolean(document.querySelector(
    "iframe[src*='challenges.cloudflare.com'], iframe[src*='recaptcha'], iframe[src*='hcaptcha'], iframe[src*='turnstile'], .g-recaptcha, .h-captcha"
  ));
  return {
    title: document.title || "",
    heading: heading ? heading.innerText : "",
    text: copy.innerText || "",
    published: meta("article:published_time"),
    modified: meta("article:modified_time"),
    challengeFrame,
  };
}
"""


class BrowserMissing(RuntimeError):
    """Playwright has no Chromium binary for this environment yet."""


def now_stamp():
    try:
        zone = ZoneInfo("Australia/Melbourne")
    except Exception:
        return datetime.now().astimezone().isoformat(timespec="seconds")
    return datetime.now(zone).isoformat(timespec="seconds")


def default_headless(platform=None, environ=None):
    """Headless when there is no display. A Mac session stays visible."""
    platform = sys.platform if platform is None else platform
    environ = os.environ if environ is None else environ
    if environ.get("DISPLAY") or environ.get("WAYLAND_DISPLAY"):
        return False
    if platform == "darwin":
        return False
    return True


def container_runtime(platform=None, environ=None):
    """True for root, Docker, or a Linux session without a display."""
    platform = sys.platform if platform is None else platform
    environ = os.environ if environ is None else environ
    if hasattr(os, "geteuid") and os.geteuid() == 0:
        return True
    if Path("/.dockerenv").exists():
        return True
    return platform.startswith("linux") and default_headless(platform, environ)


def proxy_from_environ(environ=None):
    """Playwright proxy settings from the environment, without embedding secrets in the server URL."""
    environ = os.environ if environ is None else environ
    raw = (
        environ.get("HTTPS_PROXY")
        or environ.get("https_proxy")
        or environ.get("HTTP_PROXY")
        or environ.get("http_proxy")
        or environ.get("ALL_PROXY")
        or environ.get("all_proxy")
        or ""
    ).strip()
    if not raw:
        return None
    parts = urlsplit(raw if "://" in raw else "http://" + raw)
    if not parts.hostname:
        return None
    server = f"{parts.scheme}://{parts.hostname}"
    if parts.port:
        server += f":{parts.port}"
    settings = {"server": server}
    if parts.username:
        settings["username"] = unquote(parts.username)
    if parts.password:
        settings["password"] = unquote(parts.password)
    return settings


def default_profile():
    candidate = Path.home() / ".cache" / "research-politics" / "source-browser"
    try:
        candidate.mkdir(parents=True, exist_ok=True)
        probe = candidate / ".write-probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        return candidate
    except OSError:
        fallback = Path(tempfile.gettempdir()) / "research-politics-source-browser"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


def chrome_available():
    if sys.platform == "darwin":
        return Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome").is_file()
    return bool(
        shutil.which("google-chrome")
        or shutil.which("google-chrome-stable")
    )


def is_allowed_url(url):
    """True for any http(s) URL with a hostname."""
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    host = (parts.hostname or "").lower().rstrip(".")
    return parts.scheme in {"http", "https"} and bool(host)


def comparable_host(value):
    host = (value or "").strip().lower().rstrip(".")
    if "://" in host:
        host = (urlsplit(host).hostname or "").lower().rstrip(".")
    if host.startswith("www."):
        host = host[4:]
    return host


def host_matches(url, host_filter):
    if not host_filter:
        return True
    needle = comparable_host(host_filter)
    host = comparable_host(urlsplit(url).hostname or "")
    return bool(needle) and (host == needle or host.endswith("." + needle))


def clean_text(value):
    text = (value or "").replace("\u00a0", " ").replace("\r\n", "\n").replace("\r", "\n")
    text = "".join(char for char in text if not 0xE000 <= ord(char) <= 0xF8FF)
    lines = [re.sub(r"[ \t]{2,}", " ", line).strip() for line in text.split("\n")]
    collapsed = "\n".join(lines)
    while "\n\n\n" in collapsed:
        collapsed = collapsed.replace("\n\n\n", "\n\n")
    return collapsed.strip()


def is_challenge_page(title, text, challenge_frame=False):
    """True when the visible document is still a CAPTCHA or browser check."""
    title_l = (title or "").strip().lower()
    text_l = (text or "").strip().lower()
    if title_l.startswith("just a moment") or title_l.startswith("attention required"):
        return True
    short = len(text_l) < 1500
    if short and challenge_frame:
        return True
    if short and any(phrase in title_l or phrase in text_l for phrase in CHALLENGE_PHRASES):
        return True
    return False


def is_edge_error(text, http_status):
    if http_status in {520, 521, 522, 523, 524, 525, 526}:
        return True
    flattened = " ".join((text or "").split()).lower()
    return flattened.startswith("error code:") and len(flattened) < 40


def is_proxy_denial(text, http_status):
    """True for a short proxy rejection, which is separate from a Cloudflare check."""
    if http_status not in {401, 403, 407}:
        return False
    flattened = " ".join((text or "").split()).lower()
    if len(flattened) > 500 or is_challenge_page("", flattened):
        return False
    markers = ("tunnel connection failed", "proxy error", "proxy authentication", "access via proxy")
    return any(marker in flattened for marker in markers)


def data_sources(path, host_filter):
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
        if isinstance(url, str) and is_allowed_url(url) and host_matches(url, host_filter):
            found.append((str(source_id), url))
    return found


def collect_targets(urls, data_path, host_filter=None):
    ordered = []
    seen = {}
    for url in urls:
        if not is_allowed_url(url):
            raise ValueError(f"Only http(s) URLs are accepted: {url}")
        if host_filter and not host_matches(url, host_filter):
            raise ValueError(f"{url} is outside the requested host {host_filter}.")
        if url not in seen:
            seen[url] = []
            ordered.append(url)
    if data_path is not None:
        for source_id, url in data_sources(data_path, host_filter):
            if url not in seen:
                seen[url] = []
                ordered.append(url)
            if source_id not in seen[url]:
                seen[url].append(source_id)
    if not ordered:
        raise ValueError("No page URLs to fetch.")
    return [(url, seen[url]) for url in ordered]


def missing_browser(error):
    message = str(error).lower()
    return "executable doesn't exist" in message or "please run the following command" in message or "browser is not installed" in message


def missing_display(error):
    message = str(error).lower()
    return any(part in message for part in ("missing x server", "no display", "xopendisplay", "failed to connect to the bus"))


def launch_browser(playwright, profile, headless):
    """Open Chrome when a visible desktop browser is available, otherwise Playwright Chromium."""
    profile.mkdir(parents=True, exist_ok=True)
    use_chrome = (not headless) and chrome_available()
    args = ["--no-first-run", "--no-default-browser-check"]
    options = {
        "user_data_dir": str(profile),
        "headless": headless,
        "locale": "en-AU",
        "viewport": {"width": 1280, "height": 900},
        "args": args,
    }
    proxy = proxy_from_environ()
    if proxy:
        options["proxy"] = proxy
    if container_runtime():
        args.extend(["--disable-dev-shm-usage", "--no-sandbox"])
        options["chromium_sandbox"] = False
    browser_name = "chrome" if use_chrome else "chromium"
    try:
        if use_chrome:
            context = playwright.chromium.launch_persistent_context(channel="chrome", **options)
        else:
            context = playwright.chromium.launch_persistent_context(**options)
    except Exception as error:
        if missing_browser(error):
            raise BrowserMissing(str(error)) from error
        raise
    return context, browser_name


def install_chromium():
    print("Installing Playwright Chromium for this environment.", file=sys.stderr)
    completed = subprocess.run(
        [sys.executable, "-m", "playwright", "install", "chromium"],
        stdin=subprocess.DEVNULL,
        check=False,
    )
    return completed.returncode == 0


def install_chromium_dependencies():
    if not hasattr(os, "geteuid") or os.geteuid() != 0:
        return False
    print("Installing Chromium system libraries.", file=sys.stderr)
    completed = subprocess.run(
        [sys.executable, "-m", "playwright", "install-deps", "chromium"],
        stdin=subprocess.DEVNULL,
        check=False,
    )
    return completed.returncode == 0


def read_page(page):
    raw = page.evaluate(READ_PAGE)
    return {
        "title": clean_text(raw.get("title")),
        "heading": clean_text(raw.get("heading")),
        "text": clean_text(raw.get("text")),
        "published": raw.get("published") or None,
        "modified": raw.get("modified") or None,
        "challengeFrame": bool(raw.get("challengeFrame")),
        "finalUrl": page.url,
    }


def page_is_ready(snapshot, http_status):
    if is_edge_error(snapshot["text"], http_status):
        return False
    if is_challenge_page(snapshot["title"], snapshot["text"], snapshot.get("challengeFrame", False)):
        return False
    return len(snapshot["text"]) >= MIN_PAGE_CHARS and bool(snapshot["title"])


def fetch_page(page, url, source_ids, wait_seconds, headless, browser_name, document_status):
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
        if is_challenge_page(last["title"], last["text"], last.get("challengeFrame", False)):
            challenge_seen = True
            stable = 0
            previous = None
            if not headless and not prompted:
                print(
                    f"Browser check is showing for {url}. Complete it in the browser window.",
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
                return success_record(url, source_ids, last, http_status, challenge_seen, browser_name, headless)
        elif is_proxy_denial(last["text"], http_status):
            return result_record(
                url, source_ids, status="error", challenge_seen=challenge_seen,
                final_url=last["finalUrl"], http_status=http_status, title=last["title"] or None,
                access_note=f"The environment proxy refused the connection ({http_status}). Page text was not returned.",
            )
        elif is_edge_error(last["text"], http_status):
            note = f"The site returned {http_status or 'an origin error'} and no page text."
            return result_record(
                url, source_ids, status="error", challenge_seen=challenge_seen,
                final_url=last["finalUrl"], http_status=http_status, title=last["title"] or None,
                access_note=note,
            )
        time.sleep(POLL_SECONDS)

    http_status = document_status["value"]
    if last and page_is_ready(last, http_status):
        return success_record(url, source_ids, last, http_status, challenge_seen, browser_name, headless)
    if last and is_challenge_page(last["title"], last["text"], last.get("challengeFrame", False)):
        waited = int(time.monotonic() - started)
        if headless:
            note = (
                f"A CAPTCHA or browser check was still showing after {waited}s in headless {browser_name}. "
                "Page text was not returned."
            )
        else:
            note = (
                f"A CAPTCHA or browser check was still showing after {waited}s. "
                "Page text was not returned. Complete the check in the browser window and run again."
            )
        return result_record(
            url, source_ids, status="challenge", challenge_seen=True,
            final_url=last["finalUrl"], http_status=http_status, title=last["title"] or None,
            access_note=note,
        )
    return result_record(
        url, source_ids, status="error", challenge_seen=challenge_seen,
        final_url=last["finalUrl"] if last else None,
        http_status=http_status,
        title=(last or {}).get("title") or None,
        access_note=f"No page text was available after {int(wait_seconds)}s.",
    )


def success_record(url, source_ids, snapshot, http_status, challenge_seen, browser_name, headless):
    mode = "headless" if headless else "visible"
    if challenge_seen:
        note = f"Opened in {mode} {browser_name}. The browser check cleared before extraction. Visible page text extracted."
    else:
        note = f"Opened in {mode} {browser_name}. No CAPTCHA or browser check was showing. Visible page text extracted."
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


def run_fetch(targets, profile, headless, wait_seconds):
    from playwright.sync_api import sync_playwright

    results = []
    with sync_playwright() as playwright:
        try:
            context, browser_name = launch_browser(playwright, profile, headless)
        except Exception as error:
            if headless or not missing_display(error):
                raise
            print("No display is available. Retrying headless.", file=sys.stderr)
            headless = True
            context, browser_name = launch_browser(playwright, profile, True)
        mode = "headless" if headless else "visible"
        print(f"Using {mode} {browser_name}.", file=sys.stderr)
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
                    page, url, source_ids, wait_seconds, headless, browser_name, document_status,
                ))
        finally:
            context.close()
    return results, browser_name, headless


def fetch_all(targets, profile, headless, wait_seconds):
    installed_browser = False
    installed_dependencies = False
    while True:
        try:
            return run_fetch(targets, profile, headless, wait_seconds)
        except BrowserMissing:
            if installed_browser or not install_chromium():
                raise
            installed_browser = True
        except Exception as error:
            library_missing = "shared librar" in str(error).lower()
            if library_missing and not installed_dependencies and install_chromium_dependencies():
                installed_dependencies = True
                continue
            raise


def parse_args(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("urls", nargs="*", help="Cited http(s) page URLs to open.")
    parser.add_argument(
        "--from-data", nargs="?", const=str(DEFAULT_DATA), default=None, metavar="PATH",
        help=f"Also fetch cited URLs from a wiki data file (default: {DEFAULT_DATA}).",
    )
    parser.add_argument(
        "--host", default=None,
        help="Limit fetching to this hostname and its subdomains, for example demosau.com.",
    )
    parser.add_argument("--output", type=Path, help="Write JSON to this file as well as stdout.")
    display = parser.add_mutually_exclusive_group()
    display.add_argument("--headless", action="store_true", help="Hide the browser. This is the default in Codex cloud.")
    display.add_argument("--headed", action="store_true", help="Show the browser so a person can complete a check.")
    parser.add_argument(
        "--wait", type=float, default=None,
        help="Seconds to wait for the check to clear and the page text to settle (default: 120 visible, 25 headless).",
    )
    parser.add_argument("--profile", type=Path, default=None, help="Browser profile directory used to keep a cleared check.")
    args = parser.parse_args(argv)
    if args.headed:
        args.headless = False
    elif not args.headless:
        args.headless = default_headless()
    if args.wait is None:
        args.wait = 25 if args.headless else 120
    if args.wait <= 0:
        parser.error("--wait must be greater than 0.")
    if args.profile is None:
        args.profile = default_profile()
    if not args.urls and args.from_data is None:
        parser.error("Pass a page URL or --from-data.")
    return args


def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        targets = collect_targets(args.urls, args.from_data, args.host)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        return 2
    try:
        pages, browser_name, headless = fetch_all(targets, args.profile, args.headless, args.wait)
    except ModuleNotFoundError:
        print("Playwright is not installed. Run: pip install playwright", file=sys.stderr)
        return 2
    except Exception as error:
        message = str(error).splitlines()[0]
        print(f"Could not open a browser: {message}", file=sys.stderr)
        print("Run: pip install playwright && python3 -m playwright install chromium", file=sys.stderr)
        return 2

    proxy = proxy_from_environ()
    payload = {
        "retrievedAt": now_stamp(),
        "browser": browser_name,
        "headless": headless,
        "proxy": proxy["server"] if proxy else None,
        "pages": pages,
    }
    encoded = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(encoded, encoding="utf-8")
        print(f"Wrote {args.output}", file=sys.stderr)
    sys.stdout.write(encoded)
    return 0 if all(page["status"] == "ok" for page in pages) else 1


if __name__ == "__main__":
    sys.exit(main())
