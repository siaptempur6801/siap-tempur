/**
 * Load Test 03 - Supabase Free Tier Stress Test
 * ================================================
 * Tujuan: temukan batas nyata free tier Supabase
 *
 * Batas yang diuji:
 *   - DB Pooler connections : 200 (free tier / Nano compute)
 *   - Direct DB connections : 60
 *   - Auth rate limit       : ~30 req/jam per IP (sign-up), tidak terbatas untuk read
 *   - MAU                   : 50.000/bulan (tidak bisa diuji via load test)
 *
 * Strategi: naik bertahap, catat di titik mana error muncul
 *
 * Jalankan:
 *   k6 run \
 *     -e NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
 *     load-test/03_supabase_stress.js
 *
 * Output JSON:
 *   k6 run --out json=load-test/results_stress.json \
 *     -e NEXT_PUBLIC_SUPABASE_URL=... \
 *     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *     load-test/03_supabase_stress.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const SUPABASE_URL = __ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Custom metrics ────────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate');
const rateLimitHits = new Counter('rate_limit_429');
const serverErrors = new Counter('server_errors_5xx');
const connErrors = new Counter('connection_errors');
const apiLatency = new Trend('api_latency_ms', true);

// ── Skenario: naik bertahap melewati batas pooler (200) ──────────────────────
export const options = {
    stages: [
        { duration: '20s', target: 50 },  // warm-up
        { duration: '30s', target: 100 },  // lewati 60 direct conn
        { duration: '30s', target: 150 },  // mendekati pooler limit
        { duration: '30s', target: 200 },  // TEP batas pooler
        { duration: '30s', target: 250 },  // LEWAT batas pooler
        { duration: '30s', target: 300 },  // stress
        { duration: '20s', target: 0 },  // cool-down
    ],
    thresholds: {
        // Threshold longgar — kita mau lihat perilaku sistem, bukan gagal test
        http_req_duration: ['p(99)<10000'],
        error_rate: ['rate<0.50'],   // biarkan sampai 50% error
    },
};

const HEADERS = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + SUPABASE_ANON,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
};

// ── Endpoints yang dirotasi ───────────────────────────────────────────────────
const ENDPOINTS = [
    () => http.get(
        `${SUPABASE_URL}/rest/v1/tryouts?select=id,title,price,is_active&is_active=eq.true&limit=10`,
        { headers: HEADERS, tags: { endpoint: 'tryouts_list' } }
    ),
    () => http.get(
        `${SUPABASE_URL}/rest/v1/tryouts?select=count&is_active=eq.true`,
        { headers: { ...HEADERS, 'Prefer': 'count=exact' }, tags: { endpoint: 'tryouts_count' } }
    ),
    () => http.get(
        `${SUPABASE_URL}/rest/v1/rpc/get_active_tryout_count`,
        { headers: HEADERS, tags: { endpoint: 'rpc_call' } }
    ),
];

export default function supabaseStressScenario() {
    // Pilih endpoint acak untuk variasi beban
    const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    const res = endpoint();

    apiLatency.add(res.timings.duration);

    // Catat jenis error secara spesifik
    if (res.status === 429) {
        rateLimitHits.add(1);
    } else if (res.status >= 500) {
        serverErrors.add(1);
    } else if (res.status === 0) {
        // status 0 = koneksi gagal / timeout
        connErrors.add(1);
    }

    const ok = check(res, {
        'status 2xx': (r) => r.status >= 200 && r.status < 300,
        'latency < 3s': (r) => r.timings.duration < 3000,
        'not rate limited': (r) => r.status !== 429,
        'no server error': (r) => r.status < 500,
    });

    errorRate.add(!ok);

    // Jeda sangat singkat — simulasi high concurrent load
    sleep(Math.random() * 0.3 + 0.1);
}

// ── Summary Report ────────────────────────────────────────────────────────────
export function handleSummary(data) {
    const m = data.metrics;

    const get = (metric, stat) => {
        const v = m[metric];
        if (!v) return 'N/A';
        if (v.type === 'rate') return (v.values.rate * 100).toFixed(2) + '%';
        if (v.type === 'counter') return v.values.count;
        if (v.type === 'trend') return v.values[stat]?.toFixed(2) ?? 'N/A';
        return 'N/A';
    };

    const totalReqs = m.http_reqs?.values?.count ?? 0;
    const errRate = get('error_rate', null);
    const p50 = get('api_latency_ms', 'p(50)');
    const p95 = get('api_latency_ms', 'p(95)');
    const p99 = get('api_latency_ms', 'p(99)');
    const rl = get('rate_limit_429', null);
    const sv = get('server_errors_5xx', null);
    const ce = get('connection_errors', null);

    const report = [
        '╔══════════════════════════════════════════════════════╗',
        '║        SUPABASE FREE TIER STRESS TEST REPORT         ║',
        '╠══════════════════════════════════════════════════════╣',
        `║  Total Requests     : ${String(totalReqs).padEnd(29)}║`,
        `║  Error Rate         : ${String(errRate).padEnd(29)}║`,
        '╠══════════════════════════════════════════════════════╣',
        '║  LATENCY                                             ║',
        `║  p50                : ${String(p50 + ' ms').padEnd(29)}║`,
        `║  p95                : ${String(p95 + ' ms').padEnd(29)}║`,
        `║  p99                : ${String(p99 + ' ms').padEnd(29)}║`,
        '╠══════════════════════════════════════════════════════╣',
        '║  ERROR BREAKDOWN                                     ║',
        `║  429 Rate Limited   : ${String(rl).padEnd(29)}║`,
        `║  5xx Server Errors  : ${String(sv).padEnd(29)}║`,
        `║  Connection Errors  : ${String(ce).padEnd(29)}║`,
        '╠══════════════════════════════════════════════════════╣',
        '║  FREE TIER LIMITS (Nano compute)                     ║',
        '║  Pooler connections : 200                            ║',
        '║  Direct connections : 60                             ║',
        '║  MAU limit          : 50.000 / bulan                 ║',
        '╚══════════════════════════════════════════════════════╝',
    ].join('\n');

    console.log('\n' + report);

    return {
        stdout: report + '\n',
    };
}
