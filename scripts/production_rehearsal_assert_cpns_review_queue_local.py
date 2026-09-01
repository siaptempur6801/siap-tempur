#!/usr/bin/env python3
import argparse
import os
import re
import shutil
import subprocess
import sys

LOCAL_HOSTS = {"127.0.0.1", "localhost"}
WITHHELD = (
    "TIU-000033",
    "TIU-000064",
    "TIU-000065",
    "TWK-000385",
    "TWK-000448",
    "TWK-000461",
)


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def parse_local_url(db_url: str) -> None:
    if not (db_url.startswith("postgresql://") or db_url.startswith("postgres://")):
        die("LOCAL_DB_URL must be a PostgreSQL URI")
    m = re.search(r"@([^/:?#]+)(?::(\d+))?", db_url)
    if not m:
        die("could not parse LOCAL_DB_URL host")
    host, port = m.group(1), m.group(2)
    if host not in LOCAL_HOSTS or port != "54322":
        die(f"refusing non-local target: {host}:{port or '<none>'}")


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
    parser = argparse.ArgumentParser(description="Assert CPNS reviewed/withheld migration invariants in Supabase Local.")
    parser.add_argument(
        "--db-url",
        default=os.environ.get("LOCAL_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres"),
    )
    args = parser.parse_args()
    if not shutil.which("psql"):
        die("psql is required")
    parse_local_url(args.db_url)

    summary = query(
        args.db_url,
        "select "
        "coalesce(sum(question_count) filter (where review_status='reviewed'),0)::text || '|' || "
        "coalesce(sum(question_count) filter (where review_status='needs_revision'),0)::text "
        "from app_private.cpns_legacy_mapping_review_summary;",
    )
    bank = query(
        args.db_url,
        "select "
        "(select count(*) from public.questions where source_type='legacy_migration' and status='draft')::text || '|' || "
        "(select count(*) from public.question_versions qv join public.questions q on q.id=qv.question_id where q.source_type='legacy_migration' and q.status='draft')::text || '|' || "
        "(select count(*) from public.questions where question_code in ('TIU-000033','TIU-000064','TIU-000065','TWK-000385','TWK-000448','TWK-000461'))::text;",
    )
    subject_split = query(
        args.db_url,
        "select string_agg(subject_code || ':' || question_count::text, ',' order by subject_code) "
        "from app_private.cpns_legacy_mapping_review_summary where review_status='needs_revision';",
    )

    if summary != "433|6":
        die(f"review queue mismatch; expected reviewed|needs_revision = 433|6, got {summary}")
    if bank != "433|0|0":
        die(f"canonical CPNS bank mismatch; expected drafts|versions|withheld_in_bank = 433|0|0, got {bank}")
    if subject_split != "TIU:3,TWK:3":
        die(f"withheld subject split mismatch; expected TIU:3,TWK:3, got {subject_split}")

    print("PASS: CPNS review/migration invariant")
    print("- review queue: 433 reviewed + 6 needs_revision")
    print("- needs_revision split: TIU 3 + TWK 3")
    print("- canonical imported bank: 433 draft")
    print("- frozen question_versions for these drafts: 0")
    print("- six withheld codes present in canonical question bank: 0")
    print("Target: Supabase Local only; no remote database was queried or modified.")


if __name__ == "__main__":
    main()
