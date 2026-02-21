import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, db, addDoc } from '../../lib/firebase';
import { Section } from '../../types/builder';

type Template = {
  id: string;
  name: string;
  category: string;
  description: string;
  preview: string;
  thumbnail: string;
  icon: string;
  sections: Section[];
  settings?: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
    };
  };
};

const templates: Template[] = [
  // ==================== COMING SOON TEMPLATES ====================
  {
    id: 'coming-soon-minimal',
    name: 'Minimal Coming Soon',
    category: 'coming-soon',
    description: 'Clean and elegant coming soon page with email signup',
    preview: '/templates/coming-soon-minimal-preview.jpg',
    thumbnail: '/templates/coming-soon-minimal-thumb.jpg',
    icon: '✨',
    sections: [
      {
        id: 'hero-coming-soon-1',
        type: 'hero',
        order: 0,
        data: {
          title: 'Coming Soon',
          subtitle: "We're crafting something extraordinary. Be the first to know when we launch.",
          buttonText: 'Notify Me',
          buttonLink: '#notify',
          backgroundImage: '',
          backgroundColor: 'linear-gradient(180deg, #0f0f0f 0%, #1a1a2e 100%)',
          textColor: '#FFFFFF',
          textStyle: {
            titleFontSize: 56,
            titleFontWeight: '800',
            titleAlignment: 'center',
            subtitleFontSize: 20,
            subtitleAlignment: 'center',
            buttonStyle: {
              backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textColor: '#FFFFFF',
              borderRadius: 12,
            }
          }
        }
      },
      {
        id: 'contact-coming-soon-1',
        type: 'contact',
        order: 1,
        data: {
          title: 'Get Notified',
          subtitle: 'Enter your email to be the first to know when we launch',
          email: 'hello@yourstore.com',
          phone: '',
          address: ''
        },
        style: {
          backgroundColor: '#1a1a2e',
          textColor: '#FFFFFF'
        }
      },
      {
        id: 'footer-coming-soon-1',
        type: 'footer',
        order: 2,
        data: {
          logoText: 'Your Brand',
          copyrightText: '© 2025 Your Brand. Coming Soon.',
          columns: [],
          socialLinks: [
            { platform: 'Facebook', icon: 'facebook', link: '#' },
            { platform: 'Instagram', icon: 'camera_alt', link: '#' },
            { platform: 'Twitter', icon: 'chat', link: '#' }
          ]
        },
        style: {
          backgroundColor: '#0f0f0f',
          textColor: '#FFFFFF'
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        backgroundColor: '#0f0f0f',
        textColor: '#FFFFFF'
      }
    }
  },
  {
    id: 'coming-soon-countdown',
    name: 'Countdown Launch',
    category: 'coming-soon',
    description: 'Exciting countdown timer with launch date',
    preview: '/templates/coming-soon-countdown-preview.jpg',
    thumbnail: '/templates/coming-soon-countdown-thumb.jpg',
    icon: '🚀',
    sections: [
      {
        id: 'hero-countdown-1',
        type: 'hero',
        order: 0,
        data: {
          title: 'Something Amazing Is Coming',
          subtitle: '🚀 Launching Soon - Get ready for a revolutionary experience',
          buttonText: 'Get Notified',
          buttonLink: '#notify',
          backgroundImage: '',
          backgroundColor: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)',
          textColor: '#FFFFFF',
          textStyle: {
            titleFontSize: 64,
            titleFontWeight: '800',
            titleAlignment: 'center',
            subtitleFontSize: 20,
            subtitleAlignment: 'center',
            buttonStyle: {
              backgroundColor: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              textColor: '#1e3c72',
              borderRadius: 16,
            }
          }
        }
      },
      {
        id: 'features-countdown-1',
        type: 'features',
        order: 1,
        data: {
          title: 'Countdown to Launch',
          subtitle: 'Mark your calendar',
          items: [
            { icon: '📅', title: '15 Days', description: 'Until launch' },
            { icon: '⏰', title: '08 Hours', description: 'Remaining' },
            { icon: '⌛', title: '42 Minutes', description: 'To go' },
            { icon: '🎯', title: '27 Seconds', description: 'Left' }
          ]
        },
        style: {
          backgroundColor: 'rgba(255,255,255,0.1)',
          textColor: '#FFFFFF'
        }
      },
      {
        id: 'contact-countdown-1',
        type: 'contact',
        order: 2,
        data: {
          title: 'Be the First to Know',
          subtitle: 'Subscribe to get early access and exclusive launch discounts',
          email: 'launch@yourstore.com',
          phone: '',
          address: ''
        },
        style: {
          backgroundColor: '#1e3c72',
          textColor: '#FFFFFF'
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#fbbf24',
        secondaryColor: '#1e3c72',
        backgroundColor: '#1e3c72',
        textColor: '#FFFFFF'
      }
    }
  },
  {
    id: 'coming-soon-gradient',
    name: 'Gradient Wave',
    category: 'coming-soon',
    description: 'Modern gradient design with animated feel',
    preview: '/templates/coming-soon-gradient-preview.jpg',
    thumbnail: '/templates/coming-soon-gradient-thumb.jpg',
    icon: '🎨',
    sections: [
      {
        id: 'hero-gradient-1',
        type: 'hero',
        order: 0,
        data: {
          title: "We're Building Something Special",
          subtitle: '🎨 NEW COLLECTION - Our new store is almost ready. Sign up for exclusive early access!',
          buttonText: 'Subscribe',
          buttonLink: '#subscribe',
          backgroundImage: '',
          backgroundColor: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 25%, #48dbfb 50%, #ff9ff3 75%, #54a0ff 100%)',
          textColor: '#2d3436',
          textStyle: {
            titleFontSize: 52,
            titleFontWeight: '800',
            titleAlignment: 'center',
            subtitleFontSize: 18,
            subtitleAlignment: 'center',
            buttonStyle: {
              backgroundColor: '#2d3436',
              textColor: '#FFFFFF',
              borderRadius: 14,
            }
          }
        }
      },
      {
        id: 'features-gradient-1',
        type: 'features',
        order: 1,
        data: {
          title: "What's Coming",
          subtitle: 'Get ready for these amazing features',
          items: [
            { icon: '🛍️', title: 'New Products', description: 'Fresh arrivals daily' },
            { icon: '🎁', title: 'Special Offers', description: 'Exclusive launch deals' },
            { icon: '🚚', title: 'Free Shipping', description: 'On all orders' }
          ]
        },
        style: {
          backgroundColor: '#FFFFFF',
          textColor: '#2d3436'
        }
      },
      {
        id: 'cta-gradient-1',
        type: 'cta',
        order: 2,
        data: {
          title: "Don't Miss Out!",
          subtitle: '🔒 No spam. Unsubscribe anytime.',
          buttonText: 'Get Early Access',
          buttonLink: '#',
          backgroundColor: '#2d3436'
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#ff6b6b',
        secondaryColor: '#feca57',
        backgroundColor: '#FFFFFF',
        textColor: '#2d3436'
      }
    }
  },
  {
    id: 'coming-soon-tech',
    name: 'Tech Launch',
    category: 'coming-soon',
    description: 'Futuristic tech-themed launch page',
    preview: '/templates/coming-soon-tech-preview.jpg',
    thumbnail: '/templates/coming-soon-tech-thumb.jpg',
    icon: '💻',
    sections: [
      {
        id: 'hero-tech-1',
        type: 'hero',
        order: 0,
        data: {
          title: 'LAUNCHING',
          subtitle: '// The future of technology is almost here',
          buttonText: 'Join Waitlist',
          buttonLink: '#waitlist',
          backgroundImage: '',
          backgroundColor: '#000000',
          textColor: '#10b981',
          textStyle: {
            titleFontSize: 72,
            titleFontWeight: '800',
            titleAlignment: 'center',
            subtitleFontSize: 20,
            subtitleAlignment: 'center',
            buttonStyle: {
              backgroundColor: '#10b981',
              textColor: '#000000',
              borderRadius: 8,
            }
          }
        }
      },
      {
        id: 'features-tech-1',
        type: 'features',
        order: 1,
        data: {
          title: 'System Status',
          subtitle: 'Initialization in progress...',
          items: [
            { icon: '📅', title: '30', description: 'Days' },
            { icon: '⏰', title: '12', description: 'Hours' },
            { icon: '⏱️', title: '45', description: 'Minutes' },
            { icon: '⚡', title: '59', description: 'Seconds' }
          ]
        },
        style: {
          backgroundColor: '#000000',
          textColor: '#10b981'
        }
      },
      {
        id: 'contact-tech-1',
        type: 'contact',
        order: 2,
        data: {
          title: 'Access Request',
          subtitle: 'Enter your credentials to join the waitlist',
          email: 'tech@yourstore.com',
          phone: '',
          address: ''
        },
        style: {
          backgroundColor: '#000000',
          textColor: '#10b981'
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#10b981',
        secondaryColor: '#3b82f6',
        backgroundColor: '#000000',
        textColor: '#10b981'
      }
    }
  },
  {
    id: 'coming-soon-elegant',
    name: 'Elegant Launch',
    category: 'coming-soon',
    description: 'Sophisticated and luxurious design',
    preview: '/templates/coming-soon-elegant-preview.jpg',
    thumbnail: '/templates/coming-soon-elegant-thumb.jpg',
    icon: '✨',
    sections: [
      {
        id: 'hero-elegant-1',
        type: 'hero',
        order: 0,
        data: {
          title: 'Coming Soon',
          subtitle: "We're preparing something truly exceptional. Join our exclusive list.",
          buttonText: 'Request Access',
          buttonLink: '#access',
          backgroundImage: '',
          backgroundColor: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',
          textColor: '#d4af37',
          textStyle: {
            titleFontSize: 72,
            titleFontWeight: '400',
            titleAlignment: 'center',
            subtitleFontSize: 18,
            subtitleAlignment: 'center',
            buttonStyle: {
              backgroundColor: '#d4af37',
              textColor: '#1a1a1a',
              borderRadius: 0,
            }
          }
        }
      },
      {
        id: 'about-elegant-1',
        type: 'about',
        order: 1,
        data: {
          title: 'Exclusive Preview',
          content: 'Experience luxury redefined. Our new collection brings together timeless elegance with modern sophistication. Be among the first to discover what we have in store.',
          image: ''
        },
        style: {
          backgroundColor: '#2d2d2d',
          textColor: '#FFFFFF'
        }
      },
      {
        id: 'footer-elegant-1',
        type: 'footer',
        order: 2,
        data: {
          logoText: 'LUXURY',
          copyrightText: '© 2025 Luxury Brand. All rights reserved.',
          columns: [],
          socialLinks: [
            { platform: 'Instagram', icon: 'camera_alt', link: '#' },
            { platform: 'Pinterest', icon: 'push_pin', link: '#' },
            { platform: 'Facebook', icon: 'facebook', link: '#' }
          ]
        },
        style: {
          backgroundColor: '#1a1a1a',
          textColor: '#d4af37'
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#d4af37',
        secondaryColor: '#1a1a1a',
        backgroundColor: '#1a1a1a',
        textColor: '#FFFFFF'
      }
    }
  },
  {
    id: 'coming-soon-construction',
    name: 'Under Construction',
    category: 'coming-soon',
    description: 'Fun and friendly construction theme',
    preview: '/templates/coming-soon-construction-preview.jpg',
    thumbnail: '/templates/coming-soon-construction-thumb.jpg',
    icon: '🚧',
    sections: [
      {
        id: 'hero-construction-1',
        type: 'hero',
        order: 0,
        data: {
          title: '🚧 Under Construction',
          subtitle: "We're working hard to bring you something amazing! Our team is building the best experience for you.",
          buttonText: '🔔 Notify Me',
          buttonLink: '#notify',
          backgroundImage: '',
          backgroundColor: '#fbbf24',
          textColor: '#1f2937',
          textStyle: {
            titleFontSize: 42,
            titleFontWeight: '800',
            titleAlignment: 'center',
            subtitleFontSize: 18,
            subtitleAlignment: 'center',
            buttonStyle: {
              backgroundColor: '#1f2937',
              textColor: '#fbbf24',
              borderRadius: 12,
            }
          }
        }
      },
      {
        id: 'features-construction-1',
        type: 'features',
        order: 1,
        data: {
          title: 'Estimated Launch',
          subtitle: 'Countdown to the big reveal',
          items: [
            { icon: '📅', title: '25 Days', description: 'Remaining' },
            { icon: '⏰', title: '14 Hours', description: 'To go' },
            { icon: '⏱️', title: '32 Minutes', description: 'Left' }
          ]
        },
        style: {
          backgroundColor: '#fef3c7',
          textColor: '#1f2937'
        }
      },
      {
        id: 'cta-construction-1',
        type: 'cta',
        order: 2,
        data: {
          title: "Don't Miss the Launch!",
          subtitle: 'Get notified when we go live',
          buttonText: 'Subscribe Now',
          buttonLink: '#',
          backgroundColor: '#1f2937'
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#fbbf24',
        secondaryColor: '#1f2937',
        backgroundColor: '#fbbf24',
        textColor: '#1f2937'
      }
    }
  },
  // ==================== E-COMMERCE TEMPLATES ====================
  {
    id: 'modern-store',
    name: 'Modern Store',
    category: 'ecommerce',
    description: 'Perfect for online stores with product showcases',
    preview: '/templates/modern-store-preview.jpg',
    thumbnail: '/templates/modern-store-thumb.jpg',
    icon: '🛍️',
    sections: [
      {
        id: 'navbar-store-1',
        type: 'navbar',
        order: 0,
        data: {
          logo: '',
          logoText: 'STORE',
          menuItems: [
            { label: 'Home', link: '#', badge: '' },
            { label: 'Products', link: '#products', badge: '' },
            { label: 'About', link: '#about', badge: '' },
            { label: 'Contact', link: '#contact', badge: '' }
          ],
          showSearch: true,
          showCart: true,
          showWishlist: true,
          backgroundColor: '#FFFFFF',
          textColor: '#27491F'
        }
      },
      {
        id: 'hero-store-1',
        type: 'hero',
        order: 1,
        data: {
          title: 'Welcome to Our Store',
          subtitle: 'Discover amazing products at great prices',
          buttonText: 'Shop Now',
          buttonLink: '#products',
          backgroundImage: '',
          backgroundColor: 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)',
          textColor: '#FFFFFF'
        }
      },
      {
        id: 'products-store-1',
        type: 'products',
        order: 2,
        data: {
          title: 'Featured Products',
          subtitle: 'Check out our best sellers',
          productCount: 6,
          layout: 'grid'
        }
      },
      {
        id: 'features-store-1',
        type: 'features',
        order: 3,
        data: {
          title: 'Why Shop With Us',
          subtitle: 'We provide the best shopping experience',
          items: [
            { icon: '🚚', title: 'Free Shipping', description: 'On orders over $50' },
            { icon: '↩️', title: 'Easy Returns', description: '30-day return policy' },
            { icon: '🔒', title: 'Secure Payment', description: '100% secure checkout' }
          ]
        }
      },
      {
        id: 'footer-store-1',
        type: 'footer',
        order: 4,
        data: {
          logoText: 'STORE',
          copyrightText: '© 2025 Store. All rights reserved.',
          columns: [
            {
              title: 'Shop',
              links: [
                { label: 'All Products', link: '#' },
                { label: 'New Arrivals', link: '#' },
                { label: 'Sale', link: '#' }
              ]
            },
            {
              title: 'Support',
              links: [
                { label: 'Contact Us', link: '#' },
                { label: 'FAQs', link: '#' },
                { label: 'Shipping', link: '#' }
              ]
            }
          ],
          socialLinks: [
            { platform: 'Facebook', icon: 'facebook', link: '#' },
            { platform: 'Instagram', icon: 'camera_alt', link: '#' }
          ]
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#27491F',
        secondaryColor: '#F0CAE1',
        backgroundColor: '#FFFFFF',
        textColor: '#171817'
      }
    }
  },
  {
    id: 'portfolio',
    name: 'Creative Portfolio',
    category: 'portfolio',
    description: 'Showcase your work with a stunning portfolio layout',
    preview: '/templates/portfolio-preview.jpg',
    thumbnail: '/templates/portfolio-thumb.jpg',
    icon: '🎨',
    sections: [
      {
        id: 'hero-portfolio-1',
        type: 'hero',
        order: 0,
        data: {
          title: 'Creative Portfolio',
          subtitle: 'Showcasing my amazing work',
          buttonText: 'View Work',
          buttonLink: '#gallery',
          backgroundImage: '',
          backgroundColor: '#f8fafc',
          textColor: '#1f2937'
        }
      },
      {
        id: 'gallery-portfolio-1',
        type: 'gallery',
        order: 1,
        data: {
          title: 'My Work',
          images: []
        }
      },
      {
        id: 'about-portfolio-1',
        type: 'about',
        order: 2,
        data: {
          title: 'About Me',
          content: 'I am a creative professional with a passion for design and innovation.',
          image: ''
        }
      },
      {
        id: 'contact-portfolio-1',
        type: 'contact',
        order: 3,
        data: {
          title: 'Get in Touch',
          subtitle: "Let's work together",
          email: 'hello@portfolio.com',
          phone: '',
          address: ''
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#27491F',
        secondaryColor: '#F0CAE1',
        backgroundColor: '#f8fafc',
        textColor: '#1f2937'
      }
    }
  },
  {
    id: 'business',
    name: 'Business Pro',
    category: 'business',
    description: 'Professional business website template',
    preview: '/templates/business-preview.jpg',
    thumbnail: '/templates/business-thumb.jpg',
    icon: '💼',
    sections: [
      {
        id: 'navbar-business-1',
        type: 'navbar',
        order: 0,
        data: {
          logo: '',
          logoText: 'BUSINESS',
          menuItems: [
            { label: 'Home', link: '#', badge: '' },
            { label: 'Services', link: '#services', badge: '' },
            { label: 'About', link: '#about', badge: '' },
            { label: 'Contact', link: '#contact', badge: '' }
          ],
          showSearch: false,
          showCart: false,
          backgroundColor: '#FFFFFF',
          textColor: '#1f2937'
        }
      },
      {
        id: 'hero-business-1',
        type: 'hero',
        order: 1,
        data: {
          title: 'Professional Business',
          subtitle: 'Your trusted business partner',
          buttonText: 'Get Started',
          buttonLink: '#contact',
          backgroundImage: '',
          backgroundColor: '#FFFFFF',
          textColor: '#1f2937'
        }
      },
      {
        id: 'features-business-1',
        type: 'features',
        order: 2,
        data: {
          title: 'Our Services',
          subtitle: 'What we offer',
          items: [
            { icon: '💼', title: 'Consulting', description: 'Expert business advice' },
            { icon: '👥', title: 'Team Building', description: 'Build your dream team' },
            { icon: '📈', title: 'Growth Strategy', description: 'Scale your business' }
          ]
        }
      },
      {
        id: 'testimonials-business-1',
        type: 'testimonials',
        order: 3,
        data: {
          title: 'Client Testimonials',
          items: [
            { name: 'John Smith', role: 'CEO', text: 'Excellent service and results!', rating: 5 },
            { name: 'Sarah Johnson', role: 'Manager', text: 'Highly recommended!', rating: 5 }
          ]
        }
      },
      {
        id: 'contact-business-1',
        type: 'contact',
        order: 4,
        data: {
          title: 'Contact Us',
          subtitle: "Let's discuss your project",
          email: 'info@business.com',
          phone: '+1 234 567 890',
          address: '123 Business Street'
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#232946',
        secondaryColor: '#eebbc3',
        backgroundColor: '#FFFFFF',
        textColor: '#1f2937'
      }
    }
  },
  {
    id: 'landing',
    name: 'Landing Page',
    category: 'landing',
    description: 'High-converting landing page template',
    preview: '/templates/landing-preview.jpg',
    thumbnail: '/templates/landing-thumb.jpg',
    icon: '🚀',
    sections: [
      {
        id: 'hero-landing-1',
        type: 'hero',
        order: 0,
        data: {
          title: 'Transform Your Business',
          subtitle: 'The perfect solution for your needs',
          buttonText: 'Get Started',
          buttonLink: '#',
          backgroundImage: '',
          backgroundColor: 'linear-gradient(135deg, #27491F 0%, #F0CAE1 100%)',
          textColor: '#FFFFFF'
        }
      },
      {
        id: 'features-landing-1',
        type: 'features',
        order: 1,
        data: {
          title: 'Why Choose Us',
          subtitle: '',
          items: [
            { icon: '⚡', title: 'Fast', description: 'Lightning fast performance' },
            { icon: '🔒', title: 'Secure', description: 'Enterprise-grade security' },
            { icon: '📈', title: 'Scalable', description: 'Grows with your business' }
          ]
        }
      },
      {
        id: 'pricing-landing-1',
        type: 'pricing',
        order: 2,
        data: {
          title: 'Pricing Plans',
          subtitle: 'Choose the perfect plan for you',
          plans: []
        }
      },
      {
        id: 'cta-landing-1',
        type: 'cta',
        order: 3,
        data: {
          title: 'Ready to Get Started?',
          subtitle: 'Join thousands of satisfied customers today',
          buttonText: 'Start Free Trial',
          buttonLink: '#',
          backgroundColor: '#27491F'
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#27491F',
        secondaryColor: '#F0CAE1',
        backgroundColor: '#FFFFFF',
        textColor: '#1f2937'
      }
    }
  },
  {
    id: 'blog',
    name: 'Blog Template',
    category: 'blog',
    description: 'Perfect for content creators and bloggers',
    preview: '/templates/blog-preview.jpg',
    thumbnail: '/templates/blog-thumb.jpg',
    icon: '📝',
    sections: [
      {
        id: 'navbar-blog-1',
        type: 'navbar',
        order: 0,
        data: {
          logo: '',
          logoText: 'BLOG',
          menuItems: [
            { label: 'Home', link: '#', badge: '' },
            { label: 'Articles', link: '#articles', badge: '' },
            { label: 'About', link: '#about', badge: '' },
            { label: 'Contact', link: '#contact', badge: '' }
          ],
          showSearch: true,
          showCart: false,
          backgroundColor: '#FFFFFF',
          textColor: '#1f2937'
        }
      },
      {
        id: 'hero-blog-1',
        type: 'hero',
        order: 1,
        data: {
          title: 'Welcome to My Blog',
          subtitle: 'Thoughts, ideas, and stories',
          buttonText: 'Read Latest',
          buttonLink: '#articles',
          backgroundImage: '',
          backgroundColor: '#f8fafc',
          textColor: '#1f2937'
        }
      },
      {
        id: 'about-blog-1',
        type: 'about',
        order: 2,
        data: {
          title: 'About the Author',
          content: 'Welcome to my blog! I write about technology, lifestyle, and personal growth.',
          image: ''
        }
      },
      {
        id: 'contact-blog-1',
        type: 'contact',
        order: 3,
        data: {
          title: 'Get in Touch',
          subtitle: "I'd love to hear from you",
          email: 'hello@myblog.com',
          phone: '',
          address: ''
        }
      }
    ],
    settings: {
      theme: {
        primaryColor: '#27491F',
        secondaryColor: '#F0CAE1',
        backgroundColor: '#FFFFFF',
        textColor: '#1f2937'
      }
    }
  }
];

const TemplatesPage = () => {
  const navigate = useNavigate();
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [creating, setCreating] = useState<string | null>(null);

  const categories = ['all', 'coming-soon', 'ecommerce', 'landing', 'business', 'portfolio', 'blog'];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter((t) => t.category === selectedCategory);

  const handleUseTemplate = async (template: Template) => {
    if (!businessId || !user?.uid) {
      alert('Please log in to use templates');
      return;
    }

    setCreating(template.id);
    try {
      const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
      const newSite = {
        name: template.name,
        description: template.description,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: template.sections, // Now using proper sections array
        settings: template.settings || {
          theme: {
            primaryColor: '#27491F',
            secondaryColor: '#F0CAE1',
            backgroundColor: '#FFFFFF',
            textColor: '#171817'
          },
          seo: {
            title: template.name,
            description: template.description,
            keywords: []
          }
        },
        pages: ['home'],
        createdBy: user.uid,
        templateId: template.id,
        templateName: template.name
      };

      const docRef = await addDoc(sitesRef, newSite);

      // Open builder with the new site
      navigate(`/ecommerce/builder?siteId=${docRef.id}`);

      setCreating(null);
    } catch (error) {
      console.error('Failed to create site from template:', error);
      alert('Failed to create site. Please try again.');
      setCreating(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'coming-soon': return '⏳';
      case 'ecommerce': return '🛍️';
      case 'landing': return '🚀';
      case 'business': return '💼';
      case 'portfolio': return '🎨';
      case 'blog': return '📝';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Website Templates</h1>
          <p className="text-sm text-madas-text/70 mt-1">Choose a template to start building your website</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ecommerce/website-builder')}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors flex items-center gap-2"
        >
          <span className="material-icons text-lg">arrow_back</span>
          Back to Builder
        </button>
      </header>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              selectedCategory === category
                ? 'bg-primary text-white shadow-lg'
                : 'bg-white border border-gray-200 text-madas-text/70 hover:bg-base hover:border-gray-300'
            }`}
          >
            <span>{getCategoryIcon(category)}</span>
            {category === 'all' ? 'All Templates' : category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <span className="material-icons text-5xl text-madas-text/30">view_module</span>
          </div>
          <p className="text-lg font-bold text-primary mb-2">No Templates Found</p>
          <p className="text-sm text-madas-text/60">Try selecting a different category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <article
              key={template.id}
              className="group rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              {/* Template Preview */}
              <div className="relative h-52 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-6xl mb-2 block">{template.icon}</span>
                    <span className="text-sm font-medium text-primary/60">{template.sections.length} sections</span>
                  </div>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleUseTemplate(template)}
                    disabled={creating === template.id}
                    className="bg-white text-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-gray-100 transition-colors"
                  >
                    {creating === template.id ? (
                      <>
                        <span className="material-icons animate-spin">progress_activity</span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <span className="material-icons">add</span>
                        Use Template
                      </>
                    )}
                  </button>
                </div>
                {/* Category badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-primary capitalize">
                    {template.category.replace('-', ' ')}
                  </span>
                </div>
                {/* Loading overlay */}
                {creating === template.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <span className="material-icons animate-spin text-4xl mb-2">progress_activity</span>
                      <p className="text-sm">Creating site...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-primary mb-1">{template.name}</h3>
                <p className="text-sm text-madas-text/70 mb-4 line-clamp-2">{template.description}</p>
                <button
                  type="button"
                  onClick={() => handleUseTemplate(template)}
                  disabled={creating === template.id}
                  className="w-full rounded-xl bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-60 shadow-md flex items-center justify-center gap-2"
                >
                  {creating === template.id ? (
                    <>
                      <span className="material-icons animate-spin text-lg">progress_activity</span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <span className="material-icons text-lg">rocket_launch</span>
                      Use This Template
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
