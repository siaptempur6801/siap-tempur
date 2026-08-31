#!/usr/bin/env python3
"""Canonical local cutover rehearsal wrapper.

Extends the dependency-safe local rehearsal executor with two local-reconstruction fixes:

1. The canonical/production `public` schema is owned by `pg_database_owner`, not `postgres`.
   This matters for the frozen schema ACL fingerprint and for faithful rollback rehearsal.
2. `production_cutover_runtime_schema_verify.sql` now emits 12 rows (8 runtime object rows,
   3 ACL rows, and 1 RLS/auth row), while the older runner expected 8. This wrapper validates
   all 12 rows. For runtime function DDL only, an exact pg_get_functiondef() hash mismatch on
   Supabase Local may fall back to a frozen semantic pg_proc fingerprint. Production cutover
   remains strict and must still pass the exact canonical pg_get_functiondef() hash.

All original localhost:54322 guards, source-data gates, transforms, rollback checks, and evidence
writing remain in force.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORDERED = HERE / "rehearse_in_place_local_ordered.py"

spec = importlib.util.spec_from_file_location("cutover_rehearsal_ordered", ORDERED)
if spec is None or spec.loader is None:
    raise SystemExit(f"ERROR: cannot load {ORDERED}")
ordered = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ordered)
mod = ordered.mod

EXPECTED_LOCAL_FUNCTION_SEMANTIC_COUNT = "80"
EXPECTED_LOCAL_FUNCTION_SEMANTIC_HASH = "0d3b1ab0aa86b631e90d38770fbf0e62"

# Preserve the implementations already patched by the dependency-safe wrapper.
_original_restore_legacy_source = mod.restore_legacy_source
_original_archive_legacy_public = mod.archive_legacy_public
_original_verify_manifest_sql = mod.verify_manifest_sql


def restore_legacy_source_with_canonical_owner(db_url: str, schema_dump: Path, raw_dir: Path):
    manifest = _original_restore_legacy_source(db_url, schema_dump, raw_dir)
    # Production public is owned by pg_database_owner. Match that before archiving it so rollback
    # restores the same ownership boundary rather than a postgres-owned approximation.
    mod.exec_sql(db_url, "ALTER SCHEMA public OWNER TO pg_database_owner;")
    return manifest


def archive_legacy_public_with_canonical_owner(db_url: str, raw_dir: Path, manifest):
    _original_archive_legacy_public(db_url, raw_dir, manifest)
    # The original helper creates the fresh canonical public schema AUTHORIZATION postgres.
    # Canonical staging and production both use pg_database_owner; normalize immediately before
    # any Schema V2 bootstrap fragment is applied.
    mod.exec_sql(db_url, "ALTER SCHEMA public OWNER TO pg_database_owner;")


def semantic_function_gate(db_url: str) -> tuple[str, str]:
    sql = r"""
with funcs as (
 select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,
        l.lanname language,
        p.prokind::text prokind,
        p.provolatile::text provolatile,
        p.prosecdef,
        p.proleakproof,
        p.proisstrict,
        p.proretset,
        p.proparallel::text proparallel,
        pg_catalog.format_type(p.prorettype,null) return_type,
        coalesce(array_to_string(p.proconfig,E'\x1f'),'') proconfig,
        coalesce(p.prosrc,'') prosrc,
        coalesce(p.probin,'') probin,
        p.procost::text procost,
        p.prorows::text prorows
 from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace
 join pg_language l on l.oid=p.prolang
 where n.nspname in ('public','app_private') and p.prokind in ('f','p')
   and not (n.nspname='app_private' and p.proname='validate_cpns_legacy_mapping_review')
   and not (n.nspname='public' and p.proname in (
     'get_cpns_legacy_import_summary',
     'import_reviewed_cpns_legacy_batch',
     'import_reviewed_cpns_legacy_question',
     'stage_cpns_legacy_question',
     'upsert_cpns_legacy_mapping_review'
   ))
)
select count(*)::text || '|' ||
       md5(coalesce(string_agg(
         nspname||'|'||proname||'('||args||')|'||language||'|'||prokind||'|'||provolatile||'|'||
         prosecdef::text||'|'||proleakproof::text||'|'||proisstrict::text||'|'||proretset::text||'|'||
         proparallel||'|'||return_type||'|'||proconfig||'|'||prosrc||'|'||probin||'|'||procost||'|'||prorows,
         E'\n' order by nspname,proname,args
       ),''))
from funcs;
"""
    value = mod.query(db_url, sql)
    parts = value.split("|", 1)
    if len(parts) != 2:
        mod.die(f"unexpected semantic function gate output: {value!r}")
    return parts[0], parts[1]


def verify_runtime_schema_local(db_url: str, path: Path) -> None:
    output = mod.run(
        ["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-F", "|", "-f", str(path)],
        capture=True,
    )
    rows = [line for line in output.splitlines() if line.strip()]
    if len(rows) != 12:
        mod.die(f"runtime verifier expected 12 rows, got {len(rows)}: {rows}")

    function_exact_mismatch = False
    for row in rows[:-1]:
        category = row.split("|", 1)[0]
        if category == "runtime_functions":
            if not row.endswith("|t"):
                function_exact_mismatch = True
            continue
        if not row.endswith("|t"):
            mod.die(f"runtime verifier failed category {category}: {row}")

    final_bits = rows[-1].split("|")
    if final_bits not in (["t", "t", "t", "t"], ["true", "true", "true", "true"]):
        mod.die(f"runtime RLS/auth verifier failed: {rows[-1]}")

    if function_exact_mismatch:
        count, sem_hash = semantic_function_gate(db_url)
        local_version = mod.query(db_url, "show server_version;")
        if count != EXPECTED_LOCAL_FUNCTION_SEMANTIC_COUNT or sem_hash != EXPECTED_LOCAL_FUNCTION_SEMANTIC_HASH:
            mod.die(
                "runtime function exact hash differs AND semantic function fingerprint differs: "
                f"server={local_version} count={count} hash={sem_hash}"
            )
        print(
            "    NOTE: local pg_get_functiondef() fingerprint differs, but frozen semantic "
            f"function fingerprint PASS (server {local_version}, {count}/{sem_hash})."
        )
        print(
            "    Production cutover must still pass the strict canonical runtime_functions hash "
            "e147d38d3801ac4c02ad41e21c02fe2a."
        )


def verify_manifest_sql_canonical(db_url: str, path: Path, expected_rows: int) -> None:
    if path.name == "production_cutover_runtime_schema_verify.sql":
        verify_runtime_schema_local(db_url, path)
        return
    _original_verify_manifest_sql(db_url, path, expected_rows)


mod.restore_legacy_source = restore_legacy_source_with_canonical_owner
mod.archive_legacy_public = archive_legacy_public_with_canonical_owner
mod.verify_manifest_sql = verify_manifest_sql_canonical

if __name__ == "__main__":
    mod.main()
