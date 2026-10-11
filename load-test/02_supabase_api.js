/** Schema V2 read-only catalog smoke; explicit staging-only stress opt-in. */
import http from 'k6/http'
import encoding from 'k6/encoding'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'
import { safeOptions, stagingLearnerHeaders, stagingSupabaseUrl } from './staging-config.js'
const url = stagingSupabaseUrl(__ENV)
const headers = stagingLearnerHeaders(__ENV, (value) => encoding.b64decode(value, 'std', 's'))
const errorRate = new Rate('error_rate')
export const options = safeOptions(__ENV, {
  http_req_duration: ['p(95)<1500'],
  error_rate: ['rate<0.05'],
})
export default function supabaseApiScenario() {
  const res = http.get(
    `${url}/rest/v1/exams?select=id,title,slug&status=in.(active,ACTIVE,scheduled,SCHEDULED)&order=created_at.desc&limit=10`,
    { headers, tags: { endpoint: 'schema_v2_catalog' } },
  )
  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'returns catalog array': (r) => {
      try {
        return Array.isArray(r.json())
      } catch {
        return false
      }
    },
    'response < 1.5s': (r) => r.timings.duration < 1500,
  })
  errorRate.add(!ok)
  sleep(1)
}
