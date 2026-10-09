/**
 * Load Test 01 - Public Pages (Next.js)
 * Menguji kapasitas halaman publik: landing page, login, register
 *
 * Default: one VU, three iterations. Stress requires explicit staging opt-in.
 * Jalankan: k6 run load-test/01_public_pages.js
 * Untuk ganti URL: k6 run -e BASE_URL=https://your-domain.com 01_public_pages.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

import { safeOptions, stagingAppUrl } from './staging-config.js';
const BASE_URL = stagingAppUrl(__ENV);

// Custom metrics
const errorRate = new Rate('error_rate');
const landingDuration = new Trend('landing_page_duration', true);
const loginPageDuration = new Trend('login_page_duration', true);

export const options = safeOptions(__ENV,{http_req_duration:['p(95)<2000'],error_rate:['rate<0.05']});

// A staging label in an env var cannot override a deployment identifying itself
// as production. One read-only preflight runs before any remote app load.
export function setup() {
    if (BASE_URL.startsWith('https://')) {
        const health = http.get(`${BASE_URL}/api/health`);
        if (health.status !== 200 || !['preview','staging'].includes(health.json('deploymentEnvironment'))) {
            throw new Error('Remote application did not identify itself as staging/preview');
        }
    }
}

export default function publicPagesScenario() {
    const headers = { 'Accept': 'text/html' };

    // --- Test 1: Landing Page ---
    const landingRes = http.get(`${BASE_URL}/`, { headers, tags: { page: 'landing' } });
    landingDuration.add(landingRes.timings.duration);
    const landingOK = check(landingRes, {
        'landing: status 200': (r) => r.status === 200,
        'landing: < 2s': (r) => r.timings.duration < 2000,
        'landing: ada konten': (r) => r.body && r.body.length > 100,
    });
    errorRate.add(!landingOK);

    sleep(Math.random() * 1 + 0.5); // Jeda 0.5–1.5 detik (simulasi manusia)

    // --- Test 2: Login Page ---
    const loginRes = http.get(`${BASE_URL}/login`, { headers, tags: { page: 'login' } });
    loginPageDuration.add(loginRes.timings.duration);
    const loginOK = check(loginRes, {
        'login: status 200': (r) => r.status === 200,
        'login: < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!loginOK);

    sleep(Math.random() * 1 + 0.5);

    // --- Test 3: Register Page ---
    const registerRes = http.get(`${BASE_URL}/register`, { headers, tags: { page: 'register' } });
    const registerOK = check(registerRes, {
        'register: status 200': (r) => r.status === 200,
        'register: < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!registerOK);

    sleep(Math.random() * 1 + 0.5);
}


