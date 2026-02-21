import { ReactNode } from 'react';
import clsx from 'clsx';

type Props = {
  label: string;
  primaryValue: string;
  secondaryValue?: string;
  trend?: { value: string; positive?: boolean; note?: string };
  icon: ReactNode;
  className?: string;
};

const KpiCard = ({ label, primaryValue, secondaryValue, trend, icon, className }: Props) => (
  <div
    className={clsx(
      'flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm backdrop-blur',
      'relative z-0',
      className
    )}
  >
    <div className="flex items-center justify-between">
      <span className="rounded-2xl bg-primary/10 p-3 text-primary">{icon}</span>
      {trend ? (
        <span
          className={clsx(
            'rounded-full px-3 py-1 text-xs font-semibold tracking-wide',
            trend.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          )}
        >
          {trend.value} {trend.note ? `• ${trend.note}` : ''}
        </span>
      ) : null}
    </div>
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-madas-text/60">{label}</p>
      <p className="text-3xl font-semibold text-primary">{primaryValue}</p>
      {secondaryValue ? <p className="text-sm text-madas-text/60">{secondaryValue}</p> : null}
    </div>
  </div>
);

export default KpiCard;

