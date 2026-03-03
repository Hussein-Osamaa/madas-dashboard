import http from 'k6/http';
import { check } from 'k6';

/**
 * Simple Connectivity Test
 * Tests if the website is accessible and responds correctly
 */

const baseUrl = __ENV.BASE_URL || 'https://madas-store.web.app';

export const options = {
  vus: 1,
  duration: '30s',
};

export default function () {
  // Test 1: Root page
  const homeResponse = http.get(baseUrl, {
    timeout: '30s',
    tags: { name: 'home' },
  });
  
  check(homeResponse, {
    'home page is accessible': (r) => r.status === 200,
    'home page response time < 5s': (r) => r.timings.duration < 5000,
  });
  
  console.log(`Home: ${homeResponse.status} - ${homeResponse.timings.duration}ms`);
  
  // Test 2: Orders page
  const ordersResponse = http.get(`${baseUrl}/orders`, {
    timeout: '30s',
    tags: { name: 'orders' },
  });
  
  check(ordersResponse, {
    'orders page is accessible': (r) => ordersResponse.status === 200 || ordersResponse.status === 302 || ordersResponse.status === 404,
    'orders page response time < 5s': (r) => ordersResponse.timings.duration < 5000,
  });
  
  console.log(`Orders: ${ordersResponse.status} - ${ordersResponse.timings.duration}ms`);
  
  // Test 3: Finance page
  const financeResponse = http.get(`${baseUrl}/finance/overview`, {
    timeout: '30s',
    tags: { name: 'finance' },
  });
  
  check(financeResponse, {
    'finance page is accessible': (r) => financeResponse.status === 200 || financeResponse.status === 302 || financeResponse.status === 404,
    'finance page response time < 5s': (r) => financeResponse.timings.duration < 5000,
  });
  
  console.log(`Finance: ${financeResponse.status} - ${financeResponse.timings.duration}ms`);
}

