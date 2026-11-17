#!/usr/bin/env python3
"""Exact in-place Schema V2 cutover + rollback rehearsal for Supabase Local ONLY.

Inputs are created by scripts/cutover/export_cutover_artifacts.sh.
The runner deliberately refuses any host except 127.0.0.1/localhost:54322.

Sequence exercised:
  legacy production public schema + raw data
  -> archive public as legacy_prod
  -> canonical Schema V2 bootstrap
  -> canonical V1 seed
  -> Phase 1 / 2 / 3 transforms
  -> schema/data gates
  -> rollback canonical public/app_private
  -> rename legacy_prod back to public
  -> source fingerprint gate

No remote database is accepted by this script.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

LOCAL_HOSTS = {"127.0.0.1", "localhost"}
EXPECTED_SEED_GATE = "2|4|32|1086|552|17|11|433|0|0"
TECH_ACTORS = (
    (
        "4cf7114c-7613-4676-9aa9-64793f855f04",
        "cutover-history-actor@local.invalid",
        "Cutover History Actor",
    ),
    (
        "93b4d35b-a1fb-4a16-9304-fef1116002cf",
        "cutover-content-actor@local.invalid",
        "Cutover Content Actor",
    ),
)
LEGACY_SEQUENCE_VALUES = {
    "question_code_seq": 263,
    "questions_tiu_code_seq": 126,
    "questions_tkp_code_seq": 287,
    "questions_twk_code_seq": 559,
}


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


def run(cmd, *, capture: bool = False) -> str:
    proc = subprocess.run([str(x) for x in cmd], text=True, capture_output=capture)
    if proc.returncode != 0:
        if capture:
            if proc.stdout:
                print(proc.stdout, file=sys.stderr, end="")
            if proc.stderr:
                print(proc.stderr, file=sys.stderr, end="")
        raise SystemExit(proc.returncode)
    return proc.stdout.strip() if capture else ""


def query(db_url: str, sql: str) -> str:
    return run(["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql], capture=True)


def exec_sql(db_url: str, sql: str) -> None:
    run(["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-c", sql])


def exec_file(db_url: str, path: Path, *, replica: bool = False) -> None:
    cmd = ["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1"]
    if replica:
        cmd += ["-c", "SET session_replication_role = replica;"]
    cmd += ["-f", str(path)]
    if replica:
        cmd += ["-c", "SET session_replication_role = origin;"]
    run(cmd)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def qident(value: str) -> str:
    if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", value):
        die(f"unsafe SQL identifier: {value!r}")
    return '"' + value.replace('"', '""') + '"'


def sql_path_literal(path: Path) -> str:
    return "'" + str(path.resolve()).replace("'", "''") + "'"


def load_manifest(path: Path) -> dict[str, int]:
    out: dict[str, int] = {}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if (reader.fieldnames or []) != ["table_name", "row_count"]:
            die(f"unexpected manifest header in {path}")
        for row in reader:
            name = row["table_name"]
            qident(name)
            out[name] = int(row["row_count"])
    return out


def load_columns(path: Path) -> dict[str, list[str]]:
    grouped: dict[str, list[tuple[int, str]]] = {}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("table_schema") != "public":
                continue
            table, column = row["table_name"], row["column_name"]
            qident(table)
            qident(column)
            grouped.setdefault(table, []).append((int(row["ordinal_position"]), column))
    return {t: [c for _, c in sorted(cols)] for t, cols in grouped.items()}


def source_gate(db_url: str) -> str:
    sql = """
