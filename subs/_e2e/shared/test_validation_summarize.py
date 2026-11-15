"""Fixtures-in-code tests for validation_summarize.py (#679). Run: python3 -m pytest subs/_e2e/shared"""
import json
from validation_summarize import parse_junit, parse_playwright, summarise

PW = {'suites': [{'title': 'a.spec.ts', 'specs': [], 'suites': [{'title': 'Group', 'specs': [
    {'title': 'ok', 'tests': [{'status': 'expected', 'results': [{'status': 'passed', 'duration': 120}]}]},
    {'title': 'bad', 'tests': [{'status': 'unexpected', 'results': [{'status': 'failed', 'duration': 80,
        'error': {'message': 'Expected X\nreceived Y\nstack...'}}]}]},
    {'title': 'skip', 'tests': [{'status': 'skipped', 'results': [{'status': 'skipped', 'duration': 0}]}]},
]}]}]}

JU = '''<testsuites><testsuite>
<testcase classname="handlers.x.test_a" name="test_ok" time="0.5"/>
<testcase classname="handlers.x.test_a" name="test_bad" time="0.1"><failure message="boom&#10;more">tb</failure></testcase>
<testcase classname="handlers.x.test_a" name="test_skip" time="0"><skipped/></testcase>
</testsuite></testsuites>'''


def test_playwright():
    r = summarise('s', 'e2e', parse_playwright(PW))
    assert (r['passed'], r['failed'], r['skipped'], r['total']) == (1, 1, 1, 3)
    assert r['tests'][0]['title'] == 'Group > ok'
    assert r['tests'][1]['error'] == 'Expected X'


def test_junit():
    r = summarise('s', 'unit', parse_junit(JU))
    assert (r['passed'], r['failed'], r['skipped']) == (1, 1, 1)
    assert r['tests'][1]['error'] == 'boom' and r['tests'][0]['durationMs'] == 500
