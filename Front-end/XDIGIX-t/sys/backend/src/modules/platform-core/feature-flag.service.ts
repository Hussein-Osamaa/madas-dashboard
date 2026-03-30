import { FeatureFlag, IFeatureFlag } from './feature-flag.schema';
import { auditService } from './audit.service';
import { createLogger } from '../../lib/logger';

const log = createLogger('feature-flag');

export const featureFlagService = {
  /**
   * Get the value of a feature flag for a tenant.
   * Returns false if the flag has not been explicitly set.
   */
  async getFeatureFlag(tenantId: string, flagName: string): Promise<boolean> {
    const flag = await FeatureFlag.findOne({ tenantId, flagName }).lean<IFeatureFlag>();
    return flag?.enabled ?? false;
  },

  /**
   * Set a feature flag for a tenant. Creates if not exists, updates if it does.
   * Audit-logged.
   */
  async setFeatureFlag(
    tenantId: string,
    flagName: string,
    enabled: boolean,
    actor: string
  ): Promise<void> {
    await FeatureFlag.findOneAndUpdate(
      { tenantId, flagName },
      { $set: { enabled, updatedBy: actor } },
      { upsert: true, new: true }
    );

    await auditService.log({
      actor,
      actorType: 'admin',
      module: 'feature-flag',
      action: enabled ? 'flag_enabled' : 'flag_disabled',
      entityType: 'feature_flag',
      entityId: flagName,
      tenantId,
      details: { flagName, enabled },
    });

    log.info(`Feature flag ${enabled ? 'enabled' : 'disabled'}: ${flagName}`, { tenantId, actor });
  },

  /**
   * List all feature flags for a tenant.
   */
  async listTenantFlags(tenantId: string): Promise<IFeatureFlag[]> {
    return FeatureFlag.find({ tenantId }).lean<IFeatureFlag[]>();
  },
};
