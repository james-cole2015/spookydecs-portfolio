"""
Normalise Playwright JSON / pytest junit results for the admin Run Validation runner (#679).

Runs in the sd-validation-runner CodeBuild post_build step (dev only). Stores only test titles,
statuses, durations and a truncated first-line error -- this repo is public and the DDB table is
the private record. Lives under subs/_e2e/shared (tracked) because Portfolio scripts/* is gitignored
and so would not be present in the build's clone.

  python3 validation_summarize.py --format playwright --input pw.json --sub gallery --suite e2e
  python3 validation_summarize.py --format junit --input junit.xml --sub gallery --suite unit
Writes to DDB (env RUN_ID, TABLE_NAME) unless --print is given.
"""
import argparse
import json
import os
import sys
import time
import xml.etree.ElementTree as ET

MAX_ERR = 300
TTL_DAYS = 180


def _err(msg):
    if not msg:
        return None
    line = str(msg).strip().splitlines()[0] if str(msg).strip() else ''
    return line[:MAX_ERR] or None


def _status(s):
    return {'passed': 'passed', 'skipped': 'skipped'}.get(s, 'failed')


def parse_playwright(data):
    tests = []

    def walk(suite, prefix):
        title = suite.get('title') or ''
        # The top-level suite title is the spec file name; keep describe-block titles only.
        path = prefix + ([title] if title and not title.endswith(('.ts', '.js')) else [])
        for spec in suite.get('specs', []):
            for t in spec.get('tests', []):
                results = t.get('results') or [{}]
                last = results[-1]
                st = t.get('status') or last.get('status')
                status = 'passed' if st == 'expected' else 'skipped' if st == 'skipped' else _status(last.get('status'))
                if st == 'flaky':
                    status = 'passed'
                e = (last.get('error') or {}).get('message') if last.get('error') else None
                tests.append({
                    'title': ' > '.join(path + [spec.get('title', '')]),
                    'status': status,
                    'durationMs': int(sum(r.get('duration', 0) for r in results)),
                    **({'error': _err(e)} if status == 'failed' and _err(e) else {}),
                })
        for child in suite.get('suites', []):
            walk(child, path)

    for s in data.get('suites', []):
        walk(s, [])
    return tests


def parse_junit(xml_text):
    root = ET.fromstring(xml_text)
    tests = []
    for tc in root.iter('testcase'):
        failure = tc.find('failure')
        if failure is None:
            failure = tc.find('error')
        status = 'failed' if failure is not None else 'skipped' if tc.find('skipped') is not None else 'passed'
        cls = tc.get('classname', '')
        tests.append({
            'title': f"{cls.split('.')[-1]}::{tc.get('name', '')}" if cls else tc.get('name', ''),
            'status': status,
            'durationMs': int(float(tc.get('time', 0)) * 1000),
            **({'error': _err(failure.get('message') or failure.text)} if failure is not None and _err(failure.get('message') or failure.text) else {}),
        })
    return tests


def summarise(sub, suite, tests):
    counts = {k: sum(1 for t in tests if t['status'] == k) for k in ('passed', 'failed', 'skipped')}
    return {'sub': sub, 'suite': suite, 'tests': tests, **counts, 'total': len(tests)}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--format', choices=['playwright', 'junit'], required=True)
    p.add_argument('--input', required=True)
    p.add_argument('--sub', required=True)
    p.add_argument('--suite', choices=['e2e', 'unit'], required=True)
    p.add_argument('--print', action='store_true', help='print instead of writing to DDB')
    a = p.parse_args()

    try:
        raw = open(a.input, encoding='utf-8').read()
        tests = parse_playwright(json.loads(raw)) if a.format == 'playwright' else parse_junit(raw)
        result = summarise(a.sub, a.suite, tests)
    except (OSError, ValueError, ET.ParseError) as e:
        # No/garbled report = the suite never produced results (build error, not a test failure).
        result = {'sub': a.sub, 'suite': a.suite, 'tests': [], 'passed': 0, 'failed': 0, 'skipped': 0,
                  'total': 0, 'errored': True, 'error': _err(f'no usable report: {e}')}

    if a.print:
        print(json.dumps(result, indent=2))
        return 0

    import boto3
    from boto3.dynamodb.types import TypeSerializer
    run_id, table = os.environ['RUN_ID'], os.environ['TABLE_NAME']
    item = {'PK': f'RUN#{run_id}', 'SK': f'SUB#{a.sub}#{a.suite}', 'ttl': int(time.time()) + TTL_DAYS * 86400, **result}
    ser = TypeSerializer()
    boto3.client('dynamodb', region_name='us-east-2').put_item(
        TableName=table, Item={k: ser.serialize(v) for k, v in item.items()})
    print(f"{a.sub}/{a.suite}: {result['passed']}/{result['total']} passed, {result['failed']} failed")
    return 0


if __name__ == '__main__':
    sys.exit(main())
