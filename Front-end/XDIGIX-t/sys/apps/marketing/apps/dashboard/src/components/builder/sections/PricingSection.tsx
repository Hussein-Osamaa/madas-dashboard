import { PricingSectionData } from '../../../types/builder';

type Props = {
  data: PricingSectionData;
  style?: React.CSSProperties;
};

const PricingSection = ({ data, style }: Props) => {
  const { 
    title = 'Pricing Plans', 
    subtitle = 'Choose the perfect plan for you', 
    plans = [],
    currency = '$',
    billingPeriod = '/month'
  } = data;

  return (
    <section 
      className="w-full py-12 sm:py-16 px-4 sm:px-6 bg-gray-50 transition-all duration-300"
      style={style}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">{title}</h2>
          {subtitle && <p className="text-base sm:text-lg text-madas-text/70 px-2">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {plans.length === 0 ? (
            <>
              {['Basic', 'Pro', 'Enterprise'].map((planName, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-shadow">
                  <h3 className="text-2xl font-bold text-primary mb-2">{planName}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-primary">{currency}{(i + 1) * 29}</span>
                    <span className="text-madas-text/60">{billingPeriod}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {[1, 2, 3, 4].map((j) => (
                      <li key={j} className="flex items-center gap-2">
                        <span className="material-icons text-green-600 text-sm">check_circle</span>
                        <span className="text-madas-text/70">Feature {j}</span>
                      </li>
                    ))}
                  </ul>
                  <button className="w-full py-3 bg-primary text-white rounded-lg hover:bg-[#1f3c19] transition-colors">
                    Get Started
                  </button>
                </div>
              ))}
            </>
          ) : (
            plans.map((plan, index) => (
              <div 
                key={index} 
                className={`relative bg-white rounded-xl p-6 sm:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group ${
                  plan.highlighted 
                    ? 'border-2 border-primary ring-4 ring-primary/10 scale-105' 
                    : 'border border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl sm:text-2xl font-bold text-primary mb-2 group-hover:text-primary/80 transition-colors">{plan.name}</h3>
                <div className="mb-4 sm:mb-6">
                  <span className="text-3xl sm:text-4xl font-bold text-primary">{currency}{plan.price}</span>
                  <span className="text-sm sm:text-base text-madas-text/60">{billingPeriod}</span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="material-icons text-green-600 text-sm flex-shrink-0 mt-0.5">check_circle</span>
                      <span className="text-xs sm:text-sm text-madas-text/70">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all ${
                  plan.highlighted 
                    ? 'bg-primary text-white hover:bg-[#1f3c19]' 
                    : 'bg-gray-100 text-primary hover:bg-gray-200'
                }`}>
                  {plan.buttonText || 'Get Started'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

