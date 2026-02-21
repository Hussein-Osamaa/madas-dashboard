import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Globe, 
  Users, 
  BarChart3,
  Smartphone,
  Shield,
  Zap,
  LucideIcon
} from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const features = [
  {
    icon: ShoppingCart,
    title: 'Point of Sale',
    description: 'Fast, intuitive POS system with offline support. Process sales in seconds with barcode scanning and multiple payment methods.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Package,
    title: 'Inventory Management',
    description: 'Real-time stock tracking, low stock alerts, and automated reordering. Never run out of your best sellers.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: DollarSign,
    title: 'Finance & Accounting',
    description: 'Complete financial overview with expenses, revenue tracking, tax calculations, and professional reports.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Globe,
    title: 'E-commerce Builder',
    description: 'Launch your online store in minutes. Beautiful templates, secure checkout, and seamless inventory sync.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Users,
    title: 'Staff Management',
    description: 'Role-based access control, performance tracking, and scheduling. Keep your team organized and efficient.',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Actionable insights powered by AI. Understand your business trends and make data-driven decisions.',
    color: 'from-primary-400 to-amber-500',
  },
];

const additionalFeatures = [
  { icon: Smartphone, text: 'Mobile App' },
  { icon: Shield, text: 'Secure & Encrypted' },
  { icon: Zap, text: 'Lightning Fast' },
];

interface FeatureCardProps {
  feature: {
    icon: LucideIcon;
    title: string;
    description: string;
    color: string;
  };
  index: number;
}

const FeatureCard = ({ feature, index }: FeatureCardProps) => {
  const animation = useScrollAnimation({ 
    animationType: 'slideUp', 
    delay: index * 100,
    threshold: 0.1 
  });

  return (
    <div
      ref={animation.ref}
      className={animation.className + " glass-card p-6 group hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-1"}
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-2.5 mb-5 group-hover:scale-110 transition-transform duration-300`}>
        <feature.icon className="w-full h-full text-white" />
      </div>
      
      {/* Content */}
      <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
      <p className="text-gray-400 leading-relaxed">{feature.description}</p>
    </div>
  );
};

interface BadgeItemProps {
  item: {
    icon: LucideIcon;
    text: string;
  };
  index: number;
}

const BadgeItem = ({ item, index }: BadgeItemProps) => {
  const animation = useScrollAnimation({ 
    animationType: 'fadeIn', 
    delay: 300 + index * 100 
  });

  return (
    <div 
      ref={animation.ref}
      className={animation.className + " flex items-center gap-3 text-gray-400"}
    >
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
        <item.icon className="w-5 h-5 text-primary-400" />
      </div>
      <span className="font-medium">{item.text}</span>
    </div>
  );
};

const Features = () => {
  const headerAnimation = useScrollAnimation({ animationType: 'slideUp', delay: 0 });

  return (
    <section id="features" className="section-padding relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900 via-navy-800/50 to-navy-900" />
      
      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div ref={headerAnimation.ref} className={headerAnimation.className + " text-center max-w-3xl mx-auto mb-16"}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Everything You Need to
            <br />
            <span className="gradient-text">Scale Your Business</span>
          </h2>
          <p className="text-lg text-gray-400">
            From your first sale to your millionth, XDIGIX grows with you. Powerful features, beautifully simple interface.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>

        {/* Additional Features Bar */}
        <div className="flex flex-wrap justify-center gap-8">
          {additionalFeatures.map((item, index) => (
            <BadgeItem key={index} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
