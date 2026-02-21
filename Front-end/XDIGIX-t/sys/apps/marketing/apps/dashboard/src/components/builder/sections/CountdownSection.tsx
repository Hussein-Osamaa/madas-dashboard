import { useState, useEffect } from 'react';
import { CountdownSectionData } from '../../../types/builder';

type Props = {
  data: CountdownSectionData;
  style?: React.CSSProperties;
};

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownSection = ({ data, style }: Props) => {
  const {
    title = 'Coming Soon',
    subtitle = 'Something amazing is on its way',
    targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    showDays = true,
    showHours = true,
    showMinutes = true,
    showSeconds = true,
    expiredMessage = 'The wait is over!',
    backgroundColor = '#27491F',
    textColor = '#ffffff'
  } = data;

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference <= 0) {
        setIsExpired(true);
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div
        className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-2 sm:mb-3 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/5 transform -skew-y-12 -translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        <span
          className="text-2xl sm:text-3xl md:text-4xl font-bold relative z-10"
          style={{ color: textColor }}
        >
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span
        className="text-xs sm:text-sm font-medium uppercase tracking-wider opacity-80"
        style={{ color: textColor }}
      >
        {label}
      </span>
    </div>
  );

  return (
    <section
      className="w-full py-16 sm:py-20 md:py-28 px-4 sm:px-6 transition-all duration-300 relative overflow-hidden"
      style={{ backgroundColor, ...style }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6"
          style={{ color: textColor }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-base sm:text-lg md:text-xl mb-10 sm:mb-14 opacity-80"
            style={{ color: textColor }}
          >
            {subtitle}
          </p>
        )}

        {isExpired ? (
          <div
            className="text-2xl sm:text-3xl md:text-4xl font-bold animate-pulse"
            style={{ color: textColor }}
          >
            {expiredMessage}
          </div>
        ) : (
          <div className="flex justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {showDays && <TimeUnit value={timeLeft.days} label="Days" />}
            {showHours && <TimeUnit value={timeLeft.hours} label="Hours" />}
            {showMinutes && <TimeUnit value={timeLeft.minutes} label="Minutes" />}
            {showSeconds && <TimeUnit value={timeLeft.seconds} label="Seconds" />}
          </div>
        )}

        {/* Optional email signup */}
        <div className="mt-10 sm:mt-14">
          <p className="text-sm opacity-70 mb-4" style={{ color: textColor }}>
            Get notified when we launch
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm sm:text-base"
              style={{ color: textColor }}
            />
            <button
              className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 shadow-lg text-sm sm:text-base"
              style={{ backgroundColor: textColor, color: backgroundColor }}
            >
              Notify Me
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CountdownSection;

