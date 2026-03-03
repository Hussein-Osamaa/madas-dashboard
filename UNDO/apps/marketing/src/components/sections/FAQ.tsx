'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    question: 'How does the free plan work?',
    answer: 'Our free plan includes 1 website, basic templates, and community support. You can build and publish your website completely free, with Madas branding in the footer.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time. Your website will remain active until the end of your current billing period.',
  },
  {
    question: 'Do you offer custom domains?',
    answer: 'Yes! Pro and Business plans include custom domain support. You can connect your own domain name to your website.',
  },
  {
    question: 'Is there a limit on website traffic?',
    answer: 'Free plan includes 1GB bandwidth per month. Pro plan includes 10GB, and Business plan includes 100GB. Additional bandwidth can be purchased if needed.',
  },
  {
    question: 'Can I export my website?',
    answer: 'Yes, you can export your website code and content. This feature is available on Pro and Business plans.',
  },
  {
    question: 'Do you provide customer support?',
    answer: 'Free plan includes community support. Pro plan includes email support, and Business plan includes priority support with faster response times.',
  },
  {
    question: 'Can I use my own custom code?',
    answer: 'Yes! Pro and Business plans allow you to add custom HTML, CSS, and JavaScript to extend your website functionality.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use enterprise-grade security with SSL certificates, regular backups, and comply with GDPR and other privacy regulations.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked
            <br />
            <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about Madas. Can't find the answer you're looking for?
            <a href="#contact" className="text-blue-600 hover:text-blue-700 ml-1">
              Contact us
            </a>
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                onClick={() => toggleFAQ(index)}
              >
                <span className="text-lg font-medium text-gray-900">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Still have questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Our support team is here to help you get the most out of Madas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@madas.com"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Contact Support
              </a>
              <a
                href="#help"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Help Center
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
