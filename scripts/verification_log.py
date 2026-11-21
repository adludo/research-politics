#!/usr/bin/env python3
"""Lossless, deterministic normalization of verification logs to schema version 2."""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import sys

SOURCE_FIELDS = ('url', 'publisher', 'title', 'publicationDate', 'updateDate', 'crawlDate')
EVIDENCE_FIELDS = ('retrievedAt', 'method', 'quote', 'locator', 'accessNote')


def intern(table, prefix, record):
    canonical = json.dumps(record, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    record_id = prefix + hashlib.sha256(canonical.encode()).hexdigest()[:16]
    if record_id in table and table[record_id] != record:
        raise ValueError(f'Record hash collision: {record_id}')
    table.setdefault(record_id, record)
    return record_id


def normalize(log):
    """Migrate inline records; existing v2 IDs are preserved on repeated runs."""
    if log.get('schemaVersion') == 2:
        expand(log)
        return deepcopy(log)
    if 'schemaVersion' in log:
        raise ValueError('Unsupported verification schema version.')
    result = {'schemaVersion': 2, 'sources': {}, 'evidence': {}, 'runs': deepcopy(log['runs'])}
    sources, evidence = result['sources'], result['evidence']
    by_url = {}
    for run in log['runs']:
        for finding in run['findings']:
            for item in finding['evidence']:
                record = {key: item[key] for key in SOURCE_FIELDS}
                source_id = intern(sources, 'source-', record)
                by_url.setdefault(item['url'], source_id)
    for run in result['runs']:
        for finding in run['findings']:
            source_ids = []
            for url in finding.pop('sourceUrls'):
                if url not in by_url:
                    record = {key: None for key in SOURCE_FIELDS}
                    record['url'] = url
                    by_url[url] = intern(sources, 'source-', record)
                source_ids.append(by_url[url])
            evidence_ids = []
            for item in finding.pop('evidence'):
                source_id = intern(sources, 'source-', {key: item[key] for key in SOURCE_FIELDS})
                record = {'sourceId': source_id, **{key: item[key] for key in EVIDENCE_FIELDS}}
                evidence_ids.append(intern(evidence, 'evidence-', record))
            finding['sourceIds'] = source_ids
            finding['evidenceIds'] = evidence_ids
    if expand(result) != log:
        raise ValueError('Migration would lose or change verification information.')
    return result


def expand(log):
    """Reconstruct inline records for validation and lossless migration checks."""
    if log.get('schemaVersion') != 2:
        raise ValueError('Expected verification schemaVersion 2.')
    result = {'runs': deepcopy(log['runs'])}
    for run in result['runs']:
        for finding in run['findings']:
            finding['sourceUrls'] = [log['sources'][key]['url'] for key in finding.pop('sourceIds')]
            items = []
            for key in finding.pop('evidenceIds'):
                item = log['evidence'][key]
                source = log['sources'][item['sourceId']]
                items.append({**deepcopy(source), **{field: item[field] for field in EVIDENCE_FIELDS}})
            finding['evidence'] = items
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', nargs='?', type=Path, default=Path('data/verification-runs.json'))
    parser.add_argument('--write', action='store_true', help='Atomically replace the input; otherwise print JSON.')
    args = parser.parse_args()
    try:
        log = normalize(json.loads(args.path.read_text()))
        output = json.dumps(log, ensure_ascii=False, indent=2) + '\n'
        if args.write:
            pending = args.path.with_suffix('.json.tmp')
            pending.write_text(output)
            pending.replace(args.path)
            print(f"Normalized {len(log['runs'])} runs, {len(log['sources'])} sources, {len(log['evidence'])} evidence records.")
        else:
            print(output, end='')
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(f'Normalization failed: {error}', file=sys.stderr)
        sys.exit(1)
