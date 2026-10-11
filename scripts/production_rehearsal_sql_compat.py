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

The rehearsal-only legacy_prod.auth_users_identity table is intentionally metadata-only and stores
its `id` as text, even though production application UUID columns retain their native uuid type.
For aliases bound specifically to that table, equality comparisons against another `.id` are
normalized to cast only the auth identity side to uuid. Existing explicit `::uuid` casts are left
untouched. No other identifiers or comparisons are rewritten.

Two additional exact-clone compatibility cases are intentionally narrow:

* Phase 2's historical option join contains a stale `legacy_option_id::text` cast even though both
  sides are UUID in the exact production schema. Only that exact comparison is normalized.
* Legacy scripts call `replace(alias.id,'-','')` on identifiers that are native UUIDs in the exact
  clone. Only simple `.id` arguments to this specific string function are cast to text.

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
_AUTH_IDENTITY_ALIAS = re.compile(
    r"(?i)\blegacy_prod\.auth_users_identity\s+(?:AS\s+)?([A-Za-z_][A-Za-z0-9_]*)\b"
)
_STALE_OPTION_UUID_TEXT_JOIN = re.compile(r"(?i)\blo\.id\s*=\s*sel\.legacy_option_id\s*::\s*text\b")
_REPLACE_SIMPLE_ID = re.compile(
    r"(?i)\breplace\(\s*([A-Za-z_][A-Za-z0-9_]*\.id)\s*,\s*'-'\s*,\s*''\s*\)"
)


def _normalize_auth_identity_uuid_equalities(text: str) -> tuple[str, int]:
    aliases = sorted(set(_AUTH_IDENTITY_ALIAS.findall(text)))
    replacements = 0

    for alias in aliases:
        a = re.escape(alias)

        # uuid_column = auth_identity_alias.id
        right = re.compile(rf"(?i)(\b[A-Za-z_][A-Za-z0-9_]*\.id\s*=\s*)({a}\.id)(?!\s*::\s*uuid\b)")
        text, n = right.subn(lambda m: f"{m.group(1)}{m.group(2)}::uuid", text)
        replacements += n

        # auth_identity_alias.id = uuid_column
        left = re.compile(
            rf"(?i)\b({a}\.id)(?!\s*::\s*uuid\b)(\s*=\s*[A-Za-z_][A-Za-z0-9_]*\.id\b)"
        )
        text, n = left.subn(lambda m: f"{m.group(1)}::uuid{m.group(2)}", text)
        replacements += n

    return text, replacements


def normalized_typed_copy(source: Path) -> tuple[Path, int]:
    text = source.read_text(encoding="utf-8")
    normalized, nullif_replacements = _SIMPLE_NULLIF_EMPTY.subn(
        lambda m: f"nullif(({m.group(1)})::text,'')",
        text,
    )
    normalized, auth_uuid_replacements = _normalize_auth_identity_uuid_equalities(normalized)
    normalized, option_join_replacements = _STALE_OPTION_UUID_TEXT_JOIN.subn(
        "lo.id=sel.legacy_option_id",
        normalized,
    )
    normalized, replace_id_replacements = _REPLACE_SIMPLE_ID.subn(
        lambda m: f"replace(({m.group(1)})::text,'-','')",
        normalized,
    )

    replacements = (
        nullif_replacements
        + auth_uuid_replacements
        + option_join_replacements
        + replace_id_replacements
    )

    if replacements == 0:
        raise RuntimeError(f"no exact-clone compatibility expressions found in {source}")

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
