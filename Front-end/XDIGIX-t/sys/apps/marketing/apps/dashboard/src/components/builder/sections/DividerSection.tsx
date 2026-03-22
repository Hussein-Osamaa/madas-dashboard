import { memo } from 'react';
import { DividerSectionData } from '../../../types/builder';

type Props = { data: DividerSectionData; style?: React.CSSProperties };

const DividerSection = ({ data, style }: Props) => {
  const d = (data ?? {}) as Record<string, any>;
  const dividerStyle = d.style ?? 'line';
  const color = d.color ?? '#121212';
  const height = d.height ?? 1;
  const width = d.width ?? '100%';
  const spacing = d.spacing ?? 20;

  const borderStyles: Record<string, string> = {
    line: 'solid',
    dotted: 'dotted',
    dashed: 'dashed',
  };

  return (
    <section className="w-full" style={{ paddingTop: `${spacing}px`, paddingBottom: `${spacing}px`, ...style }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <hr style={{
          border: 'none',
          borderTop: `${height}px ${borderStyles[dividerStyle] || 'solid'} ${color}`,
          width,
          opacity: 0.15,
          margin: '0 auto',
        }} />
      </div>
    </section>
  );
};

export default memo(DividerSection);
