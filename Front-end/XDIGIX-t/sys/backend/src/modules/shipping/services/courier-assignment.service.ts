/**
 * Courier Assignment Algorithm
 *
 * Score = (distance * 0.5) + (activeOrders * 0.3) + (priority * 0.2)
 * Courier with LOWEST score wins.
 *
 * Constraints:
 *   - zone match
 *   - vehicle type weight capacity
 *   - courier availability (status = 'available')
 */
import { Courier, ICourier } from '../../../schemas/shipping/courier.schema';
import { Shipment } from '../../../schemas/shipping/shipment.schema';
import { ShipmentEvent } from '../../../schemas/shipping/shipment-event.schema';

interface AssignmentInput {
  shipmentId: string;
  zoneId?: string;
  chargeableWeight: number;
  recipientLat?: number;
  recipientLng?: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreForCourier(
  courier: ICourier,
  distanceKm: number,
  priority: number
): number {
  return distanceKm * 0.5 + courier.activeOrders * 0.3 + priority * 0.2;
}

export async function autoAssignCourier(input: AssignmentInput): Promise<string | null> {
  const query: Record<string, unknown> = {
    status: 'available',
    isActive: true,
    maxWeightCapacity: { $gte: input.chargeableWeight },
  };

  if (input.zoneId) {
    query.assignedZoneIds = input.zoneId;
  }

  const candidates = await Courier.find(query).lean();
  if (candidates.length === 0) return null;

  let best: { courierId: string; score: number } | null = null;

  for (const courier of candidates) {
    let distance = 10; // default estimate km
    if (
      input.recipientLat != null &&
      input.recipientLng != null &&
      courier.currentLat != null &&
      courier.currentLng != null
    ) {
      distance = haversineKm(
        courier.currentLat,
        courier.currentLng,
        input.recipientLat,
        input.recipientLng
      );
    }
    const priority = courier.courierType === 'company' ? 0 : 1; // prefer company couriers
    const score = scoreForCourier(courier, distance, priority);

    if (!best || score < best.score) {
      best = { courierId: courier._id.toString(), score };
    }
  }

  if (!best) return null;

  // Assign
  await Promise.all([
    Shipment.findByIdAndUpdate(input.shipmentId, {
      courierId: best.courierId,
      status: 'assigned_to_courier',
    }),
    Courier.findByIdAndUpdate(best.courierId, { $inc: { activeOrders: 1 } }),
    ShipmentEvent.create({
      shipmentId: input.shipmentId,
      trackingNumber: '', // caller fills or re-fetches
      eventType: 'ASSIGNED_TO_COURIER',
      description: `Shipment assigned to courier`,
      performedBy: 'system',
      performedByRole: 'system',
      timestamp: new Date(),
    }),
  ]);

  return best.courierId;
}
