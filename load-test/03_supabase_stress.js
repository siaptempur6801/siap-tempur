/** Schema V2 catalog + exact count + owner-only quota projection.
 * Default: 1 VU, 3 iterations. No attempts, payments or users are written.
 * LOAD_TEST_STRESS=1 LOAD_TEST_ALLOW_STAGING=1 enables a bounded staging ramp.
 * LOAD_TEST_LEARNER_JWT + LOAD_TEST_EXAM_IDS are required for reads using only
 * disposable fixture credentials. Do not pass a service-role JWT.
 */
import http from 'k6/http';
import encoding from 'k6/encoding';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { safeOptions, stagingLearnerHeaders, stagingSupabaseUrl } from './staging-config.js';
const url = stagingSupabaseUrl(__ENV);
const headers = stagingLearnerHeaders(__ENV, (value) => encoding.b64decode(value, 'std', 's'));
const examIds = (__ENV.LOAD_TEST_EXAM_IDS || '').split(',').filter(Boolean);
if (!examIds.length) throw new Error('Learner quota load requires fixture exam IDs');
const errorRate = new Rate('error_rate');
const apiLatency = new Trend('api_latency_ms',true);
const rateLimitHits = new Counter('rate_limit_429');
const serverErrors = new Counter('server_errors_5xx');
const connectionErrors = new Counter('connection_errors');
export const options = safeOptions(__ENV,{http_req_duration:['p(95)<1500','p(99)<3000'],error_rate:['rate<0.05']});
export default function supabaseStressScenario() {
    const requests = [
        http.get(`${url}/rest/v1/exams?select=id,title,slug&status=in.(active,ACTIVE)&limit=10`,{headers,tags:{endpoint:'catalog'}}),
        http.request('HEAD',`${url}/rest/v1/exams?select=id&status=in.(active,ACTIVE)`,null,{headers:{...headers,Prefer:'count=exact'},tags:{endpoint:'exact_count'}}),
    ];
    requests.push(http.post(`${url}/rest/v1/rpc/learner_exam_attempt_summaries`,JSON.stringify({p_exam_ids:examIds,p_direct_only:true}),{headers,tags:{endpoint:'learner_quotas'}}));
    for (const res of requests) {
        apiLatency.add(res.timings.duration);
        if(res.status===429)rateLimitHits.add(1);
        if(res.status>=500)serverErrors.add(1);
        if(res.status===0)connectionErrors.add(1);
        const ok=check(res,{'status 200':r=>r.status===200,'latency < 3s':r=>r.timings.duration<3000});
        errorRate.add(!ok);
    }
    sleep(1);
}
