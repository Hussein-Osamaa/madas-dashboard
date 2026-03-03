'use client';

import Link from 'next/link';
import { useState } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  buttonText: string;
  buttonColor: string;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    period: 'month',
    description: 'Perfect for small businesses getting started',
    features: [
      'Up to 5 websites',
      'Basic web builder',
      'Analytics dashboard',
      'Email support',
      'Mobile responsive',
      'SSL certificates'
    ],
    buttonText: 'Choose Starter',
    buttonColor: 'bg-gray-600 hover:bg-gray-700'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    period: 'month',
    description: 'Ideal for growing businesses',
    features: [
      'Up to 25 websites',
      'Advanced web builder',
      'Advanced analytics',
      'Priority support',
      'Custom domains',
      'E-commerce features',
      'API access',
      'Team collaboration'
    ],
    popular: true,
    buttonText: 'Choose Pro',
    buttonColor: 'bg-blue-600 hover:bg-blue-700'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    period: 'month',
    description: 'For large organizations with complex needs',
    features: [
      'Unlimited websites',
      'Premium web builder',
      'Custom analytics',
      '24/7 phone support',
      'White-label options',
      'Advanced e-commerce',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee'
    ],
    buttonText: 'Choose Enterprise',
    buttonColor: 'bg-purple-600 hover:bg-purple-700'
  }
];

export default function PlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    // Redirect to checkout with plan selection
    window.location.href = `/checkout?plan=${planId}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Navigation */}
      <nav className="glass-nav fixed top-4 left-4 right-4 z-50 mx-auto max-w-7xl">
        <div className="px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold gradient-text glow-text">
                Next Gen Coders
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className="text-gray-300 hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Home
                </Link>
                <Link href="/plans" className="text-white hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Plans
                </Link>
                <Link href="#contact" className="text-gray-300 hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text glow-text">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Select the perfect plan for your business needs. All plans include our core features 
              with no hidden fees or setup costs. Built for the future.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative glass-card group ${
                plan.popular ? 'ring-2 ring-cyan-400 transform scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-cyan-400 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-white mb-4 gradient-text">{plan.name}</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-400 text-lg">/{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-6 h-6 text-cyan-400 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelect(plan.id)}
                className="glass-button w-full"
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card">
            <h2 className="text-4xl font-bold text-center mb-12 gradient-text glow-text">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-8">
              <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-white mb-4 gradient-text">
                  Can I change my plan later?
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect 
                  immediately and we'll prorate any billing differences. Our AI-powered system 
                  handles all transitions seamlessly.
                </p>
              </div>
              
              <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-white mb-4 gradient-text">
                  Is there a free trial?
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  We offer a 14-day free trial for all plans. No credit card required to start, 
                  and you can cancel anytime during the trial period. Experience the future of 
                  web development risk-free.
                </p>
              </div>
              
              <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-white mb-4 gradient-text">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  We accept all major credit cards, PayPal, and bank transfers for Enterprise plans. 
                  All payments are processed securely through Stripe with quantum-level encryption.
                </p>
              </div>
              
              <div className="glass-card p-6">
                <h3 className="text-xl font-semibold text-white mb-4 gradient-text">
                  Do you offer refunds?
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  We offer a 30-day money-back guarantee. If you're not satisfied with our service, 
                  contact our support team for a full refund. Your satisfaction is our priority.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card text-center">
            <h3 className="text-3xl font-bold mb-6 gradient-text glow-text">Next Gen Coders</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Empowering businesses to build their digital future with cutting-edge technology.
            </p>
            <p className="text-gray-400">
              © 2024 Next Gen Coders. All rights reserved. Built for the future.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
