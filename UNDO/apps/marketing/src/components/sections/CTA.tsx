import { Button } from '@shared/shared'
import { ArrowRight, Zap } from 'lucide-react'
import Link from 'next/link'

export function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-700">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Zap className="w-8 h-8 text-white" />
        </div>

        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to build your
          <br />
          dream website?
        </h2>

        {/* Subheadline */}
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Join thousands of creators who are already building amazing websites with Madas. 
          Start your free trial today.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <Link href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL}/register`}>
            <Button size="lg" className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-100">
              Start Building Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-white text-white hover:bg-white/10">
              View Pricing
            </Button>
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-blue-100">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span>No credit card required</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span>14-day free trial</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  )
}
