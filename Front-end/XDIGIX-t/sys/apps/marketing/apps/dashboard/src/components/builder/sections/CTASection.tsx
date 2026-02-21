import { CTASectionData } from '../../../types/builder';

type Props = {
  data: CTASectionData;
  style?: React.CSSProperties;
};

const CTASection = ({ data, style }: Props) => {
  const {
    title = 'Ready to Get Started?',
    subtitle = 'Join thousands of satisfied customers',
    buttonText = 'Get Started',
    buttonLink = '#',
    backgroundColor = '#27491F',
    buttonBackgroundColor = '#ffffff',
    buttonTextColor
  } = data;

  // Default button text color to background color if not specified
  const resolvedButtonTextColor = buttonTextColor || backgroundColor;

  return (
    <section
      className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 text-center transition-all duration-300"
      style={{ backgroundColor, ...style }}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 leading-tight">{title}</h2>
        {subtitle && <p className="text-base sm:text-lg text-white/90 mb-6 sm:mb-8 px-2">{subtitle}</p>}
        <a
          href={buttonLink}
          className="inline-block px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-semibold transition-opacity hover:opacity-90 shadow-lg text-sm sm:text-base"
          style={{ 
            backgroundColor: buttonBackgroundColor,
            color: resolvedButtonTextColor
          }}
        >
          {buttonText}
        </a>
      </div>
    </section>
  );
};

export default CTASection;

