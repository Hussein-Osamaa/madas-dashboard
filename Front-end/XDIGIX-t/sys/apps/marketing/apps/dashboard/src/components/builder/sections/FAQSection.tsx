import { useState } from 'react';
import { FAQSectionData } from '../../../types/builder';

type Props = {
  data: FAQSectionData;
  style?: React.CSSProperties;
};

const FAQSection = ({ data, style }: Props) => {
  const { title = 'Frequently Asked Questions', items = [] } = data;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section 
      className="w-full py-12 sm:py-16 px-4 sm:px-6 bg-white transition-all duration-300"
      style={style}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">{title}</h2>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {items.length === 0 ? (
            <>
              {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full p-4 sm:p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm sm:text-base font-semibold text-primary pr-4">Question {i}?</span>
                  <span className="material-icons text-primary flex-shrink-0">
                    {openIndex === i ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {openIndex === i && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-sm sm:text-base text-madas-text/70">
                    <p>Answer to question {i} goes here...</p>
                  </div>
                )}
              </div>
              ))}
            </>
          ) : (
            items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full p-4 sm:p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm sm:text-base font-semibold text-primary pr-4">{item.question}</span>
                  <span className="material-icons text-primary flex-shrink-0">
                    {openIndex === index ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {openIndex === index && (
                  <div 
                    className="px-4 sm:px-6 pb-4 sm:pb-6 text-sm sm:text-base text-madas-text/70"
                    dangerouslySetInnerHTML={{ __html: item.answer }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

