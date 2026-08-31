#!/usr/bin/env python3
"""Execution-only compatibility for exact production-clone rehearsal SQL.

The original Phase 1/2/3 rehearsal SQL was written when legacy source columns were staged as
text. Exact in-place rehearsal now restores the real production DDL first, so integers, UUIDs,
timestamps, dates, booleans, arrays, jsonb and enums keep their native PostgreSQL types.

To preserve the old empty-string sanitization semantics without weakening the exact clone, this
helper rewrites only simple expressions of the form:

    nullif(alias.column, '')
    nullif(column, '')

to:

    nullif((alias.column)::text, '')

Any explicit cast already present after NULLIF remains in place. Text columns are semantically
unchanged; native typed columns can now safely pass through the same migration expressions.
The source SQL files remain immutable/auditable and temporary normalized copies are LOCAL only.
"""

from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path

_SIMPLE_NULLIF_EMPTY = re.compile(
    r"(?i)nullif\(\s*([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)\s*,\s*''\s*\)"
)


def normalized_typed_copy(source: Path) -> tuple[Path, int]:
    text = source.read_text(encoding="utf-8")
    normalized, replacements = _SIMPLE_NULLIF_EMPTY.subn(
        lambda m: f"nullif(({m.group(1)})::text,'')",
        text,
    )
    if replacements == 0:
        raise RuntimeError(f"no legacy NULLIF empty-string expressions found in {source}")

    fd, raw_path = tempfile.mkstemp(
        prefix=f"siap-tempur-{source.stem}-typed-",
        suffix=".sql",
        text=True,
    )
    path = Path(raw_path)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(normalized)
        os.chmod(path, 0o600)
    except Exception:
        try:
            path.unlink()
        except FileNotFoundError:
            pass
        raise
    return path, replacements
