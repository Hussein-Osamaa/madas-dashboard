/**
 * Onboarding sandbox verification helpers.
 *
 * Executable test scenarios against a running server.
 * Usage: BASE_URL=http://localhost:4000 npx tsx loadtest/onboarding-sandbox.ts
 */

const BASE = process.env.BASE_URL || 'http://localhost:4000';

async function post(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': BASE },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Origin': BASE } });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log('═══ ONBOARDING SANDBOX VERIFICATION ═══');
  console.log(`Target: ${BASE}\n`);

  // 1. Successful payment flow
  console.log('── Scenario 1: Payment Success ──');
  const successResult = await post('/api/onboarding/webhooks/generic', {
    paymentSessionId: 'PSN-SANDBOX1',
    status: 'success',
    externalPaymentIntentId: 'pi_sandbox_123',
  });
  console.log(`  Status: ${successResult.status}`);
  console.log(`  Response: ${JSON.stringify(successResult.data)}\n`);

  // 2. Failed payment flow
  console.log('── Scenario 2: Payment Failure ──');
  const failResult = await post('/api/onboarding/webhooks/generic', {
    paymentSessionId: 'PSN-SANDBOX2',
    status: 'failed',
    failureReason: 'Card declined',
  });
  console.log(`  Status: ${failResult.status}`);
  console.log(`  Response: ${JSON.stringify(failResult.data)}\n`);

  // 3. Expired payment session
  console.log('── Scenario 3: Payment Expired ──');
  const expiredResult = await post('/api/onboarding/webhooks/generic', {
    paymentSessionId: 'PSN-SANDBOX3',
    status: 'expired',
  });
  console.log(`  Status: ${expiredResult.status}`);
  console.log(`  Response: ${JSON.stringify(expiredResult.data)}\n`);

  // 4. Duplicate webhook delivery (idempotent)
  console.log('── Scenario 4: Duplicate Success (idempotent) ──');
  const dup1 = await post('/api/onboarding/webhooks/generic', {
    paymentSessionId: 'PSN-SANDBOX1',
    status: 'success',
  });
  console.log(`  First:  ${dup1.status} — ${JSON.stringify(dup1.data)}`);
  const dup2 = await post('/api/onboarding/webhooks/generic', {
    paymentSessionId: 'PSN-SANDBOX1',
    status: 'success',
  });
  console.log(`  Second: ${dup2.status} — ${JSON.stringify(dup2.data)}\n`);

  // 5. Stripe webhook (without signature — dev mode)
  console.log('── Scenario 5: Stripe webhook (dev mode) ──');
  const stripeResult = await post('/api/onboarding/webhooks/stripe', {
    type: 'checkout.session.completed',
    id: 'evt_sandbox_1',
    data: {
      object: {
        metadata: { paymentSessionId: 'PSN-SANDBOX4' },
        payment_intent: 'pi_sandbox_stripe',
        subscription: 'sub_sandbox_stripe',
      },
    },
  });
  console.log(`  Status: ${stripeResult.status}`);
  console.log(`  Response: ${JSON.stringify(stripeResult.data)}\n`);

  // 6. Check admin funnel
  console.log('── Scenario 6: Admin Funnel ──');
  const funnel = await get('/api/admin/onboarding/funnel');
  console.log(`  Status: ${funnel.status}`);
  console.log(`  Funnel: ${JSON.stringify(funnel.data).slice(0, 200)}\n`);

  // 7. Check metrics
  console.log('── Scenario 7: Metrics ──');
  const metrics = await get('/api/admin/onboarding/metrics');
  console.log(`  Status: ${metrics.status}`);
  console.log(`  Metrics: ${JSON.stringify(metrics.data).slice(0, 200)}\n`);

  console.log('═══ SANDBOX VERIFICATION COMPLETE ═══');
}

main().catch((err) => {
  console.error('Sandbox verification failed:', err);
  process.exit(1);
});
