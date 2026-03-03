import Link from 'next/link'
import { Zap, Twitter, Github, Linkedin, Mail } from 'lucide-react'

export function Footer() {
  const footerLinks = {
    Product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Templates', href: '#templates' },
      { name: 'Integrations', href: '#integrations' },
    ],
    Company: [
      { name: 'About', href: '#about' },
      { name: 'Blog', href: '#blog' },
      { name: 'Careers', href: '#careers' },
      { name: 'Contact', href: '#contact' },
    ],
    Resources: [
      { name: 'Help Center', href: '#help' },
      { name: 'Documentation', href: '#docs' },
      { name: 'API', href: '#api' },
      { name: 'Status', href: '#status' },
    ],
    Legal: [
      { name: 'Privacy Policy', href: '#privacy' },
      { name: 'Terms of Service', href: '#terms' },
      { name: 'Cookie Policy', href: '#cookies' },
      { name: 'GDPR', href: '#gdpr' },
    ],
  }

  const socialLinks = [
    { name: 'Twitter', href: '#', icon: Twitter },
    { name: 'GitHub', href: '#', icon: Github },
    { name: 'LinkedIn', href: '#', icon: Linkedin },
    { name: 'Email', href: 'mailto:hello@madas.com', icon: Mail },
  ]

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Madas</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-md">
              Build beautiful websites without coding. Drag, drop, and publish with our intuitive website builder.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <item.icon className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Madas. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#privacy" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Privacy
              </Link>
              <Link href="#terms" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Terms
              </Link>
              <Link href="#cookies" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
