import { Star, Quote } from 'lucide-react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const testimonials = [
  {
    name: 'Sarah Al-Rashid',
    role: 'Owner, Bloom Boutique',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    content: 'XDIGIX transformed how we run our boutique. The POS is lightning fast, and the inventory sync with our online store saved us countless hours. Revenue is up 40% since we switched!',
    rating: 5,
  },
  {
    name: 'Ahmed Hassan',
    role: 'CEO, TechMart Electronics',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    content: 'We manage 3 locations with XDIGIX. The real-time analytics and multi-store support is incredible. Our team loves how intuitive everything is.',
    rating: 5,
  },
  {
    name: 'Fatima Noor',
    role: 'Manager, Spice & Soul Restaurant',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    content: 'The best investment we made for our restaurant. The finance module alone saved us from hiring an accountant. Support team is fantastic too!',
    rating: 5,
  },
];

const stats = [
  { value: '500+', label: 'Businesses' },
  { value: '2M+', label: 'Transactions' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9/5', label: 'Rating' },
];

interface TestimonialCardProps {
  testimonial: typeof testimonials[0];
  index: number;
}

const TestimonialCard = ({ testimonial, index }: TestimonialCardProps) => {
  const animation = useScrollAnimation({ 
    animationType: 'slideUp', 
    delay: index * 150,
    threshold: 0.1 
  });

  return (
    <div ref={animation.ref} className={animation.className + " glass-card p-6 relative"}>
      {/* Quote Icon */}
      <Quote className="absolute top-4 right-4 w-8 h-8 text-primary-500/20" />
      
      {/* Stars */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 text-primary-400 fill-current" />
        ))}
      </div>
      
      {/* Content */}
      <p className="text-gray-300 mb-6 leading-relaxed">"{testimonial.content}"</p>
      
      {/* Author */}
      <div className="flex items-center gap-3">
        <img
          src={testimonial.image}
          alt={testimonial.name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold text-white">{testimonial.name}</p>
          <p className="text-sm text-gray-400">{testimonial.role}</p>
        </div>
      </div>
    </div>
  );
};

interface StatItemProps {
  stat: typeof stats[0];
  index: number;
}

const StatItem = ({ stat, index }: StatItemProps) => {
  const animation = useScrollAnimation({ 
    animationType: 'fadeIn', 
    delay: 450 + index * 100 
  });

  return (
    <div ref={animation.ref} className={animation.className + " text-center"}>
      <p className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</p>
      <p className="text-gray-400">{stat.label}</p>
    </div>
  );
};

const Testimonials = () => {
  const headerAnimation = useScrollAnimation({ animationType: 'slideUp', delay: 0 });
  const statsAnimation = useScrollAnimation({ animationType: 'fadeIn', delay: 500 });

  return (
    <section id="testimonials" className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="gradient-orb w-[500px] h-[500px] bg-primary-500/10 top-[10%] right-[-10%]" />
      </div>

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div ref={headerAnimation.ref} className={headerAnimation.className + " text-center max-w-3xl mx-auto mb-16"}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Loved by Businesses
            <br />
            <span className="gradient-text">Everywhere</span>
          </h2>
          <p className="text-lg text-gray-400">
            Don't just take our word for it. Here's what our customers have to say.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>

        {/* Stats */}
        <div ref={statsAnimation.ref} className={statsAnimation.className + " glass-card p-8"}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <StatItem key={index} stat={stat} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
