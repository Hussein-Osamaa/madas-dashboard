'use client'

import { Button } from '@shared/shared'
import { ArrowRight, Play, Star } from 'lucide-react'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 hero-pattern"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
      
      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-8">
            <Star className="w-4 h-4 mr-2 fill-current" />
            Trusted by 10,000+ creators
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
            Build Beautiful
            <br />
            <span className="gradient-text">Websites</span>
            <br />
            Without Coding
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create stunning websites with our drag-and-drop builder. 
            No technical skills required. Launch your site in minutes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL}/register`}>
              <Button size="lg" className="text-lg px-8 py-4">
                Start Building Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4">
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">10K+</div>
              <div className="text-gray-600">Websites Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">50+</div>
              <div className="text-gray-600">Templates</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>

        {/* Hero Image/Demo */}
        <div className="mt-16 relative">
          <div className="relative mx-auto max-w-5xl">
            <div className="glass-effect rounded-2xl p-8 shadow-2xl">
              <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-600">Website Builder Demo</p>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-purple-500 rounded-full animate-bounce delay-1000"></div>
          </div>
        </div>
      </div>
    </section>
  )
}
