#!/usr/bin/env python3
"""
scan_common.py

Reusable plumbing for static "conformance" scanners over the Portfolio subs
(regex/AST-free source walks that emit a dated markdown report and a 0/1 exit
code). Factored out of check_sub_migration.py so sibling checkers — e.g. a
design-conformance scanner — reuse the same file walk, Finding/Report model,
report writer, and CLI/exit-code contract instead of duplicating them.

What lives here (generic):
  - ROOT / SUBS_DIR              repo anchors (both scanners live in scripts/)
  - Finding / Report            the result model + fail()/warn() collectors
  - _src_files / _pkg_root       source discovery + import-specifier helpers
  - _outcome                     fail/warn tally honoring --strict
  - render_markdown              dated-report renderer (title + section callback)
  - build_parser / resolve_targets / write_dated_report   the CLI contract

What stays in each scanner (specific): its own capability model, its per-file
checks, and its section renderer.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable

# Repo root = parent of the scripts/ directory this file lives in. Both scanners
# live in scripts/, so this resolves identically regardless of which imports it.
ROOT = Path(__file__).resolve().parent.parent
SUBS_DIR = ROOT / "subs"


@dataclass
class Finding:
    level: str  # "fail" | "warn"
    message: str


@dataclass
class Report:
    """Generic per-sub result. Scanners subclass to add their own fields."""

    sub: str
    findings: list[Finding] = field(default_factory=list)

    def fail(self, msg: str) -> None:
        self.findings.append(Finding("fail", msg))

    def warn(self, msg: str) -> None:
        self.findings.append(Finding("warn", msg))


def _src_files(sub_dir: Path) -> list[Path]:
    """Every .ts/.tsx file under the sub's src/ (empty if there is no src/)."""
    src = sub_dir / "src"
    if not src.is_dir():
        return []
    return [p for p in src.rglob("*") if p.suffix in (".ts", ".tsx")]


def _pkg_root(spec: str) -> str:
    """Package root of an import specifier ('photoswipe/style.css' -> 'photoswipe')."""
    if spec.startswith("@"):
        return "/".join(spec.split("/")[:2])
    return spec.split("/")[0]


def _outcome(report: Report, strict: bool) -> tuple[list[Finding], list[Finding], bool]:
    """Return (fails, warns, effective_fail) under the given strictness."""
    fails = [f for f in report.findings if f.level == "fail"]
    warns = [f for f in report.findings if f.level == "warn"]
    return fails, warns, bool(fails) or (strict and bool(warns))


def render_markdown(
    reports: list[Report],
    section_renderer: Callable[[Report, bool], str],
    *,
    title: str,
    script_name: str,
    subs_label: str,
    strict: bool,
    when: datetime,
) -> str:
    """
    Render a dated markdown report: a shared header (title, generation stamp,
    subs checked, overall verdict) followed by one `section_renderer(report,
    strict)` block per report, joined by horizontal rules.
    """
    overall_ok = all(not _outcome(r, strict)[2] for r in reports)
    header = [
        f"# {title} — {when:%Y-%m-%d}",
        "",
        f"_Generated {when:%Y-%m-%d %H:%M} by `{script_name}`"
        f"{' (--strict)' if strict else ''}._",
        "",
        f"**{subs_label}:** {', '.join(r.sub for r in reports)}  ",
        f"**Overall:** {'✅ all clean' if overall_ok else '❌ problems found'}",
        "",
        "---",
        "",
    ]
    return "\n".join(header) + "\n---\n\n".join(
        section_renderer(r, strict) for r in reports
    ) + "\n"


def build_parser(description: str, default_out: Path) -> argparse.ArgumentParser:
    """Standard scanner CLI: positional sub, --all, --strict, --out, --no-md."""
    parser = argparse.ArgumentParser(
        description=description, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("sub", nargs="?", help="Sub name (directory under subs/).")
    parser.add_argument("--all", action="store_true", help="Check every workspace sub that has a src/ dir.")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures.")
    parser.add_argument(
        "--out",
        type=Path,
        default=default_out,
        help=f"Directory for the dated markdown report (default: {default_out.relative_to(ROOT)}).",
    )
    parser.add_argument("--no-md", action="store_true", help="Skip writing the markdown report.")
    return parser


def resolve_targets(
    args: argparse.Namespace, parser: argparse.ArgumentParser, subs_dir: Path = SUBS_DIR
) -> list[str]:
    """Resolve the sub(s) to scan from parsed args (--all discovers p/src subs)."""
    if args.all:
        return sorted(p.name for p in subs_dir.iterdir() if (p / "src").is_dir())
    if args.sub:
        return [args.sub]
    parser.error("provide a sub name or --all")


def write_dated_report(markdown: str, out_dir: Path, filename_stem: str, when: datetime) -> Path:
    """Write `{filename_stem}-{YYYY-MM-DD}.md` under out_dir and print its path."""
    out_path = out_dir / f"{filename_stem}-{when:%Y-%m-%d}.md"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(markdown, encoding="utf-8")
    try:
        shown = out_path.relative_to(Path.cwd())
    except ValueError:
        shown = out_path
    print(f"\n  Report written: {shown}")
    return out_path
