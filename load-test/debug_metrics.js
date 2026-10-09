/**
 * Debug script - melihat format data.metrics di k6 v1.6+
 * Jalankan: k6 run load-test/debug_metrics.js
 */
import http from 'k6/http';
import encoding from 'k6/encoding';
import { sleep } from 'k6';
import { stagingSupabaseUrl, stagingLearnerHeaders } from './staging-config.js';

export const options = {
    iterations: 1,
    vus: 1,
};

const SUPABASE_URL = stagingSupabaseUrl(__ENV);
const HEADERS = stagingLearnerHeaders(__ENV, (value) => encoding.b64decode(value, 'std', 's'));

export default function debugMetricsScenario() {
    http.get(`${SUPABASE_URL}/rest/v1/exams?select=id&limit=1`, {
        headers: HEADERS
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
