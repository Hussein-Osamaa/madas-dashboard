/** Format date as YYYY-MM for transaction month field */
export function toMonthString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** ISO week label YYYY-WXX (e.g. 2026-W08) for weekly reports */
export function toWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((d.getTime() - jan1.getTime()) / 604800000);
  const y = d.getUTCFullYear();
  return `${y}-W${String(weekNum).padStart(2, '0')}`;
}
