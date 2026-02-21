import { useState } from 'react';
import { NewsletterSectionData } from '../../../types/builder';

type Props = {
  data: NewsletterSectionData;
  style?: React.CSSProperties;
};

const NewsletterSection = ({ data, style }: Props) => {
  const {
    title = 'Stay Updated',
    subtitle = 'Subscribe to our newsletter for the latest updates and exclusive offers',
    placeholder = 'Enter your email address',
    buttonText = 'Subscribe',
    backgroundColor = '#f9fafb',
    successMessage = 'Thank you for subscribing!'
  } = data;

  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setEmail('');
    }
  };

  return (
    <section
      className="w-full py-12 sm:py-16 md:py-20 px-4 sm:px-6 transition-all duration-300"
      style={{ backgroundColor, ...style }}
    >
      <div className="max-w-3xl mx-auto text-center">
        {/* Decorative icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-6 rounded-2xl bg-primary/10">
          <span className="material-icons text-primary text-2xl sm:text-3xl">mail</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-3 sm:mb-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-base sm:text-lg text-madas-text/70 mb-8 sm:mb-10 px-2">
            {subtitle}
          </p>
        )}

        {isSubscribed ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <span className="material-icons text-green-600 text-3xl">check</span>
            </div>
            <p className="text-lg font-semibold text-green-600">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-xl mx-auto">
            <div className="relative flex-1">
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholder}
                required
                className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm sm:text-base transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-primary text-white rounded-xl font-semibold hover:bg-[#1f3c19] transition-all hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              {buttonText}
            </button>
          </form>
        )}

        {/* Privacy note */}
        <p className="mt-6 text-xs sm:text-sm text-madas-text/50">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </section>
  );
};

export default NewsletterSection;

