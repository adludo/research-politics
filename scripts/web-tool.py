#!/usr/bin/env python3
"""Dependency-free HTTP research CLI. Not a hosted search-service replacement."""
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import textwrap
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import uuid
import xml.etree.ElementTree as ET

MAX_BYTES = 2 * 1024 * 1024
BLOCKS = {'p', 'div', 'section', 'article', 'header', 'footer', 'li', 'h1', 'h2', 'h3', 'h4', 'br', 'tr', 'blockquote'}
HIDDEN = {'script', 'style', 'noscript', 'template'}


def checked_url(url):
    parts = urlsplit(url)
    if parts.scheme not in {'http', 'https'} or not parts.hostname or parts.username or parts.password:
        raise ValueError('Use an HTTP(S) URL without embedded credentials.')
    return url


class Redirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        checked_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch(url):
    request = Request(checked_url(url), headers={
        'User-Agent': 'ResearchPoliticsWebTool/1.0',
        'Accept': 'text/html, application/rss+xml, application/xml, text/plain;q=0.9',
    })
    # Inherit proxy settings and verified TLS; never work around a denial.
    with build_opener(Redirects()).open(request, timeout=20) as response:
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError('Response exceeds 2 MiB; no partial page saved.')
        return {
            'requested_url': url,
            'url': checked_url(response.url),
            'http_status': response.status,
            'retrieved_at': datetime.now(timezone.utc).isoformat(),
            'content_type': response.headers.get_content_type(),
            'http_last_modified': response.headers.get('Last-Modified'),
        }, body.decode(response.headers.get_content_charset() or 'utf-8', errors='replace')


class Extractor(HTMLParser):
    def __init__(self, base):
        super().__init__(convert_charrefs=True)
        self.base = base
        self.parts = []
        self.links = []
        self.title = []
        self.in_title = False
        self.hidden = 0
        self.dates = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in HIDDEN:
            self.hidden += 1
        if self.hidden:
            return
        if tag == 'title':
            self.in_title = True
        if tag in BLOCKS:
            self.parts.append('\n')
        if tag == 'meta':
            name = attrs.get('property', attrs.get('name', '')).lower()
            if name in {'article:published_time', 'article:modified_time', 'date', 'datepublished', 'datemodified'}:
                self.dates[name] = attrs.get('content')
        if tag == 'a' and attrs.get('href'):
            url = urljoin(self.base, attrs['href'])
            try:
                checked_url(url)
            except ValueError:
                return
            self.links.append({'id': len(self.links), 'url': url})
            self.parts.append(f' [{len(self.links)-1}] ')

    def handle_endtag(self, tag):
        if tag in HIDDEN:
            self.hidden = max(0, self.hidden - 1)
            return
        if self.hidden:
            return
        if tag == 'title':
            self.in_title = False
        if tag in BLOCKS:
            self.parts.append('\n')

    def handle_data(self, data):
        if not self.hidden:
            if self.in_title:
                self.title.append(data)
            else:
                self.parts.append(data)

    def lines(self):
        result = []
        for paragraph in ''.join(self.parts).splitlines():
            paragraph = ' '.join(paragraph.split())
            if paragraph:
                result.extend(textwrap.wrap(paragraph, width=110))
        return result


def save(cache, record):
    cache.mkdir(parents=True, exist_ok=True)
    ref = 'page-' + uuid.uuid4().hex
    record['ref_id'] = ref
    # Create a new record exclusively; keep concurrent invocations independent.
    with (cache / f'{ref}.json').open('x', encoding='utf-8') as target:
        json.dump(record, target, ensure_ascii=False)
    return record


def load(cache, ref):
    if not re.fullmatch(r'page-[0-9a-f]{32}', ref):
        raise ValueError('Use an actual page reference returned by this tool.')
    return json.loads((cache / f'{ref}.json').read_text(encoding='utf-8'))


