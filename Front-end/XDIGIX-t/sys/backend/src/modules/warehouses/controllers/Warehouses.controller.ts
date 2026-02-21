import { v4 as uuidv4 } from 'uuid';
import { FirestoreDoc } from '../../../schemas/document.schema';
import { Business } from '../../../schemas/business.schema';

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
}

export interface CreateWarehouseInput {
  name: string;
  code?: string;
  description?: string;
  address?: string;
}

export async function listWarehouses(clientId: string): Promise<Warehouse[]> {
  const docs = await FirestoreDoc.find({
    businessId: clientId,
    coll: 'warehouses',
  })
    .sort({ 'data.name': 1 })
    .lean();

  return docs.map((d) => {
    const data = (d as { data?: Record<string, unknown> }).data || {};
    return {
      id: (d as { docId: string }).docId,
      name: String(data.name ?? ''),
      code: data.code ? String(data.code) : undefined,
      description: data.description ? String(data.description) : undefined,
      address: data.address ? String(data.address) : undefined,
    };
  });
}

export async function createWarehouse(clientId: string, input: CreateWarehouseInput): Promise<{ id: string }> {
  const business = await Business.findOne({ businessId: clientId }).select('tenantId').lean();
  if (!business) throw new Error('Client not found');

  const warehouseId = uuidv4().replace(/-/g, '').slice(0, 20);
  const data: Record<string, unknown> = {
    name: input.name.trim(),
    code: input.code?.trim() || undefined,
    description: input.description?.trim() || undefined,
    address: input.address?.trim() || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await FirestoreDoc.create({
    tenantId: (business as { tenantId: string }).tenantId,
    businessId: clientId,
    coll: 'warehouses',
    docId: warehouseId,
    data,
  });

  return { id: warehouseId };
}
