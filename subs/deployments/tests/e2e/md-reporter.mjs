/**
 * Minimal markdown reporter for the deployments Playwright suite (#554) — zero
 * dependencies, matching the rest of this test suite's tooling ethos. Writes a
 * per-run report (steps, pass/fail, duration) to a local `.md` file; ephemeral,
 * like `test-results/` — not committed (see .gitignore).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

function fmtSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export default class MarkdownReporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile || 'test-results/report.md';
    this.tests = [];
  }

  onTestEnd(test, result) {
    this.tests.push({
      title: test.titlePath().filter(Boolean).join(' › '),
      status: result.status,
      duration: result.duration,
      steps: result.steps
        .filter((s) => s.category === 'test.step')
        .map((s) => ({ title: s.title, duration: s.duration, error: s.error?.message })),
      error: result.error?.message,
      attachments: result.attachments.map((a) => a.path).filter(Boolean),
    });
  }

  onEnd(result) {
    const lines = [];
    const passed = this.tests.filter((t) => t.status === 'passed').length;
    const failed = this.tests.filter((t) => t.status !== 'passed' && t.status !== 'skipped').length;
    const skipped = this.tests.filter((t) => t.status === 'skipped').length;

    lines.push('# Deployments E2E — Run Report');
    lines.push('');
    lines.push(`**Date:** ${new Date().toISOString()}`);
    lines.push(`**Overall:** ${result.status.toUpperCase()}`);
    lines.push(`**Tests:** ${passed} passed, ${failed} failed, ${skipped} skipped`);
    lines.push('');
    lines.push('| Test | Status | Duration |');
    lines.push('|---|---|---|');
    for (const t of this.tests) {
      lines.push(`| ${t.title} | ${t.status} | ${fmtSeconds(t.duration)} |`);
    }
    lines.push('');

    for (const t of this.tests) {
      lines.push(`## ${t.title}`);
      lines.push('');
      lines.push(`Status: **${t.status}** · Duration: ${fmtSeconds(t.duration)}`);
      lines.push('');
      for (const s of t.steps) {
        const icon = s.error ? '❌' : '✅';
        lines.push(`- ${icon} ${s.title} — ${fmtSeconds(s.duration)}`);
        if (s.error) lines.push(`  - **Error:** ${s.error.split('\n')[0]}`);
      }
      if (t.error) {
        lines.push('');
        lines.push(`**Failure:** ${t.error.split('\n')[0]}`);
      }
      if (t.attachments.length) {
        lines.push('');
        lines.push(`Attachments: ${t.attachments.map((p) => `\`${p}\``).join(', ')}`);
      }
      lines.push('');
    }

    mkdirSync(dirname(this.outputFile), { recursive: true });
    writeFileSync(this.outputFile, lines.join('\n'));
    console.log(`[md-reporter] wrote ${this.outputFile}`);
  }
}
