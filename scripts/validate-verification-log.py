#!/usr/bin/env python3
"""Validate log structure/provenance fields; this does not fact-check evidence."""
from datetime import date, datetime
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from verification_log import expand, pack, unpack, SOURCE_FIELDS, EVIDENCE_FIELDS

STATUSES = {'supported', 'contradicted', 'partial', 'outdated', 'missing-reference', 'inaccessible', 'unverifiable'}
METHODS = {'direct-http', 'extracted-page', 'search-snippet', 'supplied-document'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value):
    return isinstance(value, str) and bool(value.strip())


def stamp(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    require(parsed.tzinfo is not None, 'Timestamps need an explicit timezone.')
    return parsed


def url(value):
    parsed = urlsplit(value)
    require(parsed.scheme in {'http', 'https'} and parsed.hostname and not parsed.username and not parsed.password,
            'Evidence needs public HTTP(S) URLs without embedded credentials.')


def validate_runs(log):
    require(isinstance(log, dict) and isinstance(log.get('runs'), list), 'Expected a runs array.')
    seen = {}
    for run in log['runs']:
        require(re.fullmatch(r'run-[a-z0-9-]+', run['id']) and run['id'] not in seen, 'Run IDs must be unique URL-safe run-* values.')
        require(text(run['target']) and not run['target'].startswith('//'), 'Target page is required.')
        require(stamp(run['completedAt']) >= stamp(run['startedAt']), 'Completion precedes start.')
        date.fromisoformat(run['researchAsOf'])
        require(re.fullmatch(r'(?:[a-f0-9]{40}|[a-f0-9]{64})', run['revision']), 'Full Git revision required.')
        require(type(run['dirty']) is bool, 'dirty must be boolean.')
        require(run['status'] in {'complete', 'incomplete'} and text(run['summary']), 'Run status and summary required.')
        require(isinstance(run['reviewedFiles'], list) and run['reviewedFiles'], 'Reviewed file hashes required.')
        for file in run['reviewedFiles']:
            require(text(file['path']) and re.fullmatch(r'[a-f0-9]{64}', file['sha256']), 'Invalid reviewed file/hash.')
        previous = run['supersedesRunId']
        if previous is not None:
            require(previous in seen and seen[previous] == run['target'], 'Previous run must exist earlier for the same target.')
        ids = set()
        require(isinstance(run['findings'], list) and run['findings'], 'Record findings; a zero-claim run is not an audit.')
        for finding in run['findings']:
            require(text(finding['claimId']) and finding['claimId'] not in ids, 'Claim IDs must be unique within a run.')
            ids.add(finding['claimId'])
            require(all(text(finding[k]) for k in ['location', 'statement', 'explanation']), 'Finding text/location required.')
            require(finding['status'] in STATUSES, 'Unknown finding status.')
            require(finding['suggestedCorrection'] is None or text(finding['suggestedCorrection']), 'Invalid correction.')
            require(isinstance(finding['sourceUrls'], list) and isinstance(finding['evidence'], list), 'Source/evidence arrays required.')
            for source in finding['sourceUrls']:
                url(source)
            for evidence in finding['evidence']:
                url(evidence['url'])
                stamp(evidence['retrievedAt'])
                require(evidence['method'] in METHODS and text(evidence['accessNote']), 'Evidence method and access note required.')
                for field in ['publisher', 'title', 'publicationDate', 'updateDate', 'crawlDate', 'quote', 'locator']:
                    require(evidence[field] is None or text(evidence[field]), f'Invalid evidence field: {field}')
            if finding['status'] in {'supported', 'contradicted', 'partial', 'outdated'}:
                require(finding['sourceUrls'] and any(text(e.get('quote')) and text(e.get('locator')) and e['method'] != 'search-snippet' for e in finding['evidence']),
                        'Source-based findings need a fuller-source quote and locator, not only a snippet.')
            if finding['status'] in {'inaccessible', 'unverifiable'}:
                require(run['status'] == 'incomplete', 'Unresolved evidence gaps require an incomplete run.')
        seen[run['id']] = run['target']
    return len(seen)


def validate(log):
    if isinstance(log, dict) and log.get('schemaVersion') == 3:
        expanded = unpack(log)
        require(pack(expanded) == log, 'Packed log contains noncanonical, duplicate or unused records.')
        return validate_v2(expanded)
    return validate_v2(log)


def validate_v2(log):
    require(isinstance(log, dict) and log.get('schemaVersion') == 2, 'Expected schemaVersion 2; normalize legacy logs first.')
    require(set(log) == {'schemaVersion', 'sources', 'evidence', 'runs'}, 'Unexpected log fields.')
    require(isinstance(log['sources'], dict) and isinstance(log['evidence'], dict), 'Expected shared record maps.')
    source_records, evidence_records = set(), set()
    for key, source in log['sources'].items():
        require(re.fullmatch(r'source-[a-z0-9-]+', key), 'Invalid source ID.')
        require(isinstance(source, dict) and set(source) == set(SOURCE_FIELDS), 'Unexpected source fields.')
        url(source['url'])
        for field in SOURCE_FIELDS[1:]:
            require(source[field] is None or text(source[field]), f'Invalid source field: {field}')
        canonical = json.dumps(source, sort_keys=True)
        require(canonical not in source_records, 'Duplicate source record; reuse its ID.')
        source_records.add(canonical)
    for key, evidence in log['evidence'].items():
        require(re.fullmatch(r'evidence-[a-z0-9-]+', key), 'Invalid evidence ID.')
        require(isinstance(evidence, dict) and set(evidence) == {'sourceId', *EVIDENCE_FIELDS}, 'Unexpected evidence fields.')
        require(evidence['sourceId'] in log['sources'], 'Dangling evidence sourceId.')
        canonical = json.dumps(evidence, sort_keys=True)
        require(canonical not in evidence_records, 'Duplicate evidence record; reuse its ID.')
        evidence_records.add(canonical)
        stamp(evidence['retrievedAt'])
        require(evidence['method'] in METHODS and text(evidence['accessNote']), 'Invalid evidence metadata.')
        for field in ['quote', 'locator']:
            require(evidence[field] is None or text(evidence[field]), f'Invalid evidence field: {field}')
    require(isinstance(log['runs'], list), 'Expected runs array.')
    used_sources, used_evidence = set(), set()
    for run in log['runs']:
        for finding in run['findings']:
            require('sourceUrls' not in finding and 'evidence' not in finding, 'Findings must use IDs, not inline records.')
            require(isinstance(finding['sourceIds'], list) and isinstance(finding['evidenceIds'], list), 'Expected reference ID arrays.')
            for key in finding['sourceIds']:
                require(isinstance(key, str) and key in log['sources'], 'Dangling finding source ID.')
                used_sources.add(key)
            for key in finding['evidenceIds']:
                require(isinstance(key, str) and key in log['evidence'], 'Dangling finding evidence ID.')
                used_evidence.add(key)
                used_sources.add(log['evidence'][key]['sourceId'])
    require(used_sources == set(log['sources']) and used_evidence == set(log['evidence']), 'Unused shared records; keep the log lean.')
    return validate_runs(expand(log))


if __name__ == '__main__':
    try:
        path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('data/verification-runs.json')
        count = validate(json.loads(path.read_text()))
        print(f'Valid verification log: {count} runs. Evidence accuracy still requires review.')
    except (OSError, ValueError, KeyError, TypeError, AttributeError) as error:
        print(f'Invalid verification log: {error}', file=sys.stderr)
        sys.exit(1)
