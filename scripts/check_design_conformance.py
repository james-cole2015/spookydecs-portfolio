#!/usr/bin/env python3
"""
check_design_conformance.py

Enforces the mechanically-checkable subset of the SpookyDecs design system
(docs-spookydecs/design.md) across the React subs. Where check_sub_migration.py
is a temporary completeness gate (retirable once the migration lands), this is a
*permanent* drift guard: it fails when a sub reintroduces a per-sub token block,
a hardcoded hex, a re-rolled ConfirmDialog/FilterBar/chip helper, or off-canon
season casing.

Static scan only (regex over source) — no build, no install. Sibling to
check_sub_migration.py; both share scan_common.py for the file walk, Report
model, report writer, and CLI/exit-code contract.

Rules (check-id — design.md source — level):
    root-tokens     F7  fail   no per-sub :root token block (src/ css/ts/tsx)
    hardcoded-hex   F5  fail   no hardcoded hex color in .tsx
    chip-helpers    F1  fail   no local *ChipColor helper definitions
    confirm-dialog  F2  fail   no local ConfirmDialog copy
    filter-bar      F3  fail   no local FilterBar / FilterPanel copy
    app-shell       F4  warn   AppHeader must not nest inside PageContainer
    season-casing   §5  fail   canonical season casing (Halloween/Christmas/Shared)

Sanctioned exceptions live in scripts/design-conformance.yaml (a per-sub allowlist
keyed by check-id; `all` skips the sub). It mirrors design.md §8 — adding an
exception is a data edit, never a code edit.

Usage:
    python3 scripts/check_design_conformance.py storage
    python3 scripts/check_design_conformance.py storage --strict   # warns -> failures
    python3 scripts/check_design_conformance.py --all              # every workspace sub

Exit code 0 = clean, 1 = problems found (see report).
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import yaml

from scan_common import (
    ROOT,
    SUBS_DIR,
    Report,
    _outcome,
    _src_files,
    build_parser,
    render_markdown,
    resolve_targets,
    write_dated_report,
)

# Dated markdown reports land here unless --out overrides it.
REPORTS_DIR = ROOT / "app_docs" / "design-checks"
# Machine-readable mirror of design.md §8 (per-sub check-id allowlist).
MANIFEST_PATH = Path(__file__).resolve().parent / "design-conformance.yaml"

# ---------------------------------------------------------------------------
# Rule metadata: id -> (design.md source, default level, one-line title). The
# title feeds the console/markdown grouping; the level is the finding's level.
# ---------------------------------------------------------------------------
ROOT_TOKENS = "root-tokens"
HARDCODED_HEX = "hardcoded-hex"
CHIP_HELPERS = "chip-helpers"
CONFIRM_DIALOG = "confirm-dialog"
FILTER_BAR = "filter-bar"
APP_SHELL = "app-shell"
SEASON_CASING = "season-casing"

CHECK_TITLES = {
    ROOT_TOKENS: "F7 · no per-sub :root token block",
    HARDCODED_HEX: "F5 · no hardcoded hex in .tsx",
    CHIP_HELPERS: "F1 · no local chip-color helpers",
    CONFIRM_DIALOG: "F2 · no local ConfirmDialog copy",
    FILTER_BAR: "F3 · no local FilterBar/FilterPanel copy",
    APP_SHELL: "F4 · AppHeader outside PageContainer",
    SEASON_CASING: "§5 · canonical season casing",
}

# design.md §5 canonical season vocabulary.
CANONICAL_SEASONS = {"Halloween", "Christmas", "Shared"}

# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------
# F7: a :root selector anywhere in a source stylesheet or CSS-in-JS/TS. HeroUI
# compiles :root into the built bundle, so we scope to src/ (dist/ and legacy
# css/ dirs are never scanned — see _src_files / _src_css_files).
ROOT_RE = re.compile(r":root\b")

# F5: hex color literal in .tsx. Bounded to 3-6 hex digits per design.md §11.
HEX_RE = re.compile(r"#[0-9a-fA-F]{3,6}\b")

# F1: a LOCAL definition (not import) of a canonical chip-color helper.
CHIP_HELPER_NAMES = (
    "seasonChipColor", "stateChipColor", "priorityChipColor",
    "effortChipColor", "criticalityChipColor", "getStatusChipColor",
)
CHIP_DEF_RE = re.compile(
    r"\b(?:export\s+)?(?:function|const|let|var)\s+(" + "|".join(CHIP_HELPER_NAMES) + r")\b"
)

# F2 / F3: local definitions of package-owned components.
CONFIRM_DEF_RE = re.compile(
    r"\b(?:export\s+)?(?:default\s+)?(?:function|const|class)\s+ConfirmDialog\b"
)
FILTER_DEF_RE = re.compile(
    r"\b(?:export\s+)?(?:default\s+)?(?:function|const|class)\s+(FilterBar|FilterPanel)\b"
)

# §5: a quoted season literal in any (non-canonical) casing.
SEASON_LITERAL_RE = re.compile(r"""['"]([A-Za-z]+)['"]""")
_SEASON_WORDS = {"halloween", "christmas", "shared"}

