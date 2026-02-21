import { DividerSectionData } from '../../../types/builder';

type Props = {
  data: DividerSectionData;
  style?: React.CSSProperties;
};

const DividerSection = ({ data, style }: Props) => {
  const {
    style: dividerStyle = 'line',
    color = '#e5e7eb',
    height = 1,
    width = '100%',
    spacing = 40
  } = data;

  const getDividerElement = () => {
    switch (dividerStyle) {
      case 'dotted':
        return (
          <div
            className="mx-auto"
            style={{
              width,
              borderTop: `${height}px dotted ${color}`
            }}
          />
        );
      
      case 'dashed':
        return (
          <div
            className="mx-auto"
            style={{
              width,
              borderTop: `${height}px dashed ${color}`
            }}
          />
        );
      
      case 'gradient':
        return (
          <div
            className="mx-auto rounded-full"
            style={{
              width,
              height: `${height}px`,
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`
            }}
          />
        );
      
      case 'wave':
        return (
          <svg
            viewBox="0 0 1200 40"
            className="w-full mx-auto"
            style={{ height: `${Math.max(height * 20, 20)}px`, maxWidth: width }}
            preserveAspectRatio="none"
          >
            <path
              d="M0,20 C200,40 400,0 600,20 C800,40 1000,0 1200,20"
              fill="none"
              stroke={color}
              strokeWidth={height}
            />
          </svg>
        );
      
      case 'zigzag':
        return (
          <svg
            viewBox="0 0 1200 40"
            className="w-full mx-auto"
            style={{ height: `${Math.max(height * 20, 20)}px`, maxWidth: width }}
            preserveAspectRatio="none"
          >
            <path
              d="M0,20 L60,5 L120,20 L180,5 L240,20 L300,5 L360,20 L420,5 L480,20 L540,5 L600,20 L660,5 L720,20 L780,5 L840,20 L900,5 L960,20 L1020,5 L1080,20 L1140,5 L1200,20"
              fill="none"
              stroke={color}
              strokeWidth={height}
            />
          </svg>
        );
      
      case 'line':
      default:
        return (
          <div
            className="mx-auto"
            style={{
              width,
              height: `${height}px`,
              backgroundColor: color
            }}
          />
        );
    }
  };

  return (
    <section
      className="w-full px-4 sm:px-6 transition-all duration-300"
      style={{
        paddingTop: `${spacing}px`,
        paddingBottom: `${spacing}px`,
        ...style
      }}
    >
      <div className="max-w-6xl mx-auto">
        {getDividerElement()}
      </div>
    </section>
  );
};

export default DividerSection;

