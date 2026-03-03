import { 
  Palette, 
  Zap, 
  Smartphone, 
  Globe, 
  BarChart3, 
  Shield,
  Code,
  Rocket
} from 'lucide-react'

const features = [
  {
    icon: Palette,
    title: 'Drag & Drop Builder',
    description: 'Build your website visually with our intuitive drag-and-drop interface. No coding required.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Optimized for speed with global CDN and automatic image optimization.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Responsive',
    description: 'All websites are automatically optimized for mobile, tablet, and desktop devices.',
  },
  {
    icon: Globe,
    title: 'Custom Domains',
    description: 'Connect your own domain name and create a professional online presence.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Built-in',
    description: 'Track your website performance with integrated analytics and insights.',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with SSL certificates and 99.9% uptime guarantee.',
  },
  {
    icon: Code,
    title: 'Custom Code',
    description: 'Add custom HTML, CSS, and JavaScript to extend your website functionality.',
  },
  {
    icon: Rocket,
    title: 'One-Click Publish',
    description: 'Publish your website instantly with our one-click deployment system.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to build
            <br />
            <span className="gradient-text">amazing websites</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Powerful features designed to help you create professional websites 
            without any technical knowledge.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-6">
            Ready to start building your website?
          </p>
          <a
            href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL}/register`}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            Get Started Free
          </a>
        </div>
      </div>
    </section>
  )
}
