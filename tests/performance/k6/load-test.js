import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const getHacksDuration = new Trend('get_hacks_duration', true);

// Configuration options
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 50 }, // Sustained peak load of 50 users
    { duration: '30s', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Overall error rate must be less than 1%
    errors: ['rate<0.01'],
  },
};

// Base URL falls back to local API Gateway if not provided
const BASE_URL = __ENV.API_BASE_URL || 'http://host.docker.internal:4000';

export default function () {
  // 1. Check API Health
  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });
  errorRate.add(healthRes.status !== 200);

  // 2. Fetch Paginated Hacks
  const hacksRes = http.get(`${BASE_URL}/api/v1/hacks?page=1&pageSize=20`);
  getHacksDuration.add(hacksRes.timings.duration);
  check(hacksRes, {
    'hacks list status is 200': (r) => r.status === 200,
    'hacks list returned within 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(hacksRes.status !== 200);

  // Pause between iterations to simulate realistic user think-time
  sleep(1);
}
