import { useState, useEffect, memo } from 'react';
import { CountdownSectionData } from '../../../types/builder';

type Props = { data: CountdownSectionData; style?: React.CSSProperties };

const CountdownSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || 'Sale ends in';
  const subtitle = d.subtitle || '';
  const targetDate = d.targetDate || '';
  const showDays = d.showDays ?? true;
  const showHours = d.showHours ?? true;
  const showMinutes = d.showMinutes ?? true;
  const showSeconds = d.showSeconds ?? true;
  const expiredMessage = d.expiredMessage || 'Sale has ended';
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); clearInterval(interval); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold tabular-nums">{String(value).padStart(2, '0')}</div>
      <div className="text-xs uppercase tracking-widest mt-1 opacity-60">{label}</div>
    </div>
  );

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
        {subtitle && <p className="text-sm opacity-75 mb-6">{subtitle}</p>}
        {expired ? (
          <p className="text-lg">{expiredMessage}</p>
        ) : (
          <div className="flex items-center justify-center gap-6 md:gap-10">
            {showDays && <TimeBlock value={timeLeft.days} label="Days" />}
            {showDays && showHours && <span className="text-3xl font-light opacity-40">:</span>}
            {showHours && <TimeBlock value={timeLeft.hours} label="Hours" />}
            {showHours && showMinutes && <span className="text-3xl font-light opacity-40">:</span>}
            {showMinutes && <TimeBlock value={timeLeft.minutes} label="Min" />}
            {showMinutes && showSeconds && <span className="text-3xl font-light opacity-40">:</span>}
            {showSeconds && <TimeBlock value={timeLeft.seconds} label="Sec" />}
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(CountdownSection);
