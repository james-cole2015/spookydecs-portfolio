#!/usr/bin/env python3
"""
Create a GitHub release for a completed epic.

Convention (see `gh release list`):
  - Each epic ships as a single major release: v1.0.0, v2.0.0, ... vN.0.0
  - The release name is the epic display name (e.g. "Dakota")
  - The release body is a markdown changelog that the portfolio Releases
    section renders (docs/index.html fetches it via the GitHub API)

Releases are cut from `main` (prod). Run this AFTER merge.py has deployed
development -> main, so the tag points at the shipped prod commit.

Usage:
  python3 release.py --name "Dakota" --notes-file notes.md
  python3 release.py --name "Dakota" --tag v8.0.0 --notes-file notes.md
  python3 release.py --name "Dakota" --notes-file notes.md --dry-run

If --tag is omitted, the next major version is computed from the highest
existing vN.0.0 tag on the remote. If --notes-file is omitted, the body is
read from stdin.
"""
import argparse
import re
import shutil
import subprocess
import sys

REPO = "james-cole2015/spookydecs-portfolio"
TARGET_BRANCH = "main"
TAG_RE = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")


def fail(msg: str):
    print(f"❌ {msg}", file=sys.stderr)
    sys.exit(1)


def run(cmd: list[str], check: bool = True) -> str:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if check and result.returncode != 0:
        fail(f"Command failed: {' '.join(cmd)}\n{result.stderr.strip()}")
    return result.stdout.strip()


def ensure_gh():
    if not shutil.which("gh"):
        fail("GitHub CLI (gh) not found. Install it: https://cli.github.com/")
    if subprocess.run(["gh", "auth", "status"], capture_output=True).returncode != 0:
        fail("gh is not authenticated. Run: gh auth login")


def existing_tags(repo: str) -> list[str]:
    out = run(["gh", "release", "list", "--repo", repo, "--limit", "200",
               "--json", "tagName", "-q", ".[].tagName"], check=False)
    return [t for t in out.splitlines() if t]


def next_major(tags: list[str]) -> str:
    majors = [int(m.group(1)) for t in tags if (m := TAG_RE.match(t))]
    nxt = (max(majors) + 1) if majors else 1
    return f"v{nxt}.0.0"


def main():
    ap = argparse.ArgumentParser(description="Create a GitHub release for a completed epic.")
    ap.add_argument("--name", required=True, help='Release name / epic display name (e.g. "Dakota")')
    ap.add_argument("--tag", help="Release tag (e.g. v8.0.0). Auto-computed from latest vN.0.0 if omitted.")
    ap.add_argument("--notes-file", help="Path to a markdown changelog file. Reads stdin if omitted.")
    ap.add_argument("--title", help='Release title. Defaults to --name (e.g. "Dakota").')
    ap.add_argument("--repo", default=REPO, help=f"owner/repo (default: {REPO})")
    ap.add_argument("--target", default=TARGET_BRANCH, help=f"Target branch/commitish (default: {TARGET_BRANCH})")
    ap.add_argument("--draft", action="store_true", help="Create as a draft release.")
    ap.add_argument("--prerelease", action="store_true", help="Mark as a pre-release.")
    ap.add_argument("--dry-run", action="store_true", help="Print the gh command without creating the release.")
    args = ap.parse_args()

    ensure_gh()

    tags = existing_tags(args.repo)
    tag = args.tag or next_major(tags)
    if not TAG_RE.match(tag):
        fail(f"Tag '{tag}' is not in vMAJOR.MINOR.PATCH form (e.g. v8.0.0).")
    if tag in tags:
        fail(f"Tag '{tag}' already has a release on {args.repo}.")

    # Read notes
    if args.notes_file:
        try:
            with open(args.notes_file) as f:
                notes = f.read().strip()
        except OSError as e:
            fail(f"Could not read notes file: {e}")
    else:
        if sys.stdin.isatty():
            fail("No --notes-file given and stdin is empty. Provide release notes.")
        notes = sys.stdin.read().strip()
    if not notes:
        fail("Release notes are empty.")

    title = args.title or args.name

    cmd = ["gh", "release", "create", tag,
           "--repo", args.repo,
           "--target", args.target,
           "--title", title,
           "--notes", notes]
    if args.draft:
        cmd.append("--draft")
    if args.prerelease:
        cmd.append("--prerelease")

    print(f"Release: {title}  |  tag: {tag}  |  target: {args.target}  |  repo: {args.repo}")
    print("─" * 60)
    print(notes)
    print("─" * 60)

    if args.dry_run:
        printable = " ".join(c if c != notes else "<notes>" for c in cmd)
        print(f"[dry-run] {printable}")
        return

    url = run(cmd)
    print(f"🚀 Release created: {url}")


if __name__ == "__main__":
    main()
