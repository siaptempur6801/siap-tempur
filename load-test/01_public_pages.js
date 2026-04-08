/**
 * Load Test 01 - Public Pages (Next.js)
 * Menguji kapasitas halaman publik: landing page, login, register
 *
 * Skenario:
 *   0  → 50  VU  dalam 30 detik  (warm-up)
 *   50 → 200 VU  dalam 1 menit   (ramp-up sedang)
 *   200→ 500 VU  selama 1 menit  (peak load)
 *   500→ 0   VU  dalam 30 detik  (cool-down)
 *
 * Jalankan: k6 run 01_public_pages.js
 * Untuk ganti URL: k6 run -e BASE_URL=https://your-domain.com 01_public_pages.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom metrics
const errorRate = new Rate('error_rate');
const landingDuration = new Trend('landing_page_duration', true);
const loginPageDuration = new Trend('login_page_duration', true);

export const options = {
    stages: [
        { duration: '30s', target: 50 },   // Warm-up: naik ke 50 user
        { duration: '1m', target: 200 },  // Ramp-up: naik ke 200 user
        { duration: '1m', target: 500 },  // Peak: tahan di 500 user
        { duration: '30s', target: 0 },    // Cool-down
    ],
    thresholds: {
        // 95% request harus selesai < 2 detik
        http_req_duration: ['p(95)<2000'],
        // Error rate tidak boleh melebihi 5%
        error_rate: ['rate<0.05'],
    },
};

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