# §5 governs the *chip / status color vocabulary* (Halloween/Christmas/Shared),
# which the shared seasonChipColor switch keys on. It does NOT govern the
# photo-service `season` routing key or the landing theme key — those are
# deliberately lowercase (halloween/christmas/shared/plain: S3 paths, the CDN
# upload modal attribute, `?season=` overrides). So the casing rule fires only in
# a chip context and never on photo/routing/theme lines, to avoid punishing the
# sanctioned lowercase usage.
CHIP_CTX_RE = re.compile(r"Chip|chipColor|ChipColor", re.IGNORECASE)
SEASON_ROUTING_CTX_RE = re.compile(
    r"PhotoGallery|photoType|\.toLowerCase\(\)|SeasonProvider|data-season|Placeholder"
)


def _src_css_files(sub_dir: Path) -> list[Path]:
    """Every .css file under the sub's src/ (empty if there is no src/)."""
    src = sub_dir / "src"
    if not src.is_dir():
        return []
    return [p for p in src.rglob("*.css")]


def _strip_comments(text: str) -> str:
    """Blank out // and /* */ comments while preserving string literals and line
    numbers. Essential here: code carries `(#348)` issue refs and prose like
    ('halloween' -> 'Halloween') in comments that would otherwise read as hex
    colors / off-canon season literals. Newlines inside block comments are kept
    so line-based findings still report accurate line numbers."""
    out: list[str] = []
    i, n = 0, len(text)
    quote: str | None = None
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if quote:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(nxt)
                i += 2
                continue
            if c == quote:
                quote = None
            i += 1
            continue
        if c in ("'", '"', "`"):
            quote = c
            out.append(c)
            i += 1
            continue
        if c == "/" and nxt == "/":
            while i < n and text[i] != "\n":
                i += 1
            continue
        if c == "/" and nxt == "*":
            i += 2
            while i < n and not (text[i] == "*" and i + 1 < n and text[i + 1] == "/"):
                if text[i] == "\n":
                    out.append("\n")
                i += 1
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


@dataclass
class Source:
    """A source file paired with its comment-stripped text (line-preserving)."""

    path: Path
    text: str

    @property
    def suffix(self) -> str:
        return self.path.suffix

    @property
    def name(self) -> str:
        return self.path.name

    @property
    def stem(self) -> str:
        return self.path.stem


def _load_sources(files: list[Path]) -> list[Source]:
    return [
        Source(f, _strip_comments(f.read_text(encoding="utf-8", errors="replace")))
        for f in files
    ]


@dataclass
class DesignReport(Report):
    """Report plus the design checker's own (check-id-tagged) findings.

    `raw` is every finding as (check_id, level, message) before manifest
    suppression; `kept` is what survived it. The base `findings` list is
    populated from `kept` so scan_common's _outcome/render see the right totals.
    """

    raw: list[tuple[str, str, str]] = field(default_factory=list)
    kept: list[tuple[str, str, str]] = field(default_factory=list)

    def flag(self, check_id: str, level: str, message: str) -> None:
        self.raw.append((check_id, level, message))


# ---------------------------------------------------------------------------
# Individual rule checks (each appends check-id-tagged findings to the report)
# ---------------------------------------------------------------------------
def _check_root_tokens(css_sources: list[Source], ts_sources: list[Source], report: DesignReport) -> None:
    for s in css_sources + ts_sources:
        if ROOT_RE.search(s.text):
            report.flag(
                ROOT_TOKENS, "fail",
                f":root token block in {s.path.relative_to(ROOT)} — subs must not define "
                f"their own tokens; use the shared theme.ts (F7).",
            )


def _check_hardcoded_hex(ts_sources: list[Source], report: DesignReport) -> None:
    for s in ts_sources:
        if s.suffix != ".tsx":
            continue
        hits = sorted(set(HEX_RE.findall(s.text)))
        if hits:
            report.flag(
                HARDCODED_HEX, "fail",
                f"Hardcoded hex color(s) {', '.join(hits)} in {s.path.relative_to(ROOT)} — "
                f"use semantic tokens (breaks dark/light parity) (F5).",
            )


