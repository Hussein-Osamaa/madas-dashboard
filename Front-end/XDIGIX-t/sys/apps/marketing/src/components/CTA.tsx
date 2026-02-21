import { ArrowRight, Sparkles } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const CTA = () => {
  const badgeAnimation = useScrollAnimation({ animationType: 'fadeIn', delay: 0 });
  const headerAnimation = useScrollAnimation({ animationType: 'slideUp', delay: 100 });
  const textAnimation = useScrollAnimation({ animationType: 'fadeIn', delay: 200 });
  const buttonsAnimation = useScrollAnimation({ animationType: 'slideUp', delay: 300 });
  const trustAnimation = useScrollAnimation({ animationType: 'fadeIn', delay: 400 });

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-navy-800 to-purple-500/10" />
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary-500/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[100px]" />

      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div ref={badgeAnimation.ref} className={badgeAnimation.className + " inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8"}>
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-gray-300">Limited Time: 30% Off First 3 Months</span>
          </div>

          {/* Headline */}
          <div ref={headerAnimation.ref} className={headerAnimation.className}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Ready to Transform
              <br />
              <span className="gradient-text">Your Business?</span>
            </h2>
          </div>

          {/* Subheadline */}
          <div ref={textAnimation.ref} className={textAnimation.className}>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Join 500+ businesses already using XDIGIX to streamline operations, boost sales, and grow faster than ever.
            </p>
          </div>

          {/* CTA Buttons */}
          <div ref={buttonsAnimation.ref} className={buttonsAnimation.className + " flex flex-col sm:flex-row items-center justify-center gap-4"}>
            <a href="#pricing" className="btn-primary text-lg px-8 py-4">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </a>
            <a 
              href="/dashboard/login" 
              className="btn-secondary text-lg px-8 py-4"
            >
              Sign In
            </a>
          </div>

          {/* Trust Note */}
          <div ref={trustAnimation.ref} className={trustAnimation.className}>
            <p className="mt-8 text-sm text-gray-500">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
