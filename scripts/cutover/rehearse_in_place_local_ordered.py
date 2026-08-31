#!/usr/bin/env python3
"""Dependency-safe wrapper for exact local cutover rehearsal.

The frozen canonical constraint fragments are alphabetically ordered and therefore are not
DDL dependency ordered: a FOREIGN KEY can appear before the referenced PRIMARY KEY/UNIQUE
constraint. This wrapper reuses the guarded local-only rehearsal runner but replaces only
bootstrap_canonical() so all non-FK constraints from both frozen fragments are applied first,
then all FOREIGN KEY constraints.

The canonical runtime/schema/ACL fingerprints are still verified unchanged after bootstrap.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ORIGINAL = HERE / "rehearse_in_place_local.py"

spec = importlib.util.spec_from_file_location("cutover_rehearsal_original", ORIGINAL)
if spec is None or spec.loader is None:
    raise SystemExit(f"ERROR: cannot load {ORIGINAL}")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def constraint_statements(path: Path) -> list[str]:
    """Read generated one-statement-per-line ALTER TABLE constraint fragments safely."""
    statements: list[str] = []
    pending: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("--"):
            continue
        pending.append(raw)
        if line.endswith(";"):
            statement = "\n".join(pending).strip()
            pending.clear()
            if not statement.upper().startswith("ALTER TABLE ONLY PUBLIC."):
                mod.die(f"unexpected statement in {path.name}: {statement[:120]!r}")
            if " ADD CONSTRAINT " not in statement.upper():
                mod.die(f"unexpected non-constraint statement in {path.name}: {statement[:120]!r}")
            statements.append(statement)
    if pending:
        mod.die(f"unterminated SQL statement in {path}")
    return statements


def apply_constraints_dependency_safe(db_url: str, bootstrap: Path) -> None:
    all_statements: list[str] = []
    for name in ("04_constraints_a_p.sql", "05_constraints_q_z.sql"):
        path = bootstrap / name
        if not path.is_file():
            mod.die(f"missing bootstrap fragment: {path}")
        all_statements.extend(constraint_statements(path))

    non_fk = [s for s in all_statements if " FOREIGN KEY " not in s.upper()]
    foreign_keys = [s for s in all_statements if " FOREIGN KEY " in s.upper()]
    if len(non_fk) + len(foreign_keys) != len(all_statements):
        mod.die("constraint classification mismatch")

    print(f"    constraint pass A: {len(non_fk)} PK/UNIQUE/CHECK/other constraints")
    mod.exec_sql(db_url, "\n".join(non_fk))
    print(f"    constraint pass B: {len(foreign_keys)} FOREIGN KEY constraints")
    mod.exec_sql(db_url, "\n".join(foreign_keys))


def bootstrap_canonical_ordered(db_url: str, repo_root: Path) -> None:
    bootstrap = repo_root / "scripts" / "cutover" / "bootstrap"

    before_constraints = [
        "00_schema.sql",
        "00_default_privileges.sql",
        "00_sequences.sql",
        "01_tables_a_f.sql",
        "02_tables_g_p.sql",
        "03_tables_q_z.sql",
    ]
    after_constraints = [
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

    for name in before_constraints:
        path = bootstrap / name
        if not path.is_file():
            mod.die(f"missing bootstrap fragment: {path}")
        mod.exec_file(db_url, path)

    apply_constraints_dependency_safe(db_url, bootstrap)

    for name in after_constraints:
        path = bootstrap / name
        if not path.is_file():
            mod.die(f"missing bootstrap fragment: {path}")
        mod.exec_file(db_url, path)

    mod.recreate_auth_trigger(db_url)
    mod.verify_manifest_sql(
        db_url,
        repo_root / "scripts" / "production_cutover_runtime_schema_verify.sql",
        8,
    )
    mod.verify_manifest_sql(
        db_url,
        repo_root / "scripts" / "production_cutover_acl_verify.sql",
        3,
    )
    auth_gate = mod.query(
        db_url,
        """
select ((select md5(pg_get_triggerdef(t.oid,true)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname='auth' and c.relname='users' and t.tgname='on_auth_user_created')='786e53a33077b3a68f1ec248e238d18a')::text || '|' ||
       ((select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='handle_new_user' and pg_get_function_identity_arguments(p.oid)='')='dbae3074708706cbe687389241c39a16')::text;
""",
    )
    if auth_gate not in ("true|true", "t|t"):
        mod.die(f"canonical auth trigger/handler fingerprint failed: {auth_gate}")


# Patch only the bootstrap function; retain all original local-host guards, source gates,
# transforms, final semantic gates, rollback, and evidence generation.
mod.bootstrap_canonical = bootstrap_canonical_ordered

if __name__ == "__main__":
    mod.main()
