import { ServicesSectionData } from '../../../types/builder';

type Props = {
  data: ServicesSectionData;
  style?: React.CSSProperties;
};

const ServicesSection = ({ data, style }: Props) => {
  const {
    title = 'Our Services',
    subtitle = 'What we offer',
    services = [],
    layout = 'grid'
  } = data;

  const defaultServices: Array<{ icon: string; title: string; description: string; price?: string; link?: string }> = [
    { icon: '🚀', title: 'Fast Delivery', description: 'Get your products delivered within 24-48 hours', price: 'Free' },
    { icon: '🛡️', title: 'Secure Payment', description: 'Multiple secure payment options available', price: '' },
    { icon: '🔄', title: 'Easy Returns', description: '30-day hassle-free return policy', price: '' },
    { icon: '💬', title: '24/7 Support', description: 'Round the clock customer support', price: '' },
    { icon: '🎁', title: 'Gift Wrapping', description: 'Beautiful gift wrapping service', price: '$5' },
    { icon: '📦', title: 'Track Orders', description: 'Real-time order tracking', price: 'Free' }
  ];

  const displayServices = services.length > 0 ? services : defaultServices;

  if (layout === 'list') {
    return (
      <section
        className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gray-50 transition-all duration-300"
        style={style}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">
              {title}
            </h2>
            {subtitle && (
              <p className="text-base sm:text-lg text-madas-text/70 px-2">{subtitle}</p>
            )}
          </div>

          <div className="space-y-4">
            {displayServices.map((service, index) => (
              <div
                key={index}
                className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg hover:border-primary/30 transition-all group"
              >
                <div className="text-3xl sm:text-4xl flex-shrink-0 group-hover:scale-110 transition-transform">
                  {service.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-primary group-hover:text-primary/80 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-sm text-madas-text/70 mt-1">{service.description}</p>
                </div>
                {service.price && (
                  <div className="text-lg font-bold text-accent flex-shrink-0">
                    {service.price}
                  </div>
                )}
                {service.link && (
                  <a
                    href={service.link}
                    className="flex-shrink-0 text-primary hover:text-accent transition-colors"
                  >
                    <span className="material-icons">arrow_forward</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'cards') {
    return (
      <section
        className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gray-50 transition-all duration-300"
        style={style}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">
              {title}
            </h2>
            {subtitle && (
              <p className="text-base sm:text-lg text-madas-text/70 px-2">{subtitle}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {displayServices.map((service, index) => (
              <div
                key={index}
                className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
                <div className="p-6 sm:p-8">
                  <div className="text-4xl sm:text-5xl mb-4 group-hover:scale-110 transition-transform inline-block">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-primary/80 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-madas-text/70 mb-4">{service.description}</p>
                  {service.price && (
                    <div className="text-2xl font-bold text-accent">{service.price}</div>
                  )}
                  {service.link && (
                    <a
                      href={service.link}
                      className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:text-accent transition-colors"
                    >
                      Learn More
                      <span className="material-icons text-base">arrow_forward</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default grid layout
  return (
    <section
      className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gray-50 transition-all duration-300"
      style={style}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-base sm:text-lg text-madas-text/70 px-2">{subtitle}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {displayServices.map((service, index) => (
            <div
              key={index}
              className="text-center p-6 sm:p-8 bg-white rounded-2xl border border-gray-200 hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="text-3xl sm:text-4xl">{service.icon}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-primary mb-3 group-hover:text-primary/80 transition-colors">
                {service.title}
              </h3>
              <p className="text-sm sm:text-base text-madas-text/70 mb-4">{service.description}</p>
              {service.price && (
                <div className="text-xl font-bold text-accent">{service.price}</div>
              )}
              {service.link && (
                <a
                  href={service.link}
                  className="inline-flex items-center gap-1 mt-2 text-primary text-sm font-medium hover:text-accent transition-colors"
                >
                  Learn More
                  <span className="material-icons text-sm">arrow_forward</span>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;

