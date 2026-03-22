import { useState, useEffect, useRef, memo } from 'react';
import { StatsSectionData } from '../../../types/builder';
import BlockWrapper from '../BlockWrapper';

type Props = { data: StatsSectionData; style?: React.CSSProperties; isSelected?: boolean; onEditBlock?: (dataKey: string, blockIndex: number) => void; onDeleteBlock?: (dataKey: string, blockIndex: number) => void };

const StatsSection = ({ data, style, isSelected, onEditBlock, onDeleteBlock }: Props) => {
  const d = (data ?? {}) as Record<string, any>;

  const title = d.title || '';
  const subtitle = d.subtitle || '';
  const layout = d.layout ?? 'row';
  const animated = d.animated ?? true;
  const paddingTop = d.padding_top ?? 36;
  const paddingBottom = d.padding_bottom ?? 36;

  const stats = d.stats ?? [];
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated) { setVisible(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animated]);

  const defaultStats = [
    { value: '50+', label: 'Products', prefix: '', suffix: '', icon: '' },
    { value: '1000+', label: 'Customers', prefix: '', suffix: '', icon: '' },
    { value: '99%', label: 'Satisfaction', prefix: '', suffix: '', icon: '' },
    { value: '24/7', label: 'Support', prefix: '', suffix: '', icon: '' },
  ];

  const displayStats = stats.length > 0 ? stats : defaultStats;

  return (
    <section className="w-full" style={{ paddingTop: `${paddingTop}px`, paddingBottom: `${paddingBottom}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6" ref={ref}>
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && <h2 className="text-3xl md:text-4xl font-bold mb-2">{title}</h2>}
            {subtitle && <p className="text-sm" style={{ opacity: 0.75 }}>{subtitle}</p>}
          </div>
        )}
        <div className={`grid ${layout === 'grid' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'} gap-6 sm:gap-8`}>
          {displayStats.map((stat: any, index: number) => (
            <BlockWrapper key={index} dataKey="stats" blockIndex={index} blockType="stat" isSelected={!!isSelected} onEdit={onEditBlock ?? ((_dk: string, _bi: number) => {})} onDelete={onDeleteBlock ?? ((_dk: string, _bi: number) => {})}>
            <div className={`text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: `${index * 100}ms` }}>
              {stat.icon && <span className="material-icons text-2xl mb-2">{stat.icon}</span>}
              <p className="text-3xl md:text-4xl font-bold mb-1">
                {stat.prefix}{stat.value}{stat.suffix}
              </p>
              <p className="text-sm uppercase tracking-wider" style={{ opacity: 0.6 }}>{stat.label}</p>
            </div>
            </BlockWrapper>
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(StatsSection);
