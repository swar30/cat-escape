#!/usr/bin/env python3
"""Create a publish-ready Cat Escape zip archive."""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
import zipfile
from pathlib import Path


ASSET_EXTENSIONS = {
    ".css",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".js",
    ".mp3",
    ".ogg",
    ".png",
    ".svg",
    ".wav",
    ".webp",
}


def project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def referenced_assets(index_html: Path) -> set[Path]:
    html = index_html.read_text(encoding="utf-8")
    candidates = set()
    for match in re.findall(r"""['"]([^'"]+\.(?:css|gif|ico|jpe?g|js|mp3|ogg|png|svg|wav|webp))['"]""", html, re.I):
        if re.match(r"^[a-z]+://", match, re.I) or match.startswith("//"):
            continue
        asset_path = (index_html.parent / match).resolve()
        if asset_path.is_file() and asset_path.suffix.lower() in ASSET_EXTENSIONS:
            candidates.add(asset_path)
    return candidates


def publish_files(root: Path) -> list[Path]:
    index_html = root / "index.html"
    if not index_html.is_file():
        raise FileNotFoundError(f"Missing required file: {index_html}")

    files = {index_html, *referenced_assets(index_html)}
    return sorted(files, key=lambda path: path.relative_to(root).as_posix())


def default_archive_name() -> str:
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"cat-escape-publish-{stamp}.zip"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", help="Archive filename. Defaults to a timestamped zip name.")
    parser.add_argument("--output-dir", default="publish", help="Output directory relative to project root.")
    parser.add_argument("--dry-run", action="store_true", help="Print files that would be archived without writing a zip.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = project_root()
    archive_name = args.name or default_archive_name()
    if not archive_name.endswith(".zip"):
        archive_name += ".zip"

    files = publish_files(root)
    output_dir = (root / args.output_dir).resolve()
    archive_path = output_dir / archive_name

    if args.dry_run:
        print("Files to archive:")
        for file_path in files:
            print(f"- {file_path.relative_to(root).as_posix()}")
        print(f"Archive path: {archive_path.relative_to(root).as_posix()}")
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in files:
            archive.write(file_path, file_path.relative_to(root).as_posix())

    print(f"Created {archive_path.relative_to(root).as_posix()}")
    print("Included files:")
    for file_path in files:
        print(f"- {file_path.relative_to(root).as_posix()}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"archive_project.py: {exc}", file=sys.stderr)
        raise SystemExit(1)