def _check_chip_helpers(ts_sources: list[Source], report: DesignReport) -> None:
    for s in ts_sources:
        for name in sorted(set(CHIP_DEF_RE.findall(s.text))):
            report.flag(
                CHIP_HELPERS, "fail",
                f"Local chip-color helper '{name}' in {s.path.relative_to(ROOT)} — import "
                f"the shared helper from @spookydecs/ui (F1).",
            )


def _check_confirm_dialog(ts_sources: list[Source], report: DesignReport) -> None:
    for s in ts_sources:
        if s.name == "ConfirmDialog.tsx" or CONFIRM_DEF_RE.search(s.text):
            report.flag(
                CONFIRM_DIALOG, "fail",
                f"Local ConfirmDialog in {s.path.relative_to(ROOT)} — use the shared "
                f"ConfirmDialog / useConfirm from @spookydecs/ui (F2).",
            )


def _check_filter_bar(ts_sources: list[Source], report: DesignReport) -> None:
    for s in ts_sources:
        names = set(FILTER_DEF_RE.findall(s.text))
        if s.name in ("FilterBar.tsx", "FilterPanel.tsx"):
            names.add(s.stem)
        for name in sorted(names):
            report.flag(
                FILTER_BAR, "fail",
                f"Local {name} in {s.path.relative_to(ROOT)} — use the shared FilterBar "
                f"from @spookydecs/ui (F3).",
            )


def _check_app_shell(ts_sources: list[Source], report: DesignReport) -> None:
    """Warn-level JSX-order heuristic: <AppHeader> nested inside <PageContainer>.

    Regex approximation only — a match should be human-confirmed, hence warn.
    Conformant shells render <AppHeader/> as a full-bleed sibling BEFORE the
    <PageContainer> well.
    """
    for s in ts_sources:
        if s.suffix != ".tsx":
            continue
        text = s.text
        open_pc = text.find("<PageContainer")
        header = text.find("<AppHeader")
        if open_pc == -1 or header == -1:
            continue
        close_pc = text.find("</PageContainer>", open_pc)
        if close_pc != -1 and open_pc < header < close_pc:
            report.flag(
                APP_SHELL, "warn",
                f"<AppHeader> appears inside <PageContainer> in {s.path.relative_to(ROOT)} — "
                f"render it as a full-bleed sibling before the container (F4; confirm).",
            )


def _check_season_casing(ts_sources: list[Source], report: DesignReport) -> None:
    for s in ts_sources:
        for lineno, line in enumerate(s.text.splitlines(), 1):
            # Only chip-vocabulary lines are in §5 scope; photo/routing/theme
            # lines legitimately use lowercase season keys and are exempt.
            if not CHIP_CTX_RE.search(line) or SEASON_ROUTING_CTX_RE.search(line):
                continue
            for m in SEASON_LITERAL_RE.finditer(line):
                literal = m.group(1)
                if literal.lower() not in _SEASON_WORDS or literal in CANONICAL_SEASONS:
                    continue
                report.flag(
                    SEASON_CASING, "fail",
                    f"Non-canonical season literal '{literal}' in a chip context at "
                    f"{s.path.relative_to(ROOT)}:{lineno} — use the capitalized vocab "
                    f"({'/'.join(sorted(CANONICAL_SEASONS))}) (§5).",
                )


# ---------------------------------------------------------------------------
# Manifest + analysis
# ---------------------------------------------------------------------------
def load_manifest(path: Path = MANIFEST_PATH) -> dict[str, list[str]]:
    """Load the per-sub check-id allowlist. Missing file => no exceptions."""
    if not path.is_file():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return {sub: list(ids or []) for sub, ids in data.items()}


def _apply_manifest(report: DesignReport, suppressed: list[str]) -> None:
    """Drop suppressed findings, then mirror survivors into base findings."""
    drop_all = "all" in suppressed
    for check_id, level, message in report.raw:
        if drop_all or check_id in suppressed:
            continue
        report.kept.append((check_id, level, message))
        (report.fail if level == "fail" else report.warn)(message)


