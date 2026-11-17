#!/usr/bin/env python3
"""Read-only per-function comparator: canonical staging vs Supabase Local.

This diagnostic never mutates either database. It is intended for a failed cutover rehearsal
that stopped during runtime function verification. The staging URL is hard-guarded to the
canonical staging project ref and the local URL is hard-guarded to localhost:54322.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from typing import Any

EXPECTED_STAGING_REF = "lpgrivowdcepcxradavu"
LOCAL_HOSTS = {"127.0.0.1", "localhost"}


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def guard_staging(url: str) -> None:
    if not (url.startswith("postgresql://") or url.startswith("postgres://")):
        die("STAGING_DB_URL must be a PostgreSQL URI")
    if EXPECTED_STAGING_REF not in url:
        die(f"STAGING_DB_URL must contain canonical staging ref {EXPECTED_STAGING_REF}")
    if "localhost" in url or "127.0.0.1" in url:
        die("STAGING_DB_URL unexpectedly points to localhost")


def guard_local(url: str) -> None:
    if not (url.startswith("postgresql://") or url.startswith("postgres://")):
        die("LOCAL_DB_URL must be a PostgreSQL URI")
    m = re.search(r"@([^/:?#]+)(?::(\d+))?", url)
    if not m:
        die("could not parse LOCAL_DB_URL")
    host, port = m.group(1), m.group(2)
    if host not in LOCAL_HOSTS or port != "54322":
        die(f"refusing non-local target {host}:{port or '<none>'}; expected localhost:54322")


FUNCTION_JSON_SQL = r"""
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
        md5(coalesce(p.prosrc,'')) prosrc_hash,
        length(coalesce(p.prosrc,'')) prosrc_len,
        md5(coalesce(p.probin,'')) probin_hash,
        p.procost::text procost,
        p.prorows::text prorows,
        md5(pg_get_functiondef(p.oid)) exact_def_hash
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
), ordered as (
 select * from funcs order by nspname,proname,args
)
select jsonb_agg(to_jsonb(ordered) order by nspname,proname,args)::text from ordered;
"""


def query_json_read_only(url: str) -> list[dict[str, Any]]:
    sql = (
        "BEGIN TRANSACTION READ ONLY; SET LOCAL statement_timeout='120s'; "
        + FUNCTION_JSON_SQL
        + " ROLLBACK;"
    )
    proc = subprocess.run(
        ["psql", url, "-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql],
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        if proc.stdout:
            print(proc.stdout, file=sys.stderr, end="")
        if proc.stderr:
            print(proc.stderr, file=sys.stderr, end="")
        raise SystemExit(proc.returncode)
    for line in proc.stdout.splitlines():
        line = line.strip()
        if line.startswith("[") and line.endswith("]"):
            value = json.loads(line)
            if not isinstance(value, list):
                die("unexpected JSON payload")
            return value
    die(f"could not locate JSON result in psql output: {proc.stdout!r}")


def key(row: dict[str, Any]) -> tuple[str, str, str]:
    return str(row["nspname"]), str(row["proname"]), str(row["args"])


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare staging vs local runtime functions read-only"
    )
    parser.add_argument("--staging-db-url", default=os.environ.get("STAGING_DB_URL", ""))
    parser.add_argument(
        "--local-db-url",
        default=os.environ.get(
            "LOCAL_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
        ),
    )
    args = parser.parse_args()
    if not args.staging_db_url:
        die("STAGING_DB_URL is required (env or --staging-db-url)")
    guard_staging(args.staging_db_url)
    guard_local(args.local_db_url)

    print("Reading canonical staging functions in explicit READ ONLY transaction ...")
    staging_rows = query_json_read_only(args.staging_db_url)
    print("Reading Supabase Local functions in explicit READ ONLY transaction ...")
    local_rows = query_json_read_only(args.local_db_url)

    staging = {key(r): r for r in staging_rows}
    local = {key(r): r for r in local_rows}
    print(f"staging_count={len(staging)} local_count={len(local)}")

    missing = sorted(set(staging) - set(local))
    extra = sorted(set(local) - set(staging))
    if missing:
        print("\nMISSING LOCAL FUNCTIONS:")
        for k in missing:
            print("  - " + ".".join(k[:2]) + "(" + k[2] + ")")
    if extra:
        print("\nEXTRA LOCAL FUNCTIONS:")
        for k in extra:
            print("  - " + ".".join(k[:2]) + "(" + k[2] + ")")

    ignored = {"nspname", "proname", "args"}
    mismatches: list[tuple[tuple[str, str, str], list[str]]] = []
    for k in sorted(set(staging) & set(local)):
        s, l = staging[k], local[k]
        fields = sorted(
            field for field in (set(s) | set(l)) - ignored if s.get(field) != l.get(field)
        )
        if fields:
            mismatches.append((k, fields))

    if mismatches:
        print("\nFUNCTION MISMATCHES:")
        for k, fields in mismatches:
            print(f"\n  {k[0]}.{k[1]}({k[2]})")
            for field in fields:
                print(
                    f"    {field}: staging={staging[k].get(field)!r} local={local[k].get(field)!r}"
                )
    else:
        print("\nPASS: all per-function semantic/exact diagnostic fields match.")

    print("\nSUMMARY")
    print(f"missing={len(missing)} extra={len(extra)} mismatched={len(mismatches)}")
    if missing or extra or mismatches:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
