#!/usr/bin/env python3
"""
Extract user-sent prompts from Cursor Agent transcript JSONL files and write one Markdown file.

Transcripts live under ~/.cursor/projects/<project>/agent-transcripts/**/*.jsonl
Each line is a JSON object, user messages use role \"user\" and message.content (list of parts).
Prompt text is usually inside <user_query>...</user_query>.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


USER_QUERY_RE = re.compile(r"<user_query>\s*(.*?)\s*</user_query>", re.DOTALL)


@dataclass(frozen=True)
class PromptRecord:
    source: Path
    line_no: int
    transcript_mtime: float
    body: str


def default_cursor_root() -> Path:
    return Path.home() / ".cursor"


def iter_transcript_jsonl(projects_root: Path) -> list[Path]:
    if not projects_root.is_dir():
        return []
    out: list[Path] = []
    for project_dir in sorted(projects_root.iterdir()):
        if not project_dir.is_dir():
            continue
        at = project_dir / "agent-transcripts"
        if not at.is_dir():
            continue
        out.extend(sorted(at.rglob("*.jsonl")))
    return out


def collect_text_parts(message: object) -> str:
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    chunks: list[str] = []
    for part in content:
        if not isinstance(part, dict):
            continue
        if part.get("type") != "text":
            continue
        t = part.get("text")
        if isinstance(t, str):
            chunks.append(t)
    return "\n".join(chunks)


def extract_prompt_text(raw: str, mode: str) -> str | None:
    raw = raw.strip()
    if not raw:
        return None
    if mode == "query_only":
        matches = USER_QUERY_RE.findall(raw)
        if matches:
            return "\n\n".join(m.strip() for m in matches if m.strip())
        return None
    if mode == "full":
        return raw
    raise ValueError(f"unknown mode: {mode}")


def parse_file(path: Path, mode: str) -> list[PromptRecord]:
    try:
        mtime = path.stat().st_mtime
    except OSError:
        mtime = 0.0
    records: list[PromptRecord] = []
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as e:
        print(f"skip read error {path}: {e}", file=sys.stderr)
        return records
    for i, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            print(f"skip bad json {path}:{i}", file=sys.stderr)
            continue
        if not isinstance(obj, dict):
            continue
        if obj.get("role") != "user":
            continue
        message = obj.get("message")
        raw = collect_text_parts(message)
        body = extract_prompt_text(raw, mode)
        if body is None:
            continue
        records.append(PromptRecord(source=path, line_no=i, transcript_mtime=mtime, body=body))
    return records


def rel_under_cursor(path: Path, cursor_root: Path) -> str:
    try:
        return str(path.resolve().relative_to(cursor_root.resolve()))
    except ValueError:
        return str(path)


def escape_fence_body(s: str) -> str:
    """Close markdown fences if the body contains ```."""
    if "```" not in s:
        return s
    return s.replace("```", "``\u200b`")


def build_markdown(
    records: list[PromptRecord],
    cursor_root: Path,
    title: str,
) -> str:
    lines: list[str] = [
        f"# {title}",
        "",
        f"Generated (UTC): {datetime.now(timezone.utc).isoformat(timespec='seconds')}",
        "",
    ]
    for r in records:
        rel = rel_under_cursor(r.source, cursor_root)
        lines.append(f"## `{rel}` (line {r.line_no})")
        lines.append("")
        lines.append("```")
        lines.append(escape_fence_body(r.body))
        lines.append("```")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("cursor-user-prompts.md"),
        help="Output markdown file path (default: ./cursor-user-prompts.md)",
    )
    parser.add_argument(
        "--cursor-root",
        type=Path,
        default=default_cursor_root(),
        help="Path to .cursor directory (default: ~/.cursor)",
    )
    parser.add_argument(
        "--projects-subdir",
        type=str,
        default="projects",
        help="Subdirectory under cursor-root to scan (default: projects)",
    )
    parser.add_argument(
        "--mode",
        choices=("query_only", "full"),
        default="query_only",
        help=(
            "query_only: only text inside <user_query>...</user_query> (default). "
            "full: entire user message text including attached skill XML wrappers"
        ),
    )
    parser.add_argument(
        "--sort",
        choices=("mtime", "path"),
        default="mtime",
        help="Order transcripts: by file mtime then line (mtime), or path then line (path)",
    )
    parser.add_argument(
        "--mtime-order",
        choices=("asc", "desc"),
        default="asc",
        help="When --sort mtime: oldest first (asc) or newest first (desc)",
    )
    parser.add_argument(
        "--title",
        default="Cursor user prompts export",
        help="H1 title in the markdown output",
    )
    parser.add_argument(
        "--dedupe",
        action="store_true",
        help="Drop prompts whose body text exactly matches an earlier entry",
    )
    args = parser.parse_args()

    projects_root = (args.cursor_root / args.projects_subdir).resolve()
    paths = iter_transcript_jsonl(projects_root)
    if not paths:
        print(f"No transcript JSONL found under {projects_root}", file=sys.stderr)
        return 1

    if args.sort == "mtime":
        reverse = args.mtime_order == "desc"
        paths.sort(key=lambda p: p.stat().st_mtime, reverse=reverse)
    else:
        paths.sort(key=lambda p: str(p))

    all_records: list[PromptRecord] = []
    for p in paths:
        all_records.extend(parse_file(p, args.mode))

    if args.dedupe:
        seen: set[str] = set()
        deduped: list[PromptRecord] = []
        for r in all_records:
            if r.body in seen:
                continue
            seen.add(r.body)
            deduped.append(r)
        all_records = deduped

    md = build_markdown(all_records, args.cursor_root.resolve(), args.title)
    out = args.output.expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(md, encoding="utf-8")
    print(f"Wrote {len(all_records)} prompt(s) to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
