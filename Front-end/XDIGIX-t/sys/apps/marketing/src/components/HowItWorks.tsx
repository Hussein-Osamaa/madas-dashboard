import { UserPlus, Settings, Rocket, TrendingUp, LucideIcon } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Create Your Account',
    description: 'Sign up in seconds with just your email. No credit card required to start your free trial.',
  },
  {
    icon: Settings,
    number: '02',
    title: 'Set Up Your Business',
    description: 'Add your products, customize your store, and configure your preferences with our guided setup.',
  },
  {
    icon: Rocket,
    number: '03',
    title: 'Go Live',
    description: 'Start selling immediately with your POS or launch your online store. We handle the technical stuff.',
  },
  {
    icon: TrendingUp,
    number: '04',
    title: 'Grow & Scale',
    description: 'Use powerful analytics and automation to grow your business. We scale with you.',
  },
];

interface StepCardProps {
  step: {
    icon: LucideIcon;
    number: string;
    title: string;
    description: string;
  };
  index: number;
  isLast: boolean;
}

const StepCard = ({ step, index, isLast }: StepCardProps) => {
  const animation = useScrollAnimation({ 
    animationType: 'slideUp', 
    delay: index * 150,
    threshold: 0.1 
  });

  return (
    <div ref={animation.ref} className={animation.className + " relative"}>
      {/* Connector Line */}
      {!isLast && (
        <div className="hidden lg:block absolute top-16 left-[60%] w-full h-[2px] bg-gradient-to-r from-primary-500/50 to-transparent" />
      )}
      
      <div className="glass-card p-6 h-full relative group hover:bg-white/[0.05] transition-all duration-300">
        {/* Number Badge */}
        <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-amber-500 flex items-center justify-center text-navy-900 font-bold text-sm">
          {step.number}
        </div>
        
        {/* Icon */}
        <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-5 group-hover:bg-primary-500/20 transition-colors duration-300">
          <step.icon className="w-7 h-7 text-primary-400" />
        </div>
        
        {/* Content */}
        <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
        <p className="text-gray-400">{step.description}</p>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const headerAnimation = useScrollAnimation({ animationType: 'slideUp', delay: 0 });
  const ctaAnimation = useScrollAnimation({ animationType: 'fadeIn', delay: 600 });

  return (
    <section id="how-it-works" className="section-padding relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="gradient-orb w-[400px] h-[400px] bg-purple-500/10 top-[20%] left-[-10%]" />
        <div className="gradient-orb w-[300px] h-[300px] bg-primary-500/10 bottom-[10%] right-[-5%]" style={{ animationDelay: '3s' }} />
      </div>

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div ref={headerAnimation.ref} className={headerAnimation.className + " text-center max-w-3xl mx-auto mb-16"}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Up and Running in
            <br />
            <span className="gradient-text">Minutes, Not Days</span>
          </h2>
          <p className="text-lg text-gray-400">
            Getting started with XDIGIX is simple. Follow these four easy steps and transform how you run your business.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <StepCard 
              key={index} 
              step={step} 
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* CTA */}
        <div ref={ctaAnimation.ref} className={ctaAnimation.className + " text-center mt-16"}>
          <a href="#pricing" className="btn-primary text-lg px-8 py-4">
            Start Your Free Trial
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
