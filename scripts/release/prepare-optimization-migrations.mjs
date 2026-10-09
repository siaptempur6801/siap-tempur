#!/usr/bin/env node
// Generates reviewed SQL only; never connects to any database or reads secrets.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REVIEWED_MIGRATIONS = [
    { version: '20261009060323', name: 'learner_overview_read_models', sha256: '2313557892334a6f198cce945cde6dde907aa536a4dae609bd5eb2c92e5ee13e' },
    { version: '20261009063825', name: 'learner_reward_totals', sha256: 'df52d3839c3b0aef143bf6432d51f38d9efb763217f2375fe626b144f87a0884' },
]
const FUNCTIONS = [
    ['practice_completed_attempt_totals(uuid)', 'b543c95faa2cb4801ad1d86deed0189c', false],
    ['practice_active_attempt_overviews(uuid)', '5257741ba2c8ca2a0372bdcb47d72bc4', false],
    ['learner_exam_attempt_summaries(uuid[],boolean)', '47c04e9329e2e0cc312a9a3d49e31ecd', true],
    ['learner_completed_attempt_totals()', '3d5da3dba496ba280505d3949415d477', true],
]
const signatures = FUNCTIONS.map(([signature]) => `to_regprocedure('public.${signature}')`)

export function prepareOptimizationSql(sources) {
    for (const migration of REVIEWED_MIGRATIONS) {
        const source = sources[migration.version]
        if (typeof source !== 'string' || createHash('sha256').update(source).digest('hex') !== migration.sha256) {
            throw new Error(`Unreviewed migration content: ${migration.version}`)
        }
    }
    return `-- Generated from two checksum-pinned files. Human approval required.
-- Execute with psql -X -v ON_ERROR_STOP=1 -f <this-file> on the approved connection.
-- Never use db push or broad ledger repair for this release.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $preflight$
BEGIN
    IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Expected reviewed postgres migration role'; END IF;
    IF ${signatures.map(signature => `${signature} IS NOT NULL`).join(' OR ')} THEN
        RAISE EXCEPTION 'Projection already exists: inspect definitions and ledger; do not overwrite';
    END IF;
    IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations
        WHERE version IN ('20261009060323','20261009063825')) THEN
        RAISE EXCEPTION 'Migration version already recorded: inspect drift; do not repair blindly';
    END IF;
END;
$preflight$;

${REVIEWED_MIGRATIONS.map(m => sources[m.version]).join('\n')}

DO $verify$
DECLARE signature text; expected_hash text; learner_execute boolean; function_oid oid;
BEGIN
    FOR signature, expected_hash, learner_execute IN
        SELECT * FROM (VALUES
            ${FUNCTIONS.map(([signature, hash, learner]) => `('public.${signature}', '${hash}', ${learner})`).join(',\n            ')}
        ) AS expected(signature, definition_hash, learner_execute)
    LOOP
        function_oid := to_regprocedure(signature);
        IF function_oid IS NULL THEN RAISE EXCEPTION 'Missing projection %', signature; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = function_oid
            AND NOT prosecdef AND provolatile = 's'
            AND proconfig = ARRAY['search_path=""']
            AND md5(pg_get_functiondef(oid)) = expected_hash) THEN
            RAISE EXCEPTION 'Definition/security mismatch %', signature;
        END IF;
        IF has_function_privilege('anon', function_oid, 'EXECUTE')
            OR has_function_privilege('authenticated', function_oid, 'EXECUTE') <> learner_execute
            OR NOT has_function_privilege('service_role', function_oid, 'EXECUTE') THEN
            RAISE EXCEPTION 'Effective function ACL mismatch %', signature;
        END IF;
    END LOOP;
END;
$verify$;

${REVIEWED_MIGRATIONS.map(m => `INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('${m.version}', '${m.name}', ARRAY[$migration_${m.version}$${sources[m.version]}$migration_${m.version}$]);`).join('\n')}
NOTIFY pgrst, 'reload schema';
COMMIT;
`
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const output = process.argv[2]
    if (!output || !resolve(output).startsWith('/tmp/')) {
        throw new Error('Provide an output file under /tmp; this command only prepares SQL')
    }
    const root = fileURLToPath(new URL('../../', import.meta.url))
    const sources = Object.fromEntries(REVIEWED_MIGRATIONS.map(m => [m.version,
        readFileSync(resolve(root, `supabase/migrations/${m.version}_${m.name}.sql`), 'utf8')]))
    writeFileSync(output, prepareOptimizationSql(sources), { mode: 0o600, flag: 'wx' })
    console.log(`Prepared ${output}; no database connection or migration executed.`)
}
