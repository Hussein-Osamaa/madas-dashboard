import { FeaturesSectionData } from '../../../types/builder';

type Props = {
  data: FeaturesSectionData;
  style?: React.CSSProperties;
};

const FeaturesSection = ({ data, style }: Props) => {
  const { title = 'Our Features', subtitle = 'What makes us special', items = [] } = data;

  return (
    <section 
      className="w-full py-12 sm:py-16 px-4 sm:px-6 bg-white transition-all duration-300"
      style={style}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">{title}</h2>
          {subtitle && <p className="text-base sm:text-lg text-madas-text/70 px-2">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {items.length === 0 ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center p-6 rounded-xl border border-gray-200">
                  <div className="text-4xl mb-4">⭐</div>
                  <h3 className="text-xl font-semibold text-primary mb-2">Feature {i}</h3>
                  <p className="text-madas-text/70">Description here</p>
                </div>
              ))}
            </>
          ) : (
            items.map((item, index) => (
              <div key={index} className="text-center p-4 sm:p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{item.icon}</div>
                <h3 className="text-lg sm:text-xl font-semibold text-primary mb-2">{item.title}</h3>
                <div 
                  className="text-sm sm:text-base text-madas-text/70"
                  dangerouslySetInnerHTML={{ __html: item.description || 'Description here' }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

