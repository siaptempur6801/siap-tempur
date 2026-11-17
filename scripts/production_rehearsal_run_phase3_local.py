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
        description="Run production rehearsal Phase 3 against Supabase Local only."
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

    script_path = Path(__file__).with_name("production_rehearsal_transform_phase3_local.sql")
    if not script_path.is_file():
        die(f"Phase 3 SQL not found: {script_path}")

    identity = query(
        args.db_url,
        "select current_database() || '|' || current_user || '|' || coalesce(inet_server_addr()::text,'local');",
    )
    required = query(
        args.db_url,
        "select (to_regnamespace('legacy_prod') is not null "
        "and to_regclass('legacy_prod.transactions') is not null "
        "and to_regclass('legacy_prod.event_payments') is not null "
        "and to_regclass('legacy_prod.tryout_events') is not null "
        "and to_regclass('legacy_prod.tryout_event_participants') is not null "
        "and to_regclass('legacy_prod.archive_exam_map') is not null "
        "and to_regclass('public.orders') is not null "
        "and to_regclass('public.payments') is not null "
        "and to_regclass('public.events') is not null "
        "and to_regclass('public.event_registrations') is not null);",
    )
    phase1 = query(
        args.db_url,
        "select count(*)::text || '|' || coalesce(sum(balance),0)::text "
        "from public.wallets w join legacy_prod.auth_users_identity a on a.id::uuid=w.user_id "
        "where w.wallet_type='exam_token';",
    )
    phase2 = query(
        args.db_url,
        "select count(*)::text || '|' || "
        "(select count(*) from public.attempt_answers aa join public.attempt_questions aq on aq.id=aa.attempt_question_id join public.exam_attempts ea2 on ea2.id=aq.attempt_id where ea2.metadata->>'migration_source'='production_legacy_rehearsal')::text "
        "from public.exam_attempts ea where ea.metadata->>'migration_source'='production_legacy_rehearsal';",
    )

    print(f"Local rehearsal target: {identity}")
    if required != "t":
        die("Phase 3 prerequisites are missing")
    if phase1 != "426|5090":
        die(f"Phase 1 gate is not green; expected 426|5090, got {phase1}")
    if phase2 != "476|16889":
        die(f"Phase 2 gate is not green; expected 476|16889, got {phase2}")

    print("Safety gate: LOCAL ONLY 127.0.0.1:54322")
    print("Phase 3: 258 transactions + 64 event payments + 104 participants")
    print(
        "Double-grant guard: historical settlements are recorded but token grants are NOT replayed."
    )

    try:
        typed_script, replacements = normalized_typed_copy(script_path)
    except Exception as exc:
        die(f"could not normalize Phase 3 SQL for exact typed legacy clone: {exc}")
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
    print("PASS: Phase 3 committed to Supabase Local only.")
    print(
        "Expected gates: 322 orders/payments/items, 50 settlement, 272 expire, 4 events, 104 registrations."
    )
    print("Expected amounts: transactions=6295630, events=2240000, total=8535630.")
    print(
        "Expected grant state: 31 settled event registrations linked; 0 expired links; wallet remains 5090."
    )
    print("Production and staging were not modified.")


if __name__ == "__main__":
    main()