select concat_ws('|',
 (select count(*) from auth.users),
 (select count(*) from public.profiles),
 (select count(*) from auth.users u join public.profiles p using(id)),
 (select count(*) from public.user_programs),
 (select coalesce(sum(tryout_quota),0) from public.user_programs),
 (select count(*) from public.test_sessions),
 (select count(*) from public.test_sessions where status::text='completed'),
 (select count(*) from public.test_answers),
 (select count(*) from public.session_subject_scores),
 (select coalesce(sum(total_score),0) from public.test_sessions where status::text='completed'),
 (select count(*) from public.transactions),
 (select coalesce(sum(amount),0) from public.transactions),
 (select count(*) from public.event_payments),
 (select coalesce(sum(amount),0) from public.event_payments),
 (select count(*) from public.tryout_event_participants),
 md5(coalesce((select string_agg(id::text, ',' order by id) from auth.users),'')),
 md5(coalesce((select string_agg(id::text || ':' || coalesce(tryout_quota,0)::text, ',' order by id) from public.profiles),'')),
 md5(coalesce((select string_agg(id::text || ':' || user_id::text || ':' || status::text || ':' || coalesce(total_score,0)::text, ',' order by id) from public.test_sessions),'')),
 md5(coalesce((select string_agg(id::text || ':' || session_id::text || ':' || question_id::text || ':' || coalesce(option_id::text,''), ',' order by id) from public.test_answers),'')),
 md5(coalesce((select string_agg(id::text || ':' || user_id::text || ':' || order_id || ':' || amount::text || ':' || status::text, ',' order by id) from public.transactions),'')),
 md5(coalesce((select string_agg(id::text || ':' || user_id::text || ':' || order_id || ':' || amount::text || ':' || status, ',' order by id) from public.event_payments),''))
);"""
    return query(db_url, sql)


EXPECTED_SOURCE_GATE = "|".join(
    [
        "426",
        "426",
        "426",
        "430",
        "5090",
        "476",
        "426",
        "16889",
        "1273",
        "88239",
        "258",
        "6295630",
        "64",
        "2240000",
        "104",
        "aba71998de87af045ca2fbc65c9b82eb",
        "b02379b4056903c5ad5a09971df5a2b9",
        "b94db0fdf0fa3aadf8df9331114dd8bd",
        "ff5048c26f8af5f112d2e45faf37679a",
        "5d21ca2bd700a8515df48edabc7c909c",
        "433b67a09f9f3673bfa6703813e7cedf",
    ]
)


def seed_gate(db_url: str) -> str:
    sql = """
select concat_ws('|',
 (select count(*) from public.programs),
 (select count(*) from public.tracks),
 (select count(*) from public.subjects),
 (select count(*) from public.questions),
 (select count(*) from public.question_versions),
 (select count(*) from public.exams),
 (select count(*) from public.products),
 (select count(*) from public.questions where source_type='legacy_migration' and status='draft'),
 (select count(*) from public.question_versions qv join public.questions q on q.id=qv.question_id where q.source_type='legacy_migration' and q.status='draft'),
 (select count(*) from public.questions where question_code in ('TIU-000033','TIU-000064','TIU-000065','TWK-000385','TWK-000448','TWK-000461'))
);"""
    return query(db_url, sql)


def final_gate(db_url: str) -> str:
    sql = """