def open_page(cache, url):
    record, body = fetch(url)
    kind = record['content_type']
    if kind in {'text/html', 'application/xhtml+xml'}:
        parser = Extractor(record['url'])
        parser.feed(body)
        record.update(title=' '.join(''.join(parser.title).split()), lines=parser.lines(),
                      links=parser.links, date_metadata=parser.dates)
    elif kind == 'text/plain':
        record.update(title=None, lines=body.splitlines(), links=[], date_metadata={})
    else:
        raise ValueError(f'Unsupported page type: {kind}. Only HTML and plain text are supported.')
    record['evidence_kind'] = 'direct-http-extracted-page'
    return save(cache, record)


def search(cache, query):
    # Bing RSS is an external public endpoint, not a guaranteed search API.
    record, body = fetch('https://www.bing.com/search?' + urlencode({'q': query, 'format': 'rss'}))
    root = ET.fromstring(body)
    if root.tag != 'rss':
        raise ValueError('Search endpoint did not return RSS; no search results saved.')
    results, lines = [], []
    for item in root.findall('./channel/item')[:10]:
        url = item.findtext('link', '')
        try:
            checked_url(url)
        except ValueError:
            continue
        result = {'id': len(results), 'title': item.findtext('title'), 'url': url,
                  'snippet': item.findtext('description'), 'feed_date': item.findtext('pubDate')}
        results.append(result)
        lines.append(json.dumps(result, ensure_ascii=False))
    record.update(evidence_kind='search-snippets', query=query, title='Bing RSS search',
                  results=results, links=[{'id': r['id'], 'url': r['url']} for r in results],
                  lines=lines, date_metadata={})
    return save(cache, record)


def excerpt(record, start, count, cached=False):
    result = {key: value for key, value in record.items() if key != 'lines'}
    result['cached_read'] = cached
    result['http_status_context'] = 'Status of original fetch, not a new request.' if cached else 'Status of this fetch.'
    result['total_lines'] = len(record['lines'])
    result['lines'] = [{'line': i + 1, 'text': line} for i, line in enumerate(record['lines']) if start <= i + 1 < start + count]
    result['more_lines'] = start + count <= len(record['lines'])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, default=Path(tempfile.gettempdir()) / f'research-politics-web-{os.getuid()}')
    parser.add_argument('--lines', type=int, default=80, help='Maximum lines to display (1–500).')
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('open').add_argument('url')
    commands.add_parser('search').add_argument('query')
    follow = commands.add_parser('click')
    follow.add_argument('ref')
    follow.add_argument('link_id', type=int)
    read = commands.add_parser('read')
    read.add_argument('ref')
    read.add_argument('--line', type=int, default=1, help='First line (1-based).')
    args = parser.parse_args()
    try:
        if not 1 <= args.lines <= 500:
            raise ValueError('--lines must be between 1 and 500.')
        if args.command == 'open':
            result = excerpt(open_page(args.cache_dir, args.url), 1, args.lines)
        elif args.command == 'search':
            if not args.query.strip():
                raise ValueError('Search query cannot be empty.')
            result = excerpt(search(args.cache_dir, args.query), 1, args.lines)
        elif args.command == 'click':
            page = load(args.cache_dir, args.ref)
            links = {link['id']: link['url'] for link in page['links']}
            if args.link_id not in links:
                raise ValueError('Link ID does not exist in the stored page.')
            result = excerpt(open_page(args.cache_dir, links[args.link_id]), 1, args.lines)
        else:
            page = load(args.cache_dir, args.ref)
            if not 1 <= args.line <= max(1, len(page['lines'])):
                raise ValueError('Line is outside the stored page.')
            result = excerpt(page, args.line, args.lines, cached=True)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except HTTPError as error:
        print(json.dumps({'error': 'HTTP request failed', 'http_status': error.code}), file=sys.stderr)
    except URLError as error:
        print(json.dumps({'error': 'Network or proxy request failed', 'detail': str(error.reason)}), file=sys.stderr)
    except (ValueError, OSError, ET.ParseError, LookupError) as error:
        print(json.dumps({'error': str(error)}), file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
