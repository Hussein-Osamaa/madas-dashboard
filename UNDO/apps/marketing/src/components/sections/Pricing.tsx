'use client'

import { Button } from '@shared/shared'
import { Check, Star } from 'lucide-react'
import { SUBSCRIPTION_PLANS } from '@shared/shared'
import Link from 'next/link'

export function Pricing() {
  const plans = Object.values(SUBSCRIPTION_PLANS)

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent
            <br />
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your needs. Start free and upgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`relative p-8 rounded-2xl ${
                plan.id === 'pro'
                  ? 'bg-white border-2 border-blue-500 shadow-xl scale-105'
                  : 'bg-white border border-gray-200 shadow-lg'
              }`}
            >
              {/* Popular Badge */}
              {plan.id === 'pro' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600">/{plan.interval}</span>
                </div>
                <p className="text-gray-600">
                  {plan.id === 'free' && 'Perfect for getting started'}
                  {plan.id === 'pro' && 'Great for growing businesses'}
                  {plan.id === 'business' && 'For teams and agencies'}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                href={`${process.env.NEXT_PUBLIC_DASHBOARD_URL}/register?plan=${plan.id}`}
                className="block w-full"
              >
                <Button
                  variant={plan.id === 'pro' ? 'default' : 'outline'}
                  size="lg"
                  className="w-full"
                >
                  {plan.id === 'free' ? 'Get Started Free' : 'Start Free Trial'}
                </Button>
              </Link>

              {/* Additional Info */}
              {plan.id !== 'free' && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  14-day free trial • Cancel anytime
                </p>
              )}
            </div>
          ))}
        </div>

        {/* FAQ Link */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Have questions about our pricing?
          </p>
          <Link
            href="#faq"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View FAQ →
          </Link>
        </div>

        {/* Enterprise */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Need something custom?
            </h3>
            <p className="text-gray-600 mb-6">
              We offer enterprise solutions with custom features, dedicated support, 
              and volume discounts.
            </p>
            <Button variant="outline" size="lg">
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
