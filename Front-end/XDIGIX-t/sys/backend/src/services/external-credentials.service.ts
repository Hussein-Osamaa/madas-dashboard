/**
 * Resolve external API credentials per tenant.
 * Sources (in order): env override EXTERNAL_CREDENTIALS_JSON, then MongoDB.
 * No hardcoded secrets; fail closed if tenant missing or disabled.
 */

import type { ExternalTenantCredentials } from '../types/external-api.types';
import { ExternalTenantConfig } from '../schemas/external-tenant-config.schema';

const ENV_CREDENTIALS = 'EXTERNAL_CREDENTIALS_JSON';

function loadFromEnv(tenantId: string): ExternalTenantCredentials | null {
  const raw = process.env[ENV_CREDENTIALS];
  if (!raw || typeof raw !== 'string') return null;
  try {
    const map = JSON.parse(raw) as Record<string, { apiToken: string; webhookSecret: string; enabled?: boolean; apiEnabled?: boolean; webhookEnabled?: boolean }>;
    const entry = map[tenantId];
    if (!entry || !entry.apiToken || !entry.webhookSecret) return null;
    return {
      tenantId,
      apiToken: entry.apiToken,
      webhookSecret: entry.webhookSecret,
      enabled: entry.enabled !== false,
      apiEnabled: entry.apiEnabled !== false,
      webhookEnabled: entry.webhookEnabled !== false,
    };
  } catch {
    return null;
  }
}

export async function getExternalTenantCredentials(tenantId: string): Promise<ExternalTenantCredentials | null> {
  if (!tenantId || typeof tenantId !== 'string') return null;

  const fromEnv = loadFromEnv(tenantId);
  if (fromEnv) return fromEnv;

  const doc = await ExternalTenantConfig.findOne({ tenantId }).lean();
  if (!doc) return null;

  const enabled = doc.enabled !== false;
  const apiEnabled = doc.apiEnabled !== false;
  const webhookEnabled = doc.webhookEnabled !== false;
  if (!enabled || (!apiEnabled && !webhookEnabled)) return null;

  return {
    tenantId: doc.tenantId,
    apiToken: doc.apiToken,
    webhookSecret: doc.webhookSecret,
    enabled,
    apiEnabled,
    webhookEnabled,
  };
}

/** Look up tenant by API token (for Bearer auth). Constant-time comparison is done in middleware. */
export async function getExternalTenantByApiToken(token: string): Promise<ExternalTenantCredentials | null> {
  if (!token || typeof token !== 'string') return null;

  const doc = await ExternalTenantConfig.findOne({ apiToken: token }).lean();
  if (!doc) return null;

  const enabled = doc.enabled !== false && doc.apiEnabled !== false;
  if (!enabled) return null;

  return {
    tenantId: doc.tenantId,
    apiToken: doc.apiToken,
    webhookSecret: doc.webhookSecret,
    enabled: doc.enabled !== false,
    apiEnabled: doc.apiEnabled !== false,
    webhookEnabled: doc.webhookEnabled !== false,
  };
}
