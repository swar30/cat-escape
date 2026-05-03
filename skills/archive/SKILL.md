---
name: archive
description: Create a publish-ready zip archive for the Cat Escape static browser game. Use when the user asks to archive, package, zip, export, publish, prepare upload files, or create a distributable build of this project.
---

# Archive

## Overview

Package the Cat Escape game into a zip file under `publish/` using the bundled script. The archive should contain runtime files needed to publish the static game, not agent notes, source crops, Git metadata, skills, or previous archives.

## Workflow

1. Run the script from the project root:

   ```bash
   python3 skills/archive/scripts/archive_project.py
   ```

2. Confirm the output path printed by the script. The default name is timestamped:

   ```text
   publish/cat-escape-publish-YYYYMMDD-HHMMSS.zip
   ```

3. If the user wants a specific filename, pass `--name`:

   ```bash
   python3 skills/archive/scripts/archive_project.py --name cat-escape.zip
   ```

## Inclusion Rules

- Always include `index.html`.
- Include local runtime assets referenced by `index.html`, such as PNG sprites.
- Exclude files that are not needed for publishing: `.git/`, `AGENTS.md`, `skills/`, `publish/`, `*-source.png`, and previous zip files.
- Keep archive paths relative to the project root so the zip can be extracted and opened directly.

## Validation

After creating the archive, list its contents when useful:

```bash
python3 skills/archive/scripts/archive_project.py --dry-run
unzip -l publish/<archive-name>.zip
```
