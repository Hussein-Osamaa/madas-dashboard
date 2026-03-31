import { Plan, IPlan } from './plan.schema';
import { createLogger } from '../../lib/logger';

const log = createLogger('plan-service');

/** Default plan definitions seeded on first boot. */
const DEFAULT_PLANS = [
  {
    planId: 'free',
    name: 'Free',
    limits: { products: 50, staff: 2, sites: 1, monthlyOrders: 100, storageMB: 500 },
    price: 0,
    currency: 'USD',
  },
  {
    planId: 'starter',
    name: 'Starter',
    limits: { products: 500, staff: 5, sites: 3, monthlyOrders: 1000, storageMB: 2000 },
    price: 29,
    currency: 'USD',
  },
  {
    planId: 'pro',
    name: 'Pro',
    limits: { products: -1, staff: 25, sites: 10, monthlyOrders: -1, storageMB: 10000 },
    price: 79,
    currency: 'USD',
  },
  {
    planId: 'enterprise',
    name: 'Enterprise',
    limits: { products: -1, staff: -1, sites: -1, monthlyOrders: -1, storageMB: -1 },
    price: 199,
    currency: 'USD',
  },
];

export const planService = {
  /** Get a single plan by ID. */
  async getPlan(planId: string): Promise<IPlan | null> {
    return Plan.findOne({ planId }).lean<IPlan>();
  },

  /** List all active plans. */
  async listPlans(): Promise<IPlan[]> {
    return Plan.find({ isActive: true }).sort({ price: 1 }).lean<IPlan[]>();
  },

  /**
   * Seed default plans if they don't already exist.
   * Intended to be called once on application startup.
   */
  async seedDefaultPlans(): Promise<void> {
    for (const planDef of DEFAULT_PLANS) {
      const res = await Plan.updateOne(
        { planId: planDef.planId },
        { $setOnInsert: planDef },
        { upsert: true },
      );
      if (res.upsertedCount > 0) {
        log.info(`Seeded default plan: ${planDef.planId}`);
      }
    }
    log.info('Default plan seeding complete');
  },
};
