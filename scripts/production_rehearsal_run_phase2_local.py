#!/usr/bin/env python3
import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

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


def materialize_sql(script_path: Path) -> Path:
    """Normalize PostgreSQL uuid[] snapshot fields to JSON safely before execution."""
    sql = script_path.read_text(encoding="utf-8")
    replacements = {
        "coalesce(nullif(oa.option_order,'')::jsonb,'null'::jsonb)":
            "coalesce(to_jsonb(nullif(oa.option_order,'')::uuid[]),'[]'::jsonb)",
        "coalesce(nullif(ta.selected_option_ids,'')::jsonb,'[]'::jsonb)":
            "coalesce(to_jsonb(nullif(ta.selected_option_ids,'')::uuid[]),'[]'::jsonb)",
    }
    for old, new in replacements.items():
        if old not in sql:
            die(f"expected Phase 2 SQL fragment not found: {old}")
        sql = sql.replace(old, new)

    handle = tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        prefix="siap-tempur-phase2-",
        suffix=".sql",
        delete=False,
    )
    try:
        handle.write(sql)
        handle.flush()
    finally:
        handle.close()
    return Path(handle.name)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run production rehearsal Phase 2 against Supabase Local only."
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

    script_path = Path(__file__).with_name("production_rehearsal_transform_phase2_local.sql")
    if not script_path.is_file():
        die(f"Phase 2 SQL not found: {script_path}")

    identity = query(
        args.db_url,
        "select current_database() || '|' || current_user || '|' || coalesce(inet_server_addr()::text,'local');",
    )
    required = query(
        args.db_url,
        "select (to_regnamespace('legacy_prod') is not null "
        "and to_regclass('legacy_prod.program_track_map') is not null "
        "and to_regclass('public.exam_attempts') is not null "
        "and to_regclass('public.attempt_questions') is not null "
        "and to_regclass('public.attempt_answers') is not null "
        "and to_regclass('public.attempt_scores') is not null);",
    )
    phase1 = query(
        args.db_url,
        "select count(*)::text || '|' || coalesce(sum(balance),0)::text "
        "from public.wallets w join legacy_prod.auth_users_identity a on a.id::uuid=w.user_id "
        "where w.wallet_type='exam_token';",
    )

    print(f"Local rehearsal target: {identity}")
    if required != "t":
        die("Phase 2 prerequisites are missing")
    if phase1 != "426|5090":
        die(f"Phase 1 gate is not green; expected 426|5090, got {phase1}")

    print("Safety gate: LOCAL ONLY 127.0.0.1:54322")
    print("Phase 2: 476 sessions + 16,889 answers + 1,273 subject scores")
    print("Withheld needs_revision questions remain outside the canonical bank; snapshots preserve their history.")

    resolved_sql = materialize_sql(script_path)
    try:
        proc = subprocess.run(
            ["psql", args.db_url, "-X", "-v", "ON_ERROR_STOP=1", "-f", str(resolved_sql)]
        )
    finally:
        try:
            resolved_sql.unlink()
        except FileNotFoundError:
            pass

    if proc.returncode != 0:
        raise SystemExit(proc.returncode)

    print()
    print("PASS: Phase 2 committed to Supabase Local only.")
    print("Expected gates: 476 attempts, 426 completed, 16,889 answers, 1,273 subject scores.")
    print("Expected score sums: total completed=88239, TWK=21365, TIU=22255, TKP=44603.")
    print("Production and staging were not modified.")


if __name__ == "__main__":
    main()
