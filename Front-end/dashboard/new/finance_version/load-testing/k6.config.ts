import { check, Options } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';
import thresholds from './config/thresholds.json';

// Custom metrics
export const errorRate = new Rate('errors');
export const apiThrottleRate = new Rate('api_throttles');
export const coldStartRate = new Rate('function_cold_starts');

// Environment configuration
const ENV = __ENV.ENV || 'staging';
const environments = {
  local: {
    baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
    apiUrl: __ENV.API_URL || 'http://localhost:5000/api',
  },
  staging: {
    baseUrl: __ENV.BASE_URL || 'https://{{STAGING_DOMAIN}}.vercel.app',
    apiUrl: __ENV.API_URL || 'https://{{STAGING_API}}.vercel.app/api',
  },
  prod: {
    baseUrl: __ENV.BASE_URL || 'https://{{PROD_DOMAIN}}.vercel.app',
    apiUrl: __ENV.API_URL || 'https://{{PROD_API}}.vercel.app/api',
  },
};

export const config: Options = {
  // Default thresholds - can be overridden per test
  thresholds: thresholds[ENV as keyof typeof thresholds] || thresholds.staging,
  
  // Default stages - override in individual test files
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  
  // Summary output options
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  
  // Tags for filtering metrics
  tags: {
    environment: ENV,
    test_type: 'default',
  },
  
  // Disable browser automation unless needed
  // To enable: uncomment and install @k6/browser
  // browser: {
  //   type: 'chromium',
  // },
};

// Export environment config
export const env = environments[ENV as keyof typeof environments] || environments.staging;

// Safety check: prevent running destructive tests in production
export function checkEnvironment(): void {
  const isProduction = ENV === 'prod';
  const allowProdTests = __ENV.ALLOW_PROD_TESTS === 'true';
  const isDestructiveTest = __ENV.DESTRUCTIVE === 'true';
  
  if (isProduction && isDestructiveTest && !allowProdTests) {
    throw new Error(
      'ERROR: Destructive tests are not allowed in production. ' +
      'Set ALLOW_PROD_TESTS=true if you really need to run destructive tests in prod.'
    );
  }
  
  console.log(`[CONFIG] Running in ${ENV} environment`);
  console.log(`[CONFIG] Base URL: ${env.baseUrl}`);
  console.log(`[CONFIG] API URL: ${env.apiUrl}`);
}

// Helper to log test metadata
export function logTestInfo(testName: string, description: string): void {
  console.log(`\n========== ${testName} ==========`);
  console.log(`Description: ${description}`);
  console.log(`Environment: ${ENV}`);
  console.log(`Base URL: ${env.baseUrl}`);
  console.log(`==================================\n`);
}


