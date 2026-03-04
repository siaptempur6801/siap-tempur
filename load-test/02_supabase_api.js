/**
 * Load Test 02 - Supabase REST API (Data Publik)
 * Menguji endpoint Supabase langsung, tanpa login
 *
 * Jalankan:
 *   k6 run load-test/02_supabase_api.js
 *
 * Target: 500 concurrent users
 * Threshold: p(95) < 1500ms, error rate < 5%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const SUPABASE_URL = __ENV.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY

const errorRate = new Rate('error_rate');

export const options = {
    stages: [
        { duration: '30s', target: 50 },   // warm-up
        { duration: '1m', target: 200 },  // ramp-up
        { duration: '1m', target: 500 },  // peak load
        { duration: '30s', target: 0 },    // cool-down
    ],
    thresholds: {
        http_req_duration: ['p(95)<1500'],
        error_rate: ['rate<0.05'],
    },
};

const HEADERS = {
    'apikey': SUPABASE_ANON,
    'Authorization': 'Bearer ' + SUPABASE_ANON,
    'Content-Type': 'application/json',
};

export default function () {
    const res = http.get(
        SUPABASE_URL + '/rest/v1/tryouts?select=id,title,description,is_active&is_active=eq.true&order=created_at.desc&limit=10',
        { headers: HEADERS }
    );

    let isArray = false;
    if (res.status === 200) {
        try { isArray = Array.isArray(JSON.parse(res.body)); } catch (_) { }
    }

    const ok = check(res, {
        'status 200': (r) => r.status === 200,
        'response < 1.5s': (r) => r.timings.duration < 1500,
        'returns array': () => isArray,
    });

    errorRate.add(!ok);
    sleep(Math.random() + 0.5);
}
