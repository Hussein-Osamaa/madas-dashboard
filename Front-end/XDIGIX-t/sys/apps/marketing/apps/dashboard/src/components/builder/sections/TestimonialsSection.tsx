import { TestimonialsSectionData } from '../../../types/builder';

type Props = {
  data: TestimonialsSectionData;
  style?: React.CSSProperties;
};

const TestimonialsSection = ({ data, style }: Props) => {
  const { title = 'What Our Customers Say', items = [] } = data;

  return (
    <section 
      className="w-full py-12 sm:py-16 px-4 sm:px-6 bg-white transition-all duration-300"
      style={style}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">{title}</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {items.length === 0 ? (
            <>
              {[1, 2].map((i) => (
                <div key={i} className="p-6 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-yellow-400">⭐</span>
                    ))}
                  </div>
                  <p className="text-madas-text/80 mb-4 italic">&quot;Great service and amazing products!&quot;</p>
                  <div>
                    <p className="font-semibold text-primary">John Doe</p>
                    <p className="text-sm text-madas-text/60">Customer</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            items.map((item, index) => (
              <div key={index} className="p-4 sm:p-6 rounded-xl border border-gray-200 bg-gray-50">
                <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl sm:text-2xl text-primary">{item.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: item.rating || 5 }).map((_, i) => (
                        <span key={i} className="text-yellow-400 text-sm sm:text-base">⭐</span>
                      ))}
                    </div>
                    <div 
                      className="text-sm sm:text-base text-madas-text/80 mb-2 sm:mb-3 italic"
                      dangerouslySetInnerHTML={{ __html: `"${item.text || 'Great service and amazing products!'}"` }}
                    />
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-primary">{item.name}</p>
                      <p className="text-xs sm:text-sm text-madas-text/60">{item.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

