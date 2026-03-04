/**
 * Debug script - melihat format data.metrics di k6 v1.6+
 * Jalankan: k6 run load-test/debug_metrics.js
 */
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
    duration: '10s',
    vus: 5,
};

const SUPABASE_URL = __ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = __ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function () {
    http.get(`${SUPABASE_URL}/rest/v1/tryouts?select=id&limit=1`, {
        headers: {
            'apikey': SUPABASE_ANON,
        }
    });
    sleep(0.5);
}

export function handleSummary(data) {
    // Dump keys dan salah satu metric untuk debug format
    const durKeys = data.metrics.http_req_duration
        ? JSON.stringify(Object.keys(data.metrics.http_req_duration))
        : 'N/A';
    const durValues = data.metrics.http_req_duration
        ? JSON.stringify(data.metrics.http_req_duration)
        : 'N/A';
    console.log('Duration metric keys: ' + durKeys);
    console.log('Duration metric: ' + durValues);
    return {};
}
