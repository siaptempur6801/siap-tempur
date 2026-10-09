/** Never send load to production. Larger runs require explicit staging opt-in. */
export const STAGING_REF = 'lpgrivowdcepcxradavu';
export function stagingSupabaseUrl(env) {
    const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    if (url !== `https://${STAGING_REF}.supabase.co`) throw new Error('Load tests require the approved Supabase staging project');
    return url;
}
export function stagingAppUrl(env) {
    const url = (env.BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
    if (!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(url)) {
        if (env.LOAD_TEST_APPROVED_STAGING_ORIGIN !== url || !/^https:\/\/[^/]+$/.test(url)
            || /(?:^|\.)siaptempur\.id(?::\d+)?$/.test(url.replace(/^https:\/\//,''))) {
            throw new Error('Remote app load requires an explicitly approved staging origin');
        }
    }
    return url;
}
export function safeOptions(env, thresholds) {
    if (env.LOAD_TEST_STRESS === '1') {
        if (env.LOAD_TEST_ALLOW_STAGING !== '1') throw new Error('Stress testing requires explicit staging approval');
        return { stages: [{duration:'20s',target:5},{duration:'30s',target:10},{duration:'20s',target:0}], thresholds,
            summaryTrendStats:['avg','min','med','max','p(50)','p(95)','p(99)'] };
    }
    return { vus:1,iterations:3,thresholds,summaryTrendStats:['avg','min','med','max','p(50)','p(95)','p(99)'] };
}
export function stagingHeaders(env, decodeBase64 = (value) => atob(value)) {
    const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) throw new Error('A publishable staging API key is required');
    // Publishable keys are not JWTs. Authenticated reads use a disposable learner
    // JWT passed separately; never load-test using service_role credentials.
    const headers = {apikey:key,'Content-Type':'application/json'};
    if (env.LOAD_TEST_LEARNER_JWT) {
        let claims;
        try {
            const encoded = env.LOAD_TEST_LEARNER_JWT.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
            claims = JSON.parse(decodeBase64(encoded.padEnd(Math.ceil(encoded.length / 4) * 4,'=')));
        } catch { throw new Error('Invalid disposable learner JWT'); }
        if (claims.role !== 'authenticated' || claims.user_metadata?.ci_e2e !== true
            || claims.iss !== `https://${STAGING_REF}.supabase.co/auth/v1`) {
            throw new Error('Load tests require a disposable staging learner, never service_role');
        }
        headers.Authorization = `Bearer ${env.LOAD_TEST_LEARNER_JWT}`;
    }
    return headers;
}

// Catalog reads are protected by Schema V2 RLS; anonymous requests must fail.
export function stagingLearnerHeaders(env, decodeBase64) {
    if (!env.LOAD_TEST_LEARNER_JWT) throw new Error('Schema V2 reads require a disposable staging learner JWT');
    return stagingHeaders(env, decodeBase64);
}
