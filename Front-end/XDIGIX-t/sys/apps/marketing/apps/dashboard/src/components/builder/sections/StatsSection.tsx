import { useEffect, useState, useRef } from 'react';
import { StatsSectionData } from '../../../types/builder';

type Props = {
  data: StatsSectionData;
  style?: React.CSSProperties;
};

const StatsSection = ({ data, style }: Props) => {
  const {
    title,
    subtitle,
    stats = [],
    layout = 'row',
    animated = true
  } = data;

  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!animated) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [animated]);

  const defaultStats: Array<{ value: string; label: string; prefix?: string; suffix?: string; icon?: string }> = [
    { value: '10K+', label: 'Happy Customers', icon: '😊' },
    { value: '500+', label: 'Products Sold', icon: '📦' },
    { value: '99%', label: 'Satisfaction Rate', icon: '⭐' },
    { value: '24/7', label: 'Support Available', icon: '💬' }
  ];

  const displayStats = stats.length > 0 ? stats : defaultStats;

  return (
    <section
      ref={sectionRef}
      className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-br from-primary to-primary/80 transition-all duration-300"
      style={style}
    >
      <div className="max-w-6xl mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-10 sm:mb-14">
            {title && (
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-base sm:text-lg text-white/80 px-2">{subtitle}</p>
            )}
          </div>
        )}

        <div
          className={`grid gap-6 sm:gap-8 ${
            layout === 'row'
              ? 'grid-cols-2 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {displayStats.map((stat, index) => (
            <div
              key={index}
              className={`text-center p-6 sm:p-8 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {stat.icon && (
                <div className="text-3xl sm:text-4xl mb-3">{stat.icon}</div>
              )}
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
                {stat.prefix}
                <span className={isVisible && animated ? 'animate-pulse' : ''}>
                  {stat.value}
                </span>
                {stat.suffix}
              </div>
              <div className="text-sm sm:text-base text-white/80 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