def analyze(sub: str, manifest: dict[str, list[str]], strict: bool = False) -> DesignReport:
    report = DesignReport(sub=sub)
    suppressed = manifest.get(sub, [])
    # A fully-exempt sub (`all`) is not scanned at all.
    if "all" in suppressed:
        return report

    sub_dir = SUBS_DIR / sub
    if not sub_dir.is_dir():
        report.fail(f"Sub directory not found: {sub_dir}")
        return report

    ts_files = _src_files(sub_dir)
    if not ts_files:
        report.fail(f"No TS/TSX sources under {sub_dir / 'src'} — is this a React sub?")
        return report

    ts_sources = _load_sources(ts_files)
    css_sources = _load_sources(_src_css_files(sub_dir))

    _check_root_tokens(css_sources, ts_sources, report)
    _check_hardcoded_hex(ts_sources, report)
    _check_chip_helpers(ts_sources, report)
    _check_confirm_dialog(ts_sources, report)
    _check_filter_bar(ts_sources, report)
    _check_app_shell(ts_sources, report)
    _check_season_casing(ts_sources, report)

    _apply_manifest(report, suppressed)
    return report


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------
def _grouped(report: DesignReport) -> dict[str, list[tuple[str, str]]]:
    """kept findings grouped by check-id, in CHECK_TITLES order."""
    groups: dict[str, list[tuple[str, str]]] = {cid: [] for cid in CHECK_TITLES}
    for check_id, level, message in report.kept:
        groups.setdefault(check_id, []).append((level, message))
    return groups


def print_report(report: DesignReport, strict: bool) -> bool:
    GREEN, YELLOW, RED, DIM, RESET = "\033[32m", "\033[33m", "\033[31m", "\033[2m", "\033[0m"
    print(f"\n{'=' * 64}")
    print(f" Design conformance check: {report.sub}")
    print(f"{'=' * 64}\n")

    fails, warns, effective_fail = _outcome(report, strict)
    groups = _grouped(report)
    for check_id, title in CHECK_TITLES.items():
        items = groups.get(check_id, [])
        if not items:
            print(f"  {GREEN}✓{RESET} {title}")
            continue
        for level, message in items:
            colour = RED if level == "fail" else YELLOW
            glyph = "✗" if level == "fail" else "⚠"
            print(f"  {colour}{glyph}{RESET} {DIM}{title}{RESET}\n      {colour}{message}{RESET}")

    # Structural findings (no src/, missing dir) carry no check-id.
    structural = [f for f in report.findings if f.message not in {m for _, _, m in report.kept}]
    for f in structural:
        colour = RED if f.level == "fail" else YELLOW
        print(f"  {colour}{'✗' if f.level == 'fail' else '⚠'} {f.message}{RESET}")

    print()
    if effective_fail:
        n = len(fails) + (len(warns) if strict else 0)
        print(f"  {RED}RESULT: FAIL{RESET}  ({n} blocking finding(s))")
    elif warns:
        print(f"  {YELLOW}RESULT: PASS with {len(warns)} warning(s){RESET}")
    else:
        print(f"  {GREEN}RESULT: PASS — conformant.{RESET}")
    return not effective_fail


def _md_section(report: Report, strict: bool) -> str:
    assert isinstance(report, DesignReport)
    fails, warns, effective_fail = _outcome(report, strict)
    if effective_fail:
        result = f"❌ **FAIL** — {len(fails) + (len(warns) if strict else 0)} blocking finding(s)"
    elif warns:
        result = f"⚠️ **PASS** with {len(warns)} warning(s)"
    else:
        result = "✅ **PASS** — conformant"

    lines = [f"## `{report.sub}` — {result}", ""]
    groups = _grouped(report)
    for check_id, title in CHECK_TITLES.items():
        items = groups.get(check_id, [])
        if not items:
            lines.append(f"- ✅ {title}")
            continue
        for level, message in items:
            lines.append(f"- {'❌' if level == 'fail' else '⚠️'} {title} — {message}")
    kept_msgs = {m for _, _, m in report.kept}
    for f in report.findings:
        if f.message not in kept_msgs:
            lines.append(f"- {'❌' if f.level == 'fail' else '⚠️'} {f.message}")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = build_parser(__doc__, REPORTS_DIR)
    args = parser.parse_args()
    targets = resolve_targets(args, parser)
    manifest = load_manifest()

    reports = [analyze(sub, manifest, strict=args.strict) for sub in targets]
    all_ok = True
    for report in reports:
        ok = print_report(report, strict=args.strict)
        all_ok = all_ok and ok

    if not args.no_md:
        now = datetime.now()
        scope = targets[0] if len(targets) == 1 else "all"
        markdown = render_markdown(
            reports,
            _md_section,
            title="Design conformance check",
            script_name="scripts/check_design_conformance.py",
            subs_label="Subs checked",
            strict=args.strict,
            when=now,
        )
        write_dated_report(markdown, args.out, f"design-check-{scope}", now)

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
