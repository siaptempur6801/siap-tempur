#!/usr/bin/env python3
import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from production_rehearsal_sql_compat import normalized_typed_copy

LOCAL_HOSTS = {"127.0.0.1", "localhost"}


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def parse_local_url(db_url: str) -> None:
    if not (db_url.startswith("postgresql://") or db_url.startswith("postgres://")):
        die("LOCAL_DB_URL must be a PostgreSQL URI")
    match = re.search(r"@([^/:?#]+)(?::(\d+))?", db_url)
    if not match:
        die("could not parse LOCAL_DB_URL host")
    host, port = match.group(1), match.group(2)
    if host not in LOCAL_HOSTS:
        die(f"refusing non-local database host: {host}")
    if port != "54322":
        die(f"expected Supabase Local host port 54322, got {port or '<none>'}")


def query(db_url: str, sql: str) -> str:
    proc = subprocess.run(
        ["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql],
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        if proc.stderr:
            print(proc.stderr, file=sys.stderr, end="")
        raise SystemExit(proc.returncode)
    return proc.stdout.strip()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run production rehearsal Phase 1 against Supabase Local only."
    )
    parser.add_argument(
        "--db-url",
        default=os.environ.get(
            "LOCAL_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
        ),
        help="Supabase Local PostgreSQL URI. Remote hosts are refused.",
    )
    args = parser.parse_args()

    if not shutil.which("psql"):
        die("psql is required")
    parse_local_url(args.db_url)

    script_path = Path(__file__).with_name("production_rehearsal_transform_phase1_local.sql")
    if not script_path.is_file():
        die(f"Phase 1 SQL not found: {script_path}")

    # The server is inside Docker and may report internal port 5432, so target safety is
    # enforced from the supplied host URI. Also verify this is the expected local database.
    identity = query(
        args.db_url,
        "select current_database() || '|' || current_user || '|' || coalesce(inet_server_addr()::text,'local');",
    )
    legacy_schema = query(args.db_url, "select to_regnamespace('legacy_prod') is not null;")
    canonical_schema = query(
        args.db_url,
        "select (to_regclass('public.profiles') is not null and to_regclass('public.user_tracks') is not null and to_regclass('public.wallets') is not null);",
    )

    print(f"Local rehearsal target: {identity}")
    if legacy_schema != "t":
        die("legacy_prod schema is missing; load production raw snapshot first")
    if canonical_schema != "t":
        die("canonical Schema V2 tables are missing")

    print("Safety gate: LOCAL ONLY 127.0.0.1:54322")
    print("Phase 1: auth UUID + profiles + track mapping + quota wallet")

    try:
        typed_script, replacements = normalized_typed_copy(script_path)
    except Exception as exc:
        die(f"could not normalize Phase 1 SQL for exact typed legacy clone: {exc}")
    print(
        f"Exact-clone compatibility: normalized {replacements} NULLIF empty-string expression(s)."
    )
    try:
        proc = subprocess.run(
            ["psql", args.db_url, "-X", "-v", "ON_ERROR_STOP=1", "-f", str(typed_script)]
        )
    finally:
        try:
            typed_script.unlink()
        except FileNotFoundError:
            pass
    if proc.returncode != 0:
        raise SystemExit(proc.returncode)

    print()
    print("PASS: Phase 1 committed to Supabase Local only.")
    print("Expected gates: 426 UUIDs, 426 profiles, 430 user_tracks, wallet sum 5090.")
    print("Production source snapshot and remote databases were not modified.")


if __name__ == "__main__":
    main()
