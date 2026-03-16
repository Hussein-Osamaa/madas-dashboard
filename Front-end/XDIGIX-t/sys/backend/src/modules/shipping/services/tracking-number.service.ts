/**
 * Tracking Number Generator
 * Format: XDGYYMMDD + 6-digit random = e.g. XDG26031600042
 */
import { Shipment } from '../../../schemas/shipping/shipment.schema';

export async function generateTrackingNumber(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const prefix = `XDG${yy}${mm}${dd}`;

  for (let attempt = 0; attempt < 10; attempt++) {
    const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    const candidate = `${prefix}${rand}`;
    const exists = await Shipment.exists({ trackingNumber: candidate });
    if (!exists) return candidate;
  }

  // Fallback with timestamp
  return `${prefix}${Date.now().toString().slice(-6)}`;
}
