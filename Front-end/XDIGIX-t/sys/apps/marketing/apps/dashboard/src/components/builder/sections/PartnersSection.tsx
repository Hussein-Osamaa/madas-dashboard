import { PartnersSectionData } from '../../../types/builder';

type Props = {
  data: PartnersSectionData;
  style?: React.CSSProperties;
};

const PartnersSection = ({ data, style }: Props) => {
  const {
    title = 'Trusted By',
    subtitle,
    partners = [],
    grayscale = true,
    autoScroll = false
  } = data;

  const defaultPartners: Array<{ name: string; logo: string; link?: string }> = [
    { name: 'Company 1', logo: '' },
    { name: 'Company 2', logo: '' },
    { name: 'Company 3', logo: '' },
    { name: 'Company 4', logo: '' },
    { name: 'Company 5', logo: '' },
    { name: 'Company 6', logo: '' }
  ];

  const displayPartners = partners.length > 0 ? partners : defaultPartners;

  const PartnerLogo = ({ partner, index }: { partner: { name: string; logo: string; link?: string }; index: number }) => (
    <div
      className={`flex items-center justify-center p-4 sm:p-6 ${
        grayscale ? 'grayscale hover:grayscale-0' : ''
      } opacity-60 hover:opacity-100 transition-all duration-300`}
    >
      {partner.logo ? (
        <a
          href={partner.link || '#'}
          target={partner.link ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={partner.logo}
            alt={partner.name}
            className="h-8 sm:h-10 md:h-12 w-auto object-contain"
          />
        </a>
      ) : (
        <div className="h-10 sm:h-12 px-4 sm:px-6 bg-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-gray-500 font-semibold text-sm sm:text-base">
            {partner.name || `Partner ${index + 1}`}
          </span>
        </div>
      )}
    </div>
  );

  if (autoScroll) {
    return (
      <section
        className="w-full py-10 sm:py-14 px-4 sm:px-6 bg-white transition-all duration-300 overflow-hidden"
        style={style}
      >
        <div className="max-w-6xl mx-auto">
          {(title || subtitle) && (
            <div className="text-center mb-8 sm:mb-10">
              {title && (
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm sm:text-base text-madas-text/70">{subtitle}</p>
              )}
            </div>
          )}

          <div className="relative">
            <div className="flex animate-scroll">
              {/* First set */}
              {displayPartners.map((partner, index) => (
                <div key={`first-${index}`} className="flex-shrink-0 mx-4 sm:mx-8">
                  <PartnerLogo partner={partner} index={index} />
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {displayPartners.map((partner, index) => (
                <div key={`second-${index}`} className="flex-shrink-0 mx-4 sm:mx-8">
                  <PartnerLogo partner={partner} index={index} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-scroll {
            animation: scroll 30s linear infinite;
          }
          .animate-scroll:hover {
            animation-play-state: paused;
          }
        `}</style>
      </section>
    );
  }

  return (
    <section
      className="w-full py-10 sm:py-14 px-4 sm:px-6 bg-white transition-all duration-300"
      style={style}
    >
      <div className="max-w-6xl mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-8 sm:mb-10">
            {title && (
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm sm:text-base text-madas-text/70">{subtitle}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 items-center">
          {displayPartners.map((partner, index) => (
            <PartnerLogo key={index} partner={partner} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;

