#!/usr/bin/env python3
"""Pack verification logs losslessly and append dated runs."""
import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import sys
import tempfile

SOURCE_FIELDS = ('url', 'publisher', 'title', 'publicationDate', 'updateDate', 'crawlDate')
EVIDENCE_FIELDS = ('retrievedAt', 'method', 'quote', 'locator', 'accessNote')
RETRIEVAL_FIELDS = ('sourceId', 'retrievedAt', 'method', 'accessNote')
PASSAGE_FIELDS = ('quote', 'locator')
CLAIM_FIELDS = ('claimId', 'location', 'statement')
OUTCOME_FIELDS = ('status', 'explanation', 'suggestedCorrection')


def intern(table, prefix, record):
    canonical = json.dumps(record, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    record_id = prefix + hashlib.sha256(canonical.encode()).hexdigest()[:16]
    if record_id in table and table[record_id] != record:
        raise ValueError(f'Record hash collision: {record_id}')
    table.setdefault(record_id, record)
    return record_id


def normalize_v2(log):
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


def pack(log):
    """Share stable text and retrieval metadata separately from run findings."""
    packed = {
        'schemaVersion': 3, 'sources': log['sources'], 'retrievals': {},
        'passages': {}, 'evidence': {}, 'claims': {}, 'outcomes': {}, 'runs': [],
    }
    for key, record in log['evidence'].items():
        retrieval = intern(packed['retrievals'], 'retrieval-', {f: record[f] for f in RETRIEVAL_FIELDS})
        passage = intern(packed['passages'], 'passage-', {f: record[f] for f in PASSAGE_FIELDS})
        packed['evidence'][key] = [retrieval, passage]
    for run in log['runs']:
        findings = []
        for finding in run['findings']:
            claim = intern(packed['claims'], 'claim-', {f: finding[f] for f in CLAIM_FIELDS})
            outcome = intern(packed['outcomes'], 'outcome-', {f: finding[f] for f in OUTCOME_FIELDS})
            findings.append(dict(
                claim=claim, outcome=outcome,
                sourceIds=finding['sourceIds'], evidenceIds=finding['evidenceIds'],
            ))
        packed['runs'].append({**run, 'findings': findings})
    return packed


def unpack(log):
    """Read the editable v2 representation from any supported format."""
    if log.get('schemaVersion') != 3:
        return normalize_v2(log)
    evidence = {
        key: {**log['retrievals'][retrieval], **log['passages'][passage]}
        for key, (retrieval, passage) in log['evidence'].items()
    }
    runs = []
    for run in log['runs']:
        findings = []
        for finding in run['findings']:
            findings.append({
                **log['claims'][finding['claim']],
                **log['outcomes'][finding['outcome']],
                'sourceIds': finding['sourceIds'],
                'evidenceIds': finding['evidenceIds'],
            })
        runs.append({**run, 'findings': findings})
    return {'schemaVersion': 2, 'sources': log['sources'], 'evidence': evidence, 'runs': runs}


def format_packed(log):
    """Use one line per shared record and finding to keep Git diffs readable."""
    def line(value):
        return json.dumps(value, ensure_ascii=False, separators=(',', ': '))

    def table(records):
        rows = [f'    {line(key)}: {line(value)}' for key, value in records.items()]
        return '{\n' + ',\n'.join(rows) + '\n  }' if rows else '{}'

    def run_record(run):
        head = json.dumps({key: value for key, value in run.items() if key != 'findings'}, ensure_ascii=False, indent=2)
        head = '\n'.join('    ' + row for row in head.splitlines()[:-1])
        findings = ',\n'.join('        ' + line(finding) for finding in run['findings'])
        return head + ',\n      "findings": [\n' + findings + '\n      ]\n    }'

    fields = ['  "schemaVersion": 3']
    fields.extend(f'  {line(key)}: {table(value)}' for key, value in log.items() if key not in ('schemaVersion', 'runs'))
    runs = ',\n'.join(run_record(run) for run in log['runs'])
    fields.append('  "runs": [\n' + runs + '\n  ]' if runs else '  "runs": []')
    return '{\n' + ',\n'.join(fields) + '\n}\n'


def append_run(log, addition):
    if addition.get('schemaVersion') != 2 or len(addition['runs']) != 1:
        raise ValueError('Append input must be a v2 document containing one run.')
    for table in ('sources', 'evidence'):
        for key, value in addition[table].items():
            if key in log[table] and log[table][key] != value:
                raise ValueError(f'Conflicting {table} ID: {key}')
            log[table][key] = value
    log['runs'].extend(addition['runs'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', nargs='?', type=Path, default=Path('data/verification-runs.json'))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--write', action='store_true', help='Atomically migrate the input in place.')
    mode.add_argument('--unpack', action='store_true', help='Print an editable v2 view to stdout.')
    mode.add_argument('--append', type=Path, metavar='RUN', help='Validate and append one run from a v2 document.')
    args = parser.parse_args()
    try:
        from importlib import import_module
        validate = import_module('validate-verification-log').validate
        original = args.path.read_bytes()
        stored = json.loads(original)
        if stored.get('schemaVersion') == 3:
            validate(stored)
        log = unpack(stored)
        if args.unpack:
            print(json.dumps(log, ensure_ascii=False, indent=2))
            return
        if args.append:
            append_run(log, json.loads(args.append.read_text()))
        packed = pack(log)
        if unpack(packed) != log:
            raise ValueError('Migration would lose or change verification information.')
        count = validate(packed)
        output = format_packed(packed)
        if args.write or args.append:
            with tempfile.NamedTemporaryFile(dir=args.path.parent, delete=False, mode='w', encoding='utf-8') as pending:
                pending.write(output)
            try:
                if args.path.read_bytes() != original:
                    raise ValueError('Verification log changed during write. Retry the update.')
                Path(pending.name).replace(args.path)
            finally:
                Path(pending.name).unlink(missing_ok=True)
            print(f'Packed {count} verification runs.')
        else:
            print(output, end='')
    except (ValueError, OSError, KeyError, TypeError, AttributeError) as error:
        print(f'Verification log update failed: {error}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