select concat_ws('|',
 (select count(*) from legacy_prod.auth_users_identity a join auth.users u on u.id=a.id::uuid),
 (select count(*) from legacy_prod.profiles l join public.profiles p on p.id=l.id::uuid),
 (select count(*) from public.user_tracks ut join legacy_prod.auth_users_identity a on a.id::uuid=ut.user_id),
 (select count(*) from public.wallets w join legacy_prod.auth_users_identity a on a.id::uuid=w.user_id where w.wallet_type='exam_token'),
 (select coalesce(sum(w.balance),0) from public.wallets w join legacy_prod.auth_users_identity a on a.id::uuid=w.user_id where w.wallet_type='exam_token'),
 (select count(*) from public.exam_attempts where metadata->>'migration_source'='production_legacy_rehearsal'),
 (select count(*) from public.exam_attempts where metadata->>'migration_source'='production_legacy_rehearsal' and status='completed'),
 (select count(*) from public.attempt_questions aq join public.exam_attempts ea on ea.id=aq.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal'),
 (select count(*) from public.attempt_answers aa join public.attempt_questions aq on aq.id=aa.attempt_question_id join public.exam_attempts ea on ea.id=aq.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal'),
 (select count(*) from public.attempt_scores s join public.exam_attempts ea on ea.id=s.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal'),
 (select coalesce(sum(total_score),0) from public.exam_attempts where metadata->>'migration_source'='production_legacy_rehearsal' and status='completed'),
 (select coalesce(sum(s.raw_score),0) from public.attempt_scores s join public.subjects sub on sub.id=s.subject_id join public.exam_attempts ea on ea.id=s.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal' and sub.code='TWK'),
 (select coalesce(sum(s.raw_score),0) from public.attempt_scores s join public.subjects sub on sub.id=s.subject_id join public.exam_attempts ea on ea.id=s.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal' and sub.code='TIU'),
 (select coalesce(sum(s.raw_score),0) from public.attempt_scores s join public.subjects sub on sub.id=s.subject_id join public.exam_attempts ea on ea.id=s.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal' and sub.code='TKP'),
 (select count(*) from public.orders o where o.order_number in (select order_id from legacy_prod.transactions union all select order_id from legacy_prod.event_payments)),
 (select count(*) from public.payments where raw_response->>'migration_source'='production_legacy_rehearsal' and raw_response->>'phase'='3'),
 (select count(*) from public.payments where raw_response->>'migration_source'='production_legacy_rehearsal' and raw_response->>'phase'='3' and status='settlement'),
 (select count(*) from public.payments where raw_response->>'migration_source'='production_legacy_rehearsal' and raw_response->>'phase'='3' and status='expire'),
 (select count(*) from public.events where code like 'LEGACY-EVENT-%'),
 (select count(*) from public.event_registrations where registration_number like 'LEGACY-%'),
 (select count(*) from public.event_registrations er join public.orders o on o.id=er.order_id where er.registration_number like 'LEGACY-%' and o.status='paid'),
 (select count(*) from public.event_registrations er join public.orders o on o.id=er.order_id where er.registration_number like 'LEGACY-%' and o.status<>'paid'),
 (select count(*) from public.questions where source_type='legacy_migration' and status='draft'),
 (select count(*) from public.question_versions qv join public.questions q on q.id=qv.question_id where q.source_type='legacy_migration' and q.status='draft'),
 (select count(*) from public.questions where question_code in ('TIU-000033','TIU-000064','TIU-000065','TWK-000385','TWK-000448','TWK-000461'))
);"""
    return query(db_url, sql)


EXPECTED_FINAL_GATE = "|".join(
    [
        "426",
        "426",
        "430",
        "426",
        "5090",
        "476",
        "426",
        "16889",
        "16889",
        "1273",
        "88239",
        "21365",
        "22255",
        "44603",
        "322",
        "322",
        "50",
        "272",
        "4",
        "104",
        "31",
        "0",
        "433",
        "0",
        "0",
    ]
)


def verify_manifest_sql(db_url: str, path: Path, expected_rows: int) -> None:
    output = run(
        ["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-F", "|", "-f", str(path)],
        capture=True,
    )
    rows = [line for line in output.splitlines() if line.strip()]
    if len(rows) != expected_rows or any(not row.endswith("|t") for row in rows):
        die(f"schema verifier failed for {path.name}: {rows}")


def recreate_auth_trigger(db_url: str) -> None:
    exec_sql(
        db_url,
        """
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
""",
    )


def restore_technical_actors(db_url: str) -> None:
    values = ",".join(
        "('" + user_id + "'::uuid,'" + email + "','" + full_name.replace("'", "''") + "')"
        for user_id, email, full_name in TECH_ACTORS
    )
    exec_sql(
        db_url,
        f"""
WITH actor(id,email,full_name) AS (VALUES {values})
INSERT INTO auth.users (
  id,email,aud,role,raw_app_meta_data,raw_user_meta_data,email_confirmed_at,created_at,updated_at
)
SELECT id,email,'authenticated','authenticated',
       '{{"provider":"email","providers":["email"],"cutover_technical_actor":true}}'::jsonb,
       jsonb_build_object('full_name',full_name,'cutover_technical_actor',true),
       now(),now(),now()
FROM actor
ON CONFLICT (id) DO NOTHING;
""",
    )
    if (
        query(
            db_url,
            "select count(*) from public.profiles where id in ('4cf7114c-7613-4676-9aa9-64793f855f04','93b4d35b-a1fb-4a16-9304-fef1116002cf');",
        )
        != "2"
    ):
        die("technical actor profile creation failed")


def restore_legacy_source(db_url: str, schema_dump: Path, raw_dir: Path) -> dict[str, int]:
    # Destroy ONLY the local app/auth state. Supabase platform schemas remain intact.
    exec_sql(
        db_url,
        """
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP SCHEMA IF EXISTS app_private CASCADE;
DROP SCHEMA IF EXISTS legacy_prod CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
TRUNCATE TABLE auth.users CASCADE;
""",
    )

    dump_text = schema_dump.read_text(encoding="utf-8", errors="replace")
    if not re.search(r"CREATE\s+SCHEMA\s+public", dump_text, re.IGNORECASE):
        exec_sql(db_url, "CREATE SCHEMA public AUTHORIZATION postgres;")
    exec_file(db_url, schema_dump)

    if (
        query(
            db_url,
            "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p');",
        )
        != "60"
    ):
        die("restored legacy public schema does not contain exactly 60 base tables")

    manifest = load_manifest(raw_dir / "public_row_counts.csv")
    columns = load_columns(raw_dir / "public_columns.csv")
    if len(manifest) != 60:
        die(f"production raw snapshot must contain exactly 60 public tables, got {len(manifest)}")

    load_sql = raw_dir / ".cutover_load_legacy_public.sql"
    lines = ["\\set ON_ERROR_STOP on", "BEGIN;", "SET LOCAL session_replication_role = replica;"]
    lines += [
        "CREATE TEMP TABLE cutover_auth_identity(id text, created_at text);",
        f"\\copy cutover_auth_identity(id,created_at) FROM {sql_path_literal(raw_dir / 'auth_users_identity.csv')} WITH (FORMAT csv, HEADER true)",
        """
INSERT INTO auth.users (id,email,aud,role,raw_app_meta_data,raw_user_meta_data,email_confirmed_at,created_at,updated_at)
SELECT id::uuid,'legacy+'||id||'@local.invalid','authenticated','authenticated',
       '{"provider":"email","providers":["email"],"cutover_placeholder":true}'::jsonb,
       '{"cutover_placeholder":true}'::jsonb,
       coalesce(nullif(created_at,'')::timestamptz,now()),
       coalesce(nullif(created_at,'')::timestamptz,now()),
       coalesce(nullif(created_at,'')::timestamptz,now())
FROM cutover_auth_identity;
""".strip(),
    ]
    for table in sorted(manifest):
        if table not in columns:
            die(f"missing column metadata for {table}")
        csv_file = raw_dir / "public" / f"{table}.csv"
        if not csv_file.is_file():
            die(f"missing raw CSV: {csv_file}")
        col_list = ",".join(qident(c) for c in columns[table])
        lines.append(
            f"\\copy public.{qident(table)} ({col_list}) FROM {sql_path_literal(csv_file)} WITH (FORMAT csv, HEADER true)"
        )
    for seq, value in LEGACY_SEQUENCE_VALUES.items():
        lines.append(f"SELECT setval('public.{seq}'::regclass,{value},true);")
    lines += ["COMMIT;"]
    load_sql.write_text("\n".join(lines) + "\n", encoding="utf-8")
    os.chmod(load_sql, 0o600)
    exec_file(db_url, load_sql)

    mismatches = []
    for table, expected in sorted(manifest.items()):
        actual = int(query(db_url, f"select count(*) from public.{qident(table)};"))
        if actual != expected:
            mismatches.append((table, expected, actual))
    if mismatches:
        die("raw legacy row-count mismatch: " + repr(mismatches[:10]))

    if source_gate(db_url) != EXPECTED_SOURCE_GATE:
        die("fresh local legacy source does not match frozen production source fingerprint")
    return manifest


def archive_legacy_public(db_url: str, raw_dir: Path, manifest: dict[str, int]) -> None:
    exec_sql(
        db_url,
        """
BEGIN;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
ALTER SCHEMA public RENAME TO legacy_prod;
CREATE SCHEMA public AUTHORIZATION postgres;
COMMIT;
""",
    )

    meta_sql = raw_dir / ".cutover_legacy_meta.sql"
    lines = [
        "\\set ON_ERROR_STOP on",
        "BEGIN;",
        "CREATE TABLE legacy_prod.auth_users_identity(id text,created_at text);",
        f"\\copy legacy_prod.auth_users_identity(id,created_at) FROM {sql_path_literal(raw_dir / 'auth_users_identity.csv')} WITH (FORMAT csv, HEADER true)",
        "CREATE TABLE legacy_prod.snapshot_expected_counts(table_name text primary key,expected_count bigint not null);",
    ]
    for table, count in sorted(manifest.items()):
        lines.append(
            "INSERT INTO legacy_prod.snapshot_expected_counts(table_name,expected_count) VALUES "
            f"('{table.replace(chr(39), chr(39) + chr(39))}',{count});"
        )
    lines.append("COMMIT;")
    meta_sql.write_text("\n".join(lines) + "\n", encoding="utf-8")
    os.chmod(meta_sql, 0o600)
    exec_file(db_url, meta_sql)


def bootstrap_canonical(db_url: str, repo_root: Path) -> None:
    bootstrap = repo_root / "scripts" / "cutover" / "bootstrap"
    ordered = [
        "00_schema.sql",
        "00_default_privileges.sql",
        "00_sequences.sql",
        "01_tables_a_f.sql",
        "02_tables_g_p.sql",
        "03_tables_q_z.sql",
        "04_constraints_a_p.sql",
        "05_constraints_q_z.sql",
        "06_indexes_a_p.sql",
        "07_indexes_q_z.sql",
        "07_sequence_ownership.sql",
        "08_functions_app_private_a_m.sql",
        "09_functions_app_private_n_r.sql",
        "10_functions_app_private_s_z.sql",
        "11_functions_public_wrappers.sql",
        "12_functions_public_commerce_admin.sql",
        "13_functions_public_learning_rankings.sql",
        "14_rls_enable.sql",
        "15_policies_a_p.sql",
        "16_policies_q_z.sql",
        "17_triggers.sql",
        "18_acl.sql",
    ]
    for name in ordered:
        path = bootstrap / name
        if not path.is_file():
            die(f"missing bootstrap fragment: {path}")
        exec_file(db_url, path)
    recreate_auth_trigger(db_url)

    verify_manifest_sql(
        db_url, repo_root / "scripts" / "production_cutover_runtime_schema_verify.sql", 8
    )
    verify_manifest_sql(db_url, repo_root / "scripts" / "production_cutover_acl_verify.sql", 3)
    auth_gate = query(
        db_url,
        """
select ((select md5(pg_get_triggerdef(t.oid,true)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname='auth' and c.relname='users' and t.tgname='on_auth_user_created')='786e53a33077b3a68f1ec248e238d18a')::text || '|' ||
       ((select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='handle_new_user' and pg_get_function_identity_arguments(p.oid)='')='dbae3074708706cbe687389241c39a16')::text;
""",
    )
    if auth_gate != "true|true" and auth_gate != "t|t":
        die(f"canonical auth trigger/handler fingerprint failed: {auth_gate}")


def run_phases(db_url: str, repo_root: Path) -> None:
    for script in (
        "production_rehearsal_run_phase1_local.py",
        "production_rehearsal_run_phase2_local.py",
        "production_rehearsal_run_phase3_local.py",
    ):
        run([sys.executable, repo_root / "scripts" / script, "--db-url", db_url])


def rollback_to_legacy(db_url: str) -> None:
    tech_ids = ",".join("'" + x[0] + "'::uuid" for x in TECH_ACTORS)
    exec_sql(
        db_url,
        f"""
BEGIN;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS app_private CASCADE;
DROP TABLE IF EXISTS legacy_prod.auth_users_identity;
DROP TABLE IF EXISTS legacy_prod.snapshot_expected_counts;
ALTER SCHEMA legacy_prod RENAME TO public;
DELETE FROM auth.users WHERE id IN ({tech_ids});
COMMIT;
""",
    )
    recreate_auth_trigger(db_url)
    if source_gate(db_url) != EXPECTED_SOURCE_GATE:
        die("rollback did not reproduce the frozen production source fingerprint")
    seq_gate = query(
        db_url,
        "select string_agg(sequencename||':'||last_value::text,',' order by sequencename) from pg_sequences where schemaname='public';",
    )
    expected_seq = "question_code_seq:263,questions_tiu_code_seq:126,questions_tkp_code_seq:287,questions_twk_code_seq:559"
    if seq_gate != expected_seq:
        die(f"rollback sequence state mismatch: {seq_gate}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Schema V2 exact in-place cutover/rollback rehearsal on Supabase Local only."
    )
    parser.add_argument("artifact_dir", help="Directory created by export_cutover_artifacts.sh")
    parser.add_argument(
        "--db-url",
        default=os.environ.get(
            "LOCAL_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
        ),
    )
    parser.add_argument(
        "--yes-rehearse-local",
        action="store_true",
        help="Required destructive LOCAL-only acknowledgement",
    )
    args = parser.parse_args()

    if not args.yes_rehearse_local:
        die("pass --yes-rehearse-local; this destroys only the guarded Supabase Local app state")
    if not shutil.which("psql"):
        die("psql is required")
    parse_local_url(args.db_url)

    repo_root = Path(__file__).resolve().parents[2]
    artifact = Path(args.artifact_dir).expanduser().resolve()
    schema_dump = artifact / "production_public_schema.sql"
    seed_dump = artifact / "canonical_v1_seed.sql"
    raw_dir = artifact / "production_raw"
    for required in (
        schema_dump,
        seed_dump,
        raw_dir / "public_row_counts.csv",
        raw_dir / "public_columns.csv",
        raw_dir / "auth_users_identity.csv",
    ):
        if not required.exists():
            die(f"missing cutover artifact: {required}")

    started = datetime.now(timezone.utc)
    evidence: dict[str, object] = {
        "started_utc": started.isoformat(),
        "target": "Supabase Local 127.0.0.1:54322 only",
        "production_writes": 0,
        "inputs": {
            "production_public_schema_sha256": sha256_file(schema_dump),
            "canonical_v1_seed_sha256": sha256_file(seed_dump),
        },
    }

    print("[1/8] Restore exact legacy public schema + raw production snapshot into LOCAL ...")
    manifest = restore_legacy_source(args.db_url, schema_dump, raw_dir)
    evidence["legacy_source_gate"] = EXPECTED_SOURCE_GATE

    print("[2/8] Archive LOCAL legacy public -> legacy_prod ...")
    archive_legacy_public(args.db_url, raw_dir, manifest)

    print("[3/8] Bootstrap canonical Schema V2 from source-controlled fragments ...")
    bootstrap_canonical(args.db_url, repo_root)
    evidence["canonical_schema_gate"] = "PASS"

    print("[4/8] Create two deterministic technical actors + restore canonical V1 seed ...")
    restore_technical_actors(args.db_url)
    exec_file(args.db_url, seed_dump, replica=True)
    actual_seed = seed_gate(args.db_url)
    if actual_seed != EXPECTED_SEED_GATE:
        die(f"canonical seed gate mismatch: expected={EXPECTED_SEED_GATE} actual={actual_seed}")
    evidence["canonical_seed_gate"] = actual_seed

    print("[5/8] Run Phase 1 -> Phase 2 -> Phase 3 transforms ...")
    run_phases(args.db_url, repo_root)

    print("[6/8] Verify canonical schema + migrated production semantics ...")
    verify_manifest_sql(
        args.db_url, repo_root / "scripts" / "production_cutover_runtime_schema_verify.sql", 8
    )
    verify_manifest_sql(args.db_url, repo_root / "scripts" / "production_cutover_acl_verify.sql", 3)
    actual_final = final_gate(args.db_url)
    if actual_final != EXPECTED_FINAL_GATE:
        die(f"final migration gate mismatch: expected={EXPECTED_FINAL_GATE} actual={actual_final}")
    evidence["migration_gate"] = actual_final

    print("[7/8] Roll back LOCAL canonical schemas and restore archived legacy public ...")
    rollback_to_legacy(args.db_url)
    evidence["rollback_source_gate"] = EXPECTED_SOURCE_GATE
    evidence["rollback_sequence_gate"] = LEGACY_SEQUENCE_VALUES

    print("[8/8] Freeze non-PII rehearsal evidence ...")
    evidence["finished_utc"] = datetime.now(timezone.utc).isoformat()
    evidence["result"] = "PASS"
    evidence_path = artifact / "in_place_rehearsal_evidence.json"
    evidence_path.write_text(
        json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    os.chmod(evidence_path, 0o600)

    print()
    print(
        "PASS: exact in-place Schema V2 cutover rehearsal + rollback completed on Supabase Local."
    )
    print("PASS: local state ended back on the frozen legacy production semantic fingerprint.")
    print(f"Evidence: {evidence_path}")
    print("Production and staging were not mutated by this runner.")


if __name__ == "__main__":
    main()
