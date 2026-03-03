import Link from 'next/link';
import AnimatedBackground from '@/components/AnimatedBackground';

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Navigation */}
      <nav className="glass-nav fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl sm:text-2xl font-bold gradient-text glow-text">
                Next Gen Coders
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/" className="text-white hover:text-cyan-400 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors">
                Home
              </Link>
              <Link href="/plans" className="text-gray-300 hover:text-cyan-400 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors">
                Plans
              </Link>
              <Link href="#contact" className="text-gray-300 hover:text-cyan-400 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-24 sm:pt-32 pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="glass-card max-w-4xl mx-auto mb-8 sm:mb-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 gradient-text glow-text">
                Build Your Digital Empire
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed">
                Next Gen Coders provides cutting-edge web development tools and business solutions 
                to help you create, manage, and scale your online presence in the digital future.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
                <Link 
                  href="/plans"
                  className="glass-button inline-flex items-center justify-center text-sm sm:text-base"
                >
                  Get Started
                  <svg className="ml-2 h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link 
                  href="#features"
                  className="glass-button-secondary inline-flex items-center justify-center text-sm sm:text-base"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-16 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="glass-card max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 gradient-text glow-text">
                Everything You Need to Succeed
              </h2>
              <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                Our comprehensive platform provides all the tools you need to build, manage, and grow your business in the digital future.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="glass-card text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 gradient-text">Web Builder</h3>
              <p className="text-gray-300 leading-relaxed">
                Create stunning websites with our AI-powered drag-and-drop builder. No coding required, just pure creativity.
              </p>
            </div>
            
            <div className="glass-card text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 gradient-text">Analytics Dashboard</h3>
              <p className="text-gray-300 leading-relaxed">
                Track your business performance with real-time analytics and AI-powered insights for data-driven decisions.
              </p>
            </div>
            
            <div className="glass-card text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 gradient-text">Lightning Fast</h3>
              <p className="text-gray-300 leading-relaxed">
                Built for the future with edge computing and quantum-ready infrastructure. Your websites will load in milliseconds.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text glow-text">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of businesses already using Next Gen Coders to build their digital presence in the future.
            </p>
            <Link 
              href="/plans"
              className="glass-button inline-flex items-center justify-center"
            >
              Choose Your Plan
              <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer id="contact" className="py-12 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-3xl font-bold mb-6 gradient-text glow-text">Next Gen Coders</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Empowering businesses to build their digital future with cutting-edge 
                  web development tools and comprehensive business solutions powered by AI and quantum computing.
                </p>
              </div>
              
              <div>
                <h4 className="text-xl font-semibold mb-6 text-white">Product</h4>
                <ul className="space-y-3">
                  <li><a href="/plans" className="text-gray-300 hover:text-cyan-400 transition-colors">Plans</a></li>
                  <li><a href="#features" className="text-gray-300 hover:text-cyan-400 transition-colors">Features</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors">Pricing</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-xl font-semibold mb-6 text-white">Support</h4>
                <ul className="space-y-3">
                  <li><a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors">Help Center</a></li>
                  <li><a href="#contact" className="text-gray-300 hover:text-cyan-400 transition-colors">Contact Us</a></li>
                  <li><a href="#" className="text-gray-300 hover:text-cyan-400 transition-colors">Documentation</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-600 mt-8 pt-8 text-center">
              <p className="text-gray-400">
                © 2024 Next Gen Coders. All rights reserved. Built for the future.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}