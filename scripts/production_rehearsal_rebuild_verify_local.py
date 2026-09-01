#!/usr/bin/env python3
"""Deterministic Production-Clone Rehearsal rebuild verifier.

LOCAL ONLY. This script intentionally has no staging/production database URL input.
It destroys and rebuilds only Supabase Local at 127.0.0.1:54322 from already-captured
canonical staging dumps and the already-captured production raw snapshot, then reruns
Phase 1 -> Phase 2 -> Phase 3 and compares semantic fingerprints.
"""

import argparse
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
TECH_ACTORS = (
    ("4cf7114c-7613-4676-9aa9-64793f855f04", "staging-actor-1@local.invalid", "Staging Content Actor 1"),
    ("93b4d35b-a1fb-4a16-9304-fef1116002cf", "staging-actor-2@local.invalid", "Staging Content Actor 2"),
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
    if host not in LOCAL_HOSTS:
        die(f"refusing non-local database host: {host}")
    if port != "54322":
        die(f"expected Supabase Local host port 54322, got {port or '<none>'}")


def run(cmd, *, cwd=None, capture=False) -> str:
    proc = subprocess.run(
        [str(x) for x in cmd],
        cwd=str(cwd) if cwd else None,
        text=True,
        capture_output=capture,
    )
    if proc.returncode != 0:
        if capture:
            if proc.stdout:
                print(proc.stdout, file=sys.stderr, end="")
            if proc.stderr:
                print(proc.stderr, file=sys.stderr, end="")
        raise SystemExit(proc.returncode)
    return proc.stdout.strip() if capture else ""


def query(db_url: str, sql: str) -> str:
    return run(
        ["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-qAt", "-c", sql],
        capture=True,
    )


def exec_sql(db_url: str, sql: str) -> None:
    run(["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-c", sql])


def exec_file(db_url: str, path: Path) -> None:
    run(["psql", db_url, "-X", "-v", "ON_ERROR_STOP=1", "-f", path])


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_tree(path: Path) -> str:
    h = hashlib.sha256()
    files = sorted(p for p in path.rglob("*") if p.is_file() and p.name != ".load_legacy_prod.sql")
    for p in files:
        rel = p.relative_to(path).as_posix().encode()
        h.update(len(rel).to_bytes(4, "big"))
        h.update(rel)
        digest = bytes.fromhex(sha256_file(p))
        h.update(digest)
    return h.hexdigest()


def scalar_int(db_url: str, sql: str) -> int:
    return int(query(db_url, sql))


def stable_hash(db_url: str, row_sql: str) -> str:
    # row_sql must return one text column named v. Hash each row first, then aggregate the
    # fixed-size row hashes in deterministic lexical order to keep memory bounded/predictable.
    sql = (
        "select md5(coalesce(string_agg(h,'' order by h),'')) from ("
        f"select md5(coalesce(v,'')) as h from ({row_sql}) rows_"
        ") hashed_"
    )
    return query(db_url, sql)


def final_gates(db_url: str) -> dict:
    return {
        "production_auth_uuid_match": scalar_int(db_url, "select count(*) from legacy_prod.auth_users_identity a join auth.users u on u.id=a.id::uuid"),
        "production_profile_match": scalar_int(db_url, "select count(*) from legacy_prod.profiles l join public.profiles p on p.id=l.id::uuid"),
        "user_tracks": scalar_int(db_url, "select count(*) from public.user_tracks ut join legacy_prod.auth_users_identity a on a.id::uuid=ut.user_id"),
        "wallets": scalar_int(db_url, "select count(*) from public.wallets w join legacy_prod.auth_users_identity a on a.id::uuid=w.user_id where w.wallet_type='exam_token'"),
        "wallet_balance_sum": scalar_int(db_url, "select coalesce(sum(w.balance),0)::bigint from public.wallets w join legacy_prod.auth_users_identity a on a.id::uuid=w.user_id where w.wallet_type='exam_token'"),
        "attempts": scalar_int(db_url, "select count(*) from public.exam_attempts where metadata->>'migration_source'='production_legacy_rehearsal'"),
        "completed_attempts": scalar_int(db_url, "select count(*) from public.exam_attempts where metadata->>'migration_source'='production_legacy_rehearsal' and status='completed'"),
        "attempt_questions": scalar_int(db_url, "select count(*) from public.attempt_questions aq join public.exam_attempts ea on ea.id=aq.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal'"),
        "attempt_answers": scalar_int(db_url, "select count(*) from public.attempt_answers aa join public.attempt_questions aq on aq.id=aa.attempt_question_id join public.exam_attempts ea on ea.id=aq.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal'"),
        "attempt_scores": scalar_int(db_url, "select count(*) from public.attempt_scores s join public.exam_attempts ea on ea.id=s.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal'"),
        "completed_total_score": scalar_int(db_url, "select coalesce(sum(total_score),0)::bigint from public.exam_attempts where metadata->>'migration_source'='production_legacy_rehearsal' and status='completed'"),
        "twk_score_sum": scalar_int(db_url, "select coalesce(sum(s.raw_score),0)::bigint from public.attempt_scores s join public.subjects sub on sub.id=s.subject_id join public.exam_attempts ea on ea.id=s.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal' and sub.code='TWK'"),
        "tiu_score_sum": scalar_int(db_url, "select coalesce(sum(s.raw_score),0)::bigint from public.attempt_scores s join public.subjects sub on sub.id=s.subject_id join public.exam_attempts ea on ea.id=s.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal' and sub.code='TIU'"),
        "tkp_score_sum": scalar_int(db_url, "select coalesce(sum(s.raw_score),0)::bigint from public.attempt_scores s join public.subjects sub on sub.id=s.subject_id join public.exam_attempts ea on ea.id=s.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal' and sub.code='TKP'"),
        "historical_orders": scalar_int(db_url, "select count(*) from public.orders o where o.order_number in (select order_id from legacy_prod.transactions union all select order_id from legacy_prod.event_payments)"),
        "historical_order_items": scalar_int(db_url, "select count(*) from public.order_items oi join public.orders o on o.id=oi.order_id where o.order_number in (select order_id from legacy_prod.transactions union all select order_id from legacy_prod.event_payments)"),
        "historical_payments": scalar_int(db_url, "select count(*) from public.payments where raw_response->>'migration_source'='production_legacy_rehearsal' and raw_response->>'phase'='3'"),
        "settlement_payments": scalar_int(db_url, "select count(*) from public.payments where raw_response->>'migration_source'='production_legacy_rehearsal' and raw_response->>'phase'='3' and status='settlement'"),
        "expired_payments": scalar_int(db_url, "select count(*) from public.payments where raw_response->>'migration_source'='production_legacy_rehearsal' and raw_response->>'phase'='3' and status='expire'"),
        "historical_events": scalar_int(db_url, "select count(*) from public.events where code like 'LEGACY-EVENT-%'"),
        "historical_registrations": scalar_int(db_url, "select count(*) from public.event_registrations where registration_number like 'LEGACY-%'"),
        "paid_registration_links": scalar_int(db_url, "select count(*) from public.event_registrations er join public.orders o on o.id=er.order_id where er.registration_number like 'LEGACY-%' and o.status='paid'"),
        "expired_registration_links": scalar_int(db_url, "select count(*) from public.event_registrations er join public.orders o on o.id=er.order_id where er.registration_number like 'LEGACY-%' and o.status<>'paid'"),
        "cpns_reviewed_drafts": scalar_int(db_url, "select count(*) from public.questions where source_type='legacy_migration' and status='draft'"),
        "cpns_reviewed_draft_versions": scalar_int(db_url, "select count(*) from public.question_versions qv join public.questions q on q.id=qv.question_id where q.source_type='legacy_migration' and q.status='draft'"),
        "withheld_questions_in_bank": scalar_int(db_url, "select count(*) from public.questions where question_code in ('TIU-000033','TIU-000064','TIU-000065','TWK-000385','TWK-000448','TWK-000461')"),
        "history_placeholders": scalar_int(db_url, "select count(*) from public.questions where source_type='legacy_history_placeholder'"),
        "raw_public_tables": scalar_int(db_url, "select count(*) from legacy_prod.snapshot_expected_counts"),
    }


def assert_final_gates(g: dict) -> None:
    expected = {
        "production_auth_uuid_match": 426,
        "production_profile_match": 426,
        "user_tracks": 430,
        "wallets": 426,
        "wallet_balance_sum": 5090,
        "attempts": 476,
        "completed_attempts": 426,
        "attempt_questions": 16889,
        "attempt_answers": 16889,
        "attempt_scores": 1273,
        "completed_total_score": 88239,
        "twk_score_sum": 21365,
        "tiu_score_sum": 22255,
        "tkp_score_sum": 44603,
        "historical_orders": 322,
        "historical_order_items": 322,
        "historical_payments": 322,
        "settlement_payments": 50,
        "expired_payments": 272,
        "historical_events": 4,
        "historical_registrations": 104,
        "paid_registration_links": 31,
        "expired_registration_links": 0,
        "cpns_reviewed_drafts": 433,
        "cpns_reviewed_draft_versions": 0,
        "withheld_questions_in_bank": 0,
        "raw_public_tables": 60,
    }
    mismatches = {k: (expected[k], g.get(k)) for k in expected if g.get(k) != expected[k]}
    if mismatches:
        die("final reconciliation gates failed: " + json.dumps(mismatches, sort_keys=True))


def fingerprint(db_url: str) -> dict:
    gates = final_gates(db_url)
    assert_final_gates(gates)
    hashes = {
        "auth_uuid_set": stable_hash(db_url, "select a.id as v from legacy_prod.auth_users_identity a join auth.users u on u.id=a.id::uuid"),
        "profiles": stable_hash(db_url, "select concat_ws('|',p.id::text,coalesce(p.full_name,''),coalesce(p.display_name,''),coalesce(p.phone,''),coalesce(p.status,''),coalesce(p.birth_date::text,''),coalesce(p.gender,''),coalesce(p.bio,''),coalesce(p.education_level,''),coalesce(p.target_instance,'')) as v from public.profiles p join legacy_prod.auth_users_identity a on a.id::uuid=p.id"),
        "user_tracks": stable_hash(db_url, "select concat_ws('|',ut.user_id::text,ut.track_id::text,ut.status,coalesce(ut.started_at::text,''),coalesce(ut.completed_at::text,'')) as v from public.user_tracks ut join legacy_prod.auth_users_identity a on a.id::uuid=ut.user_id"),
        "wallets": stable_hash(db_url, "select concat_ws('|',w.user_id::text,w.wallet_type,w.balance::text) as v from public.wallets w join legacy_prod.auth_users_identity a on a.id::uuid=w.user_id"),
        "attempts": stable_hash(db_url, "select concat_ws('|',id::text,exam_id::text,user_id::text,attempt_number::text,status,coalesce(started_at::text,''),coalesce(submitted_at::text,''),coalesce(total_score::text,''),coalesce(passed::text,''),metadata::text) as v from public.exam_attempts where metadata->>'migration_source'='production_legacy_rehearsal'"),
        "attempt_questions": stable_hash(db_url, "select concat_ws('|',aq.id::text,aq.attempt_id::text,aq.question_id::text,aq.question_version::text,aq.position::text,aq.question_snapshot::text,aq.max_score::text) as v from public.attempt_questions aq join public.exam_attempts ea on ea.id=aq.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal'"),
        "attempt_answers": stable_hash(db_url, "select concat_ws('|',aa.id::text,aa.attempt_question_id::text,coalesce(aa.selected_option_id::text,''),coalesce(aa.answer_value,''),coalesce(aa.is_correct::text,''),aa.score_awarded::text) as v from public.attempt_answers aa join public.attempt_questions aq on aq.id=aa.attempt_question_id join public.exam_attempts ea on ea.id=aq.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal'"),
        "attempt_scores": stable_hash(db_url, "select concat_ws('|',s.id::text,s.attempt_id::text,s.subject_id::text,s.raw_score::text,coalesce(s.passing_score::text,''),coalesce(s.passed::text,'')) as v from public.attempt_scores s join public.exam_attempts ea on ea.id=s.attempt_id where ea.metadata->>'migration_source'='production_legacy_rehearsal'"),
        "orders": stable_hash(db_url, "select concat_ws('|',o.id::text,o.order_number,o.user_id::text,o.status,o.subtotal::text,o.discount_amount::text,o.total_amount::text,o.currency,coalesce(o.paid_at::text,'')) as v from public.orders o where o.order_number in (select order_id from legacy_prod.transactions union all select order_id from legacy_prod.event_payments)"),
        "payments": stable_hash(db_url, "select concat_ws('|',p.id::text,p.order_id::text,p.provider,coalesce(p.provider_transaction_id,''),p.amount::text,p.status,coalesce(p.paid_at::text,''),p.raw_response::text) as v from public.payments p where p.raw_response->>'migration_source'='production_legacy_rehearsal' and p.raw_response->>'phase'='3'"),
        "events": stable_hash(db_url, "select concat_ws('|',e.id::text,e.code,e.title,e.slug,e.event_type,e.program_id::text,e.track_id::text,e.starts_at::text,e.ends_at::text,e.status) as v from public.events e where e.code like 'LEGACY-EVENT-%'"),
        "event_registrations": stable_hash(db_url, "select concat_ws('|',er.id::text,er.event_id::text,coalesce(er.session_id::text,''),er.user_id::text,coalesce(er.order_id::text,''),er.registration_number,er.status,er.created_at::text) as v from public.event_registrations er where er.registration_number like 'LEGACY-%'"),
        "history_products": stable_hash(db_url, "select concat_ws('|',p.id::text,p.code,p.name,p.product_type,p.program_id::text,coalesce(p.track_id::text,''),p.status) as v from public.products p where p.code like 'LEGACY_PKG_%' or p.code like 'LEGACY_EVENT_TICKET_%'"),
        "question_map": stable_hash(db_url, "select concat_ws('|',legacy_question_id::text,legacy_question_code,canonical_question_id::text,mapping_type) as v from legacy_prod.question_map"),
    }
    return {"gates": gates, "hashes": hashes}


def restore_technical_auth(db_url: str) -> None:
    values = []
    for user_id, email, full_name in TECH_ACTORS:
        values.append(
            "('" + user_id + "'::uuid,'" + email + "','" + full_name + "')"
        )
    sql = f"""
insert into auth.users (id,email,raw_user_meta_data)
select id,email,jsonb_build_object('full_name',full_name)
from (values {','.join(values)}) as x(id,email,full_name)
on conflict (id) do nothing;

delete from public.profiles
where id in ('{TECH_ACTORS[0][0]}'::uuid,'{TECH_ACTORS[1][0]}'::uuid);
"""
    exec_sql(db_url, sql)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    default_workspace = Path.home() / "Projects" / "siap-tempur-rehearsal-local"
    parser = argparse.ArgumentParser(
        description="Destroy/rebuild Supabase Local and prove deterministic production-clone rehearsal output."
    )
    parser.add_argument(
        "--db-url",
        default=os.environ.get("LOCAL_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres"),
        help="Supabase Local PostgreSQL URI. Remote hosts are refused.",
    )
    parser.add_argument("--workspace", type=Path, default=default_workspace)
    parser.add_argument("--schema-dump", type=Path, default=default_workspace / "snapshots" / "staging_schema_v2.sql")
    parser.add_argument("--data-dump", type=Path, default=default_workspace / "snapshots" / "staging_data_v2.sql")
    parser.add_argument("--production-snapshot", type=Path, default=None)
    parser.add_argument("--yes-rebuild-local", action="store_true", help="Required destructive LOCAL-only confirmation.")
    args = parser.parse_args()

    if not args.yes_rebuild_local:
        die("rebuild is destructive to Supabase Local; rerun with --yes-rebuild-local")
    if not shutil.which("psql"):
        die("psql is required")
    parse_local_url(args.db_url)

    workspace = args.workspace.expanduser().resolve()
    schema_dump = args.schema_dump.expanduser().resolve()
    data_dump = args.data_dump.expanduser().resolve()
    if not workspace.is_dir():
        die(f"rehearsal workspace not found: {workspace}")
    for p in (schema_dump, data_dump):
        if not p.is_file():
            die(f"required dump not found: {p}")

    if args.production_snapshot is None:
        candidates = sorted((repo_root / "snapshots").glob("production-raw-*"), reverse=True)
        if not candidates:
            die("no production raw snapshot found under repo snapshots/; pass --production-snapshot")
        prod_snapshot = candidates[0].resolve()
    else:
        prod_snapshot = args.production_snapshot.expanduser().resolve()
    if not prod_snapshot.is_dir():
        die(f"production raw snapshot not found: {prod_snapshot}")

    required_scripts = [
        repo_root / "scripts" / "production_rehearsal_reset_local_runtime.sql",
        repo_root / "scripts" / "production_rehearsal_load_raw_local.py",
        repo_root / "scripts" / "production_rehearsal_run_phase1_local.py",
        repo_root / "scripts" / "production_rehearsal_run_phase2_local.py",
        repo_root / "scripts" / "production_rehearsal_run_phase3_local.py",
    ]
    for p in required_scripts:
        if not p.is_file():
            die(f"required rehearsal script missing: {p}")

    identity = query(args.db_url, "select current_database() || '|' || current_user || '|' || coalesce(inet_server_addr()::text,'local')")
    print(f"Local rehearsal target: {identity}")
    print("Safety gate: ALL WRITES LOCAL ONLY at 127.0.0.1:54322")
    print("Remote database URLs are not accepted by this script.")
    print()

    print("[1/9] Capture current green fingerprint ...")
    before = fingerprint(args.db_url)
    print("      current final gates: PASS")

    git_head = run(["git", "rev-parse", "HEAD"], cwd=repo_root, capture=True)
    inputs = {
        "git_head": git_head,
        "schema_dump": str(schema_dump),
        "schema_dump_sha256": sha256_file(schema_dump),
        "data_dump": str(data_dump),
        "data_dump_sha256": sha256_file(data_dump),
        "production_snapshot": str(prod_snapshot),
        "production_snapshot_tree_sha256": sha256_tree(prod_snapshot),
    }

    print("[2/9] Destroy canonical/runtime schemas and auth users in Supabase Local ...")
    exec_sql(
        args.db_url,
        """
BEGIN;
DROP SCHEMA IF EXISTS legacy_prod CASCADE;
DROP SCHEMA IF EXISTS app_private CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO service_role;
TRUNCATE TABLE auth.users CASCADE;
COMMIT;
""",
    )

    print("[3/9] Restore canonical Schema V2 + app_private ...")
    exec_file(args.db_url, schema_dump)

    print("[4/9] Restore 2 technical auth actors + canonical staging data ...")
    restore_technical_auth(args.db_url)
    exec_file(args.db_url, data_dump)
    base = query(
        args.db_url,
        "select (select count(*) from auth.users)::text || '|' || (select count(*) from public.profiles)::text || '|' || (select count(*) from public.questions)::text || '|' || (select count(*) from public.question_versions)::text || '|' || (select count(*) from public.content_reviews)::text",
    )
    if base != "2|2|1086|552|900":
        die(f"canonical restore gate failed; expected 2|2|1086|552|900, got {base}")

    print("[5/9] Remove staging runtime/QA residue ...")
    exec_file(args.db_url, required_scripts[0])
    clean = query(
        args.db_url,
        "select (select count(*) from public.exam_attempts)::text || '|' || (select count(*) from public.orders)::text || '|' || (select count(*) from public.wallets)::text || '|' || (select count(*) from public.user_tracks)::text || '|' || (select count(*) from public.events)::text",
    )
    if clean != "0|0|0|0|0":
        die(f"runtime cleanup gate failed; expected 0|0|0|0|0, got {clean}")

    print("[6/9] Load production raw snapshot into legacy_prod ...")
    run([sys.executable, required_scripts[1], prod_snapshot, "--db-url", args.db_url], cwd=repo_root)

    print("[7/9] Rerun Phase 1 -> Phase 2 -> Phase 3 ...")
    for script in required_scripts[2:]:
        run([sys.executable, script, "--db-url", args.db_url], cwd=repo_root)

    print("[8/9] Capture rebuilt fingerprint and compare ...")
    after = fingerprint(args.db_url)
    if before != after:
        before_flat = {**{f"gate:{k}": v for k, v in before["gates"].items()}, **{f"hash:{k}": v for k, v in before["hashes"].items()}}
        after_flat = {**{f"gate:{k}": v for k, v in after["gates"].items()}, **{f"hash:{k}": v for k, v in after["hashes"].items()}}
        diff = {
            k: {"before": before_flat.get(k), "after": after_flat.get(k)}
            for k in sorted(set(before_flat) | set(after_flat))
            if before_flat.get(k) != after_flat.get(k)
        }
        die("rebuild fingerprint mismatch: " + json.dumps(diff, indent=2, sort_keys=True))

    print("[9/9] Write local evidence ...")
    evidence_dir = repo_root / "snapshots"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    evidence_path = evidence_dir / f"production-rehearsal-rebuild-evidence-{stamp}.json"
    evidence = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "result": "PASS",
        "target": "Supabase Local 127.0.0.1:54322",
        "remote_writes": False,
        "inputs": inputs,
        "fingerprint_before": before,
        "fingerprint_after": after,
    }
    evidence_path.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.chmod(evidence_path, 0o600)

    print()
    print("PASS: deterministic LOCAL rebuild / rollback rehearsal.")
    print("- canonical staging restore: 2 profiles, 1086 questions, 552 versions, 900 reviews")
    print("- identity/track/wallet: 426 UUIDs, 430 tracks, wallet 5090")
    print("- exam history: 476 attempts, 16889 answers, 1273 scores")
    print("- commerce/event: 322 orders/payments/items, 4 events, 104 registrations")
    print("- CPNS invariant: 433 reviewed drafts, 0 frozen versions, 6 withheld outside bank")
    print("- semantic fingerprints before/after: IDENTICAL")
    print(f"- evidence: {evidence_path}")
    print("Production and staging were not modified by this rebuild.")


if __name__ == "__main__":
    main()
