#!/usr/bin/env python3
import argparse
import csv
import os
import re
import shlex
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from shutil import which

LOCAL_HOSTS = {"127.0.0.1", "localhost"}
SAFE_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def qident(value: str) -> str:
    if not SAFE_IDENT.match(value):
        die(f"unsafe SQL identifier: {value!r}")
    return '"' + value.replace('"', '""') + '"'


def run_psql(db_url: str, sql: str, capture: bool = False) -> str:
    cmd = ["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql]
    proc = subprocess.run(cmd, text=True, capture_output=capture)
    if proc.returncode != 0:
        if capture and proc.stderr:
            print(proc.stderr, file=sys.stderr, end="")
        raise SystemExit(proc.returncode)
    return proc.stdout.strip() if capture else ""


def run_psql_file(db_url: str, sql_file: Path) -> None:
    cmd = ["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-f", str(sql_file)]
    proc = subprocess.run(cmd)
    if proc.returncode != 0:
        raise SystemExit(proc.returncode)


def parse_local_url(db_url: str) -> None:
    # Hard guard: rehearsal loader is allowed to write ONLY to local Supabase.
    if not (db_url.startswith("postgresql://") or db_url.startswith("postgres://")):
        die("LOCAL_DB_URL must be a PostgreSQL URI")
    m = re.search(r"@([^/:?#]+)(?::(\d+))?", db_url)
    if not m:
        die("could not parse LOCAL_DB_URL host")
    host = m.group(1)
    port = m.group(2)
    if host not in LOCAL_HOSTS:
        die(f"refusing non-local database host: {host}")
    if port != "54322":
        die(f"expected Supabase Local port 54322, got {port or 'default'}")


def load_columns(path: Path):
    grouped = defaultdict(list)
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {"table_schema", "table_name", "ordinal_position", "column_name"}
        if not required.issubset(reader.fieldnames or []):
            die(f"{path} is missing expected column metadata")
        for row in reader:
            if row["table_schema"] != "public":
                continue
            table = row["table_name"]
            column = row["column_name"]
            if not SAFE_IDENT.match(table) or not SAFE_IDENT.match(column):
                die(f"unsafe table/column name in metadata: {table}.{column}")
            grouped[table].append((int(row["ordinal_position"]), column))
    return {t: [c for _, c in sorted(cols)] for t, cols in grouped.items()}


def load_manifest(path: Path):
    result = {}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if (reader.fieldnames or []) != ["table_name", "row_count"]:
            die(f"unexpected manifest header in {path}")
        for row in reader:
            table = row["table_name"]
            if not SAFE_IDENT.match(table):
                die(f"unsafe table name in manifest: {table}")
            result[table] = int(row["row_count"])
    return result


def write_loader_sql(snapshot: Path, columns, manifest, out_path: Path):
    public_dir = snapshot / "public"
    lines = [
        "\\set ON_ERROR_STOP on",
        "BEGIN;",
        "DROP SCHEMA IF EXISTS legacy_prod CASCADE;",
        "CREATE SCHEMA legacy_prod;",
        "CREATE TABLE legacy_prod.auth_users_identity (id text, created_at text);",
    ]

    auth_csv = (snapshot / "auth_users_identity.csv").resolve()
    lines.append(
        f"\\copy legacy_prod.auth_users_identity (id, created_at) FROM {shlex.quote(str(auth_csv))} WITH (FORMAT csv, HEADER true)"
    )

    for table in sorted(manifest):
        if table not in columns:
            die(f"manifest table {table} has no column metadata")
        csv_path = public_dir / f"{table}.csv"
        if not csv_path.exists():
            die(f"missing snapshot CSV: {csv_path}")
        cols = columns[table]
        col_defs = ", ".join(f"{qident(c)} text" for c in cols)
        col_list = ", ".join(qident(c) for c in cols)
        lines.append(f"CREATE TABLE legacy_prod.{qident(table)} ({col_defs});")
        lines.append(
            f"\\copy legacy_prod.{qident(table)} ({col_list}) FROM {shlex.quote(str(csv_path.resolve()))} WITH (FORMAT csv, HEADER true)"
        )

    lines.append(
        "CREATE TABLE legacy_prod.snapshot_expected_counts (table_name text primary key, expected_count bigint not null);"
    )
    for table, count in sorted(manifest.items()):
        safe_table = table.replace("'", "''")
        lines.append(
            f"INSERT INTO legacy_prod.snapshot_expected_counts(table_name, expected_count) VALUES ('{safe_table}', {count});"
        )
    lines.append("COMMIT;")
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(
        description="Load a production raw snapshot into local legacy_prod staging tables."
    )
    parser.add_argument("snapshot_dir", help="Path like snapshots/production-raw-YYYYMMDD-HHMMSS")
    parser.add_argument(
        "--db-url",
        default=os.environ.get(
            "LOCAL_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
        ),
        help="Supabase Local PostgreSQL URI only",
    )
    args = parser.parse_args()

    if not which("psql"):
        die("psql is required")

    parse_local_url(args.db_url)
    snapshot = Path(args.snapshot_dir).expanduser().resolve()
    if not snapshot.is_dir():
        die(f"snapshot directory not found: {snapshot}")

    required = [
        snapshot / "public_columns.csv",
        snapshot / "public_row_counts.csv",
        snapshot / "auth_users_identity.csv",
        snapshot / "public",
    ]
    for path in required:
        if not path.exists():
            die(f"missing required snapshot component: {path}")

    # URI parsing above is the authoritative target guard. PostgreSQL inside Docker
    # reports its container-internal port (usually 5432), not the host-mapped 54322.
    target = run_psql(
        args.db_url,
        "select current_database() || '|' || current_user || '|' || version();",
        capture=True,
    )
    print(f"Local rehearsal target: {target.split('|')[0]}|{target.split('|')[1]}")

    columns = load_columns(snapshot / "public_columns.csv")
    manifest = load_manifest(snapshot / "public_row_counts.csv")
    print(f"Snapshot tables in manifest: {len(manifest)}")

    sql_file = snapshot / ".load_legacy_prod.sql"
    write_loader_sql(snapshot, columns, manifest, sql_file)
    os.chmod(sql_file, 0o600)

    print("Loading production raw snapshot into LOCAL schema legacy_prod ...")
    run_psql_file(args.db_url, sql_file)

    mismatches = []
    for table, expected in sorted(manifest.items()):
        actual_s = run_psql(
            args.db_url,
            f"select count(*) from legacy_prod.{qident(table)};",
            capture=True,
        )
        actual = int(actual_s)
        if actual != expected:
            mismatches.append((table, expected, actual))

    auth_count = int(
        run_psql(args.db_url, "select count(*) from legacy_prod.auth_users_identity;", capture=True)
    )

    print()
    print("Raw snapshot load verification")
    print(f"- public tables loaded: {len(manifest)}")
    print(f"- auth identity rows: {auth_count}")
    print(f"- row-count mismatches: {len(mismatches)}")
    if mismatches:
        for table, expected, actual in mismatches:
            print(f"  MISMATCH {table}: expected={expected} actual={actual}")
        die("snapshot load failed reconciliation")

    print("PASS: every legacy_prod table matches the production snapshot manifest.")
    print("Production was not written; all loaded rows are in Supabase Local only.")


if __name__ == "__main__":
    main()
