import { ArrowRight, Play, Sparkles, ShieldCheck, Zap } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="gradient-orb w-[600px] h-[600px] bg-primary-500/20 top-[-10%] left-[-10%]" />
        <div className="gradient-orb w-[500px] h-[500px] bg-purple-500/15 bottom-[-10%] right-[-5%]" style={{ animationDelay: '2s' }} />
        <div className="gradient-orb w-[400px] h-[400px] bg-blue-500/10 top-[40%] right-[20%]" style={{ animationDelay: '4s' }} />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
      </div>

      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-primary-400 font-medium">New: AI-Powered Analytics Dashboard</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-slide-up">
            Run Your Entire Business
            <br />
            <span className="gradient-text">From One Platform</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            POS, Inventory, Finance, E-commerce, Staff Management — everything you need to grow your business, beautifully integrated and incredibly powerful.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <a href="#pricing" className="btn-primary text-lg px-8 py-4">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </a>
            <button className="btn-secondary text-lg px-8 py-4 group">
              <Play className="w-5 h-5 text-primary-400 group-hover:scale-110 transition-transform" />
              Watch Demo
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span>Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-400" />
              <span>Setup in 5 Minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary-400 font-semibold">500+</span>
              <span>Businesses Trust Us</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-20 relative animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent z-10 pointer-events-none" />
          <div className="glass-card p-2 mx-auto max-w-5xl">
            <div className="bg-navy-800 rounded-xl overflow-hidden">
              {/* Browser Mockup Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-navy-700/50 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-navy-600/50 rounded-md text-xs text-gray-500">
                    app.xdigix.com
                  </div>
                </div>
              </div>
              
              {/* Dashboard Content Preview */}
              <div className="p-6 bg-gradient-to-br from-navy-800 to-navy-900">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Revenue', value: '$124,500', change: '+12.5%', color: 'text-green-400' },
                    { label: 'Orders Today', value: '156', change: '+8.2%', color: 'text-green-400' },
                    { label: 'Products', value: '2,847', change: '+24', color: 'text-blue-400' },
                    { label: 'Customers', value: '1,429', change: '+18.3%', color: 'text-green-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                      <p className="text-xl font-bold text-white">{stat.value}</p>
                      <p className={`text-xs ${stat.color}`}>{stat.change}</p>
                    </div>
                  ))}
                </div>
                
                {/* Chart Placeholder */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/5 h-48 flex items-end justify-between gap-2">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-sm opacity-80"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

