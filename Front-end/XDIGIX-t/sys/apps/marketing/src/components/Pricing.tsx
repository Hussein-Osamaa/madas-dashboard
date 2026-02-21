import { Check, Star } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for small businesses just getting started',
    price: '29',
    period: '/month',
    features: [
      'Point of Sale System',
      'Up to 500 Products',
      'Basic Inventory Management',
      '1 Staff Account',
      'Email Support',
      'Basic Reports',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    description: 'For growing businesses that need more power',
    price: '79',
    period: '/month',
    features: [
      'Everything in Starter',
      'Unlimited Products',
      'Advanced Inventory',
      'Up to 10 Staff Accounts',
      'E-commerce Store',
      'Finance & Accounting',
      'Priority Support',
      'Advanced Analytics',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    description: 'For large businesses with custom needs',
    price: '199',
    period: '/month',
    features: [
      'Everything in Professional',
      'Unlimited Staff Accounts',
      'Multiple Locations',
      'Custom Integrations',
      'Dedicated Account Manager',
      'Custom Reports',
      'API Access',
      'SLA Guarantee',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

interface PricingCardProps {
  plan: typeof plans[0];
  index: number;
}

const PricingCard = ({ plan, index }: PricingCardProps) => {
  const animation = useScrollAnimation({ 
    animationType: 'scaleIn', 
    delay: index * 150,
    threshold: 0.1 
  });

  return (
    <div
      ref={animation.ref}
      className={animation.className + ` relative glass-card p-8 ${
        plan.popular
          ? 'border-primary-500/50 bg-gradient-to-b from-primary-500/10 to-transparent'
          : ''
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-primary-400 to-amber-500 rounded-full text-navy-900 text-sm font-semibold">
            <Star className="w-4 h-4 fill-current" />
            Most Popular
          </div>
        </div>
      )}

      {/* Plan Header */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
        <p className="text-gray-400 text-sm mb-6">{plan.description}</p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-white">${plan.price}</span>
          <span className="text-gray-400">{plan.period}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-4 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-primary-400" />
            </div>
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
          plan.popular
            ? 'btn-primary'
            : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
        }`}
      >
        {plan.cta}
      </button>
    </div>
  );
};

const Pricing = () => {
  const headerAnimation = useScrollAnimation({ animationType: 'slideUp', delay: 0 });
  const guaranteeAnimation = useScrollAnimation({ animationType: 'fadeIn', delay: 600 });

  return (
    <section id="pricing" className="section-padding relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900 via-navy-800/30 to-navy-900" />
      
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div ref={headerAnimation.ref} className={headerAnimation.className + " text-center max-w-3xl mx-auto mb-16"}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Simple, Transparent
            <br />
            <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-lg text-gray-400">
            No hidden fees. No surprises. Start free and upgrade when you're ready.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard key={index} plan={plan} index={index} />
          ))}
        </div>

        {/* Money Back Guarantee */}
        <div ref={guaranteeAnimation.ref} className={guaranteeAnimation.className + " text-center mt-12"}>
          <p className="text-gray-500">
            <span className="text-primary-400 font-medium">14-day free trial</span> on all plans. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
