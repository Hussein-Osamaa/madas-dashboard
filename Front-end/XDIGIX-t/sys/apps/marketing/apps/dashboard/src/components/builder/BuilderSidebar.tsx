import { useState } from 'react';
import { Section, SectionType } from '../../types/builder';

type Props = {
  onAddSection: (type: SectionType, initialData?: Record<string, any>) => void;
  sections: Section[];
  onSelectSection: (id: string | null) => void;
  selectedSection: string | null;
};

// Section type definitions with preview info
const sectionTypes: Array<{ 
  type: SectionType; 
  label: string; 
  icon: string; 
  description: string; 
  category: string;
  variant?: string;
  initialData?: Record<string, any>;
}> = [
  // Layout sections
  { type: 'navbar', label: 'Navigation Bar', icon: 'menu', description: 'Header navigation menu', category: 'Layout' },
  { type: 'banner', label: 'Banner', icon: 'notifications', description: 'Announcement banner', category: 'Layout' },
  { type: 'hero', label: 'Hero - Default', icon: 'image', description: 'With title & subtitle', category: 'Layout', variant: 'default', initialData: { layout: 'default' } },
  { type: 'hero', label: 'Hero - Minimal', icon: 'fullscreen', description: 'Full image + button only', category: 'Layout', variant: 'minimal', initialData: { layout: 'minimal', buttonText: 'Explore Collection' } },
  { type: 'divider', label: 'Divider', icon: 'horizontal_rule', description: 'Section separator', category: 'Layout' },
  { type: 'footer', label: 'Footer', icon: 'view_agenda', description: 'Site footer with links', category: 'Layout' },
  
  // Content sections
  { type: 'features', label: 'Features', icon: 'star', description: 'Feature highlights', category: 'Content' },
  { type: 'about', label: 'About', icon: 'info', description: 'About us section', category: 'Content' },
  { type: 'services', label: 'Services', icon: 'build', description: 'Services you offer', category: 'Content' },
  { type: 'team', label: 'Team', icon: 'groups', description: 'Team members', category: 'Content' },
  { type: 'gallery', label: 'Gallery', icon: 'photo_library', description: 'Image gallery', category: 'Content' },
  { type: 'imageComparison', label: 'Image Comparison', icon: 'compare', description: 'Before/after slider', category: 'Content' },
  { type: 'video', label: 'Video', icon: 'play_circle', description: 'Embedded video', category: 'Content' },
  { type: 'faq', label: 'FAQ', icon: 'help_outline', description: 'Frequently asked questions', category: 'Content' },
  
  // E-commerce sections
  { type: 'products', label: 'Products', icon: 'inventory_2', description: 'Product showcase', category: 'E-commerce' },
  { type: 'collections', label: 'Collections', icon: 'collections', description: 'Shop by collection', category: 'E-commerce' },
  { type: 'deals', label: 'Deals', icon: 'local_offer', description: 'Deal of the day', category: 'E-commerce' },
  { type: 'pricing', label: 'Pricing', icon: 'attach_money', description: 'Pricing plans', category: 'E-commerce' },
  { type: 'testimonials', label: 'Testimonials', icon: 'format_quote', description: 'Customer reviews', category: 'E-commerce' },
  
  // Engagement sections
  { type: 'cta', label: 'Call to Action', icon: 'campaign', description: 'Action button section', category: 'Engagement' },
  { type: 'contact', label: 'Contact', icon: 'contact_mail', description: 'Contact information', category: 'Engagement' },
  { type: 'newsletter', label: 'Newsletter', icon: 'mail', description: 'Email signup form', category: 'Engagement' },
  { type: 'countdown', label: 'Countdown', icon: 'timer', description: 'Countdown timer', category: 'Engagement' },
  
  // Social Proof sections
  { type: 'stats', label: 'Statistics', icon: 'bar_chart', description: 'Numbers & metrics', category: 'Social Proof' },
  { type: 'partners', label: 'Partners', icon: 'handshake', description: 'Partner logos', category: 'Social Proof' }
];

// Category icons and colors
const categoryConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  'Layout': { icon: 'dashboard', color: '#6366f1', bgColor: '#eef2ff' },
  'Content': { icon: 'article', color: '#10b981', bgColor: '#ecfdf5' },
  'E-commerce': { icon: 'shopping_cart', color: '#f59e0b', bgColor: '#fffbeb' },
  'Engagement': { icon: 'campaign', color: '#ef4444', bgColor: '#fef2f2' },
  'Social Proof': { icon: 'verified', color: '#8b5cf6', bgColor: '#f5f3ff' }
};

// Enhanced Section preview component with realistic visuals
const SectionPreview = ({ type, variant }: { type: SectionType; variant?: string }) => {
  const previewStyles: Record<string, JSX.Element> = {
    navbar: (
      <div className="w-full h-full bg-white flex items-center px-2 shadow-sm">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-500 to-emerald-600"></div>
          <div className="w-6 h-1.5 bg-gray-800 rounded-sm"></div>
        </div>
        <div className="flex-1 flex justify-center gap-2">
          <div className="w-4 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-4 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-4 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-4 h-1 bg-gray-300 rounded-full"></div>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
        </div>
      </div>
    ),
    banner: (
      <div className="w-full h-full bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-center px-2 overflow-hidden">
        <div className="flex items-center gap-1 animate-pulse">
          <span className="text-white text-[6px] font-medium whitespace-nowrap">🎉 Special Offer</span>
          <span className="text-white/80 text-[5px] whitespace-nowrap">Free Shipping on Orders $50+</span>
        </div>
      </div>
    ),
    hero: variant === 'minimal' ? (
      // Minimal Hero - Full image with just button
      <div className="w-full h-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300"></div>
        <div className="absolute inset-0 flex items-center justify-center" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23666666' fill-opacity='0.05'%3E%3Cpath d='M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm0 38c-9.941 0-18-8.059-18-18S10.059 2 20 2s18 8.059 18 18-8.059 18-18 18z'/%3E%3C/g%3E%3C/svg%3E")`
        }}>
          {/* Silhouette/Photo placeholder */}
          <div className="w-8 h-10 bg-gray-400/30 rounded-t-full"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-2 py-0.5 border border-gray-600 bg-transparent text-[4px] font-medium text-gray-700 tracking-wider uppercase">
            Explore Collection
          </div>
        </div>
        {/* Navigation dots */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          <div className="w-1 h-1 rounded-full bg-gray-600"></div>
          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
        </div>
      </div>
    ) : (
      // Default Hero - With title, subtitle, and button
      <div className="w-full h-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800"></div>
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-1">
          <div className="text-white text-[7px] font-bold leading-tight mb-0.5">Welcome to Store</div>
          <div className="text-white/70 text-[4px] mb-1">Discover amazing products</div>
          <div className="px-2 py-0.5 bg-white rounded-sm text-[4px] font-medium text-emerald-700">Shop Now</div>
        </div>
      </div>
    ),
    divider: (
      <div className="w-full h-full bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-3">
        <div className="flex items-center gap-1 w-full">
          <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-gray-300"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-gray-300 to-gray-300"></div>
        </div>
      </div>
    ),
    footer: (
      <div className="w-full h-full bg-slate-900 flex flex-col p-1.5">
        <div className="flex gap-2 mb-1">
          <div className="flex-1">
            <div className="w-4 h-1 bg-white/80 rounded-sm mb-0.5"></div>
            <div className="space-y-0.5">
              <div className="w-6 h-0.5 bg-slate-600 rounded-sm"></div>
              <div className="w-5 h-0.5 bg-slate-600 rounded-sm"></div>
            </div>
          </div>
          <div className="flex-1">
            <div className="w-4 h-1 bg-white/80 rounded-sm mb-0.5"></div>
            <div className="space-y-0.5">
              <div className="w-6 h-0.5 bg-slate-600 rounded-sm"></div>
              <div className="w-5 h-0.5 bg-slate-600 rounded-sm"></div>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-1 border-t border-slate-700 flex items-center justify-between">
          <div className="w-8 h-0.5 bg-slate-600 rounded"></div>
          <div className="flex gap-0.5">
            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
          </div>
        </div>
      </div>
    ),
    features: (
      <div className="w-full h-full bg-gray-50 p-1.5">
        <div className="text-center mb-1">
          <div className="w-8 h-1 bg-gray-800 rounded-sm mx-auto mb-0.5"></div>
          <div className="w-10 h-0.5 bg-gray-300 rounded-sm mx-auto"></div>
        </div>
        <div className="flex gap-1 justify-center">
          {[1,2,3].map(i => (
            <div key={i} className="flex-1 bg-white rounded p-1 shadow-sm text-center">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 mx-auto mb-0.5 flex items-center justify-center">
                <span className="text-white text-[5px]">✓</span>
              </div>
              <div className="w-full h-0.5 bg-gray-200 rounded mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    ),
    about: (
      <div className="w-full h-full bg-white p-1.5 flex gap-1.5">
        <div className="w-1/2 rounded overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
          <div className="w-4 h-4 rounded-lg bg-emerald-300 flex items-center justify-center">
            <span className="text-emerald-600 text-[6px]">📷</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-8 h-1.5 bg-gray-800 rounded-sm mb-1"></div>
          <div className="space-y-0.5">
            <div className="w-full h-0.5 bg-gray-200 rounded"></div>
            <div className="w-11/12 h-0.5 bg-gray-200 rounded"></div>
            <div className="w-3/4 h-0.5 bg-gray-200 rounded"></div>
          </div>
          <div className="w-6 h-1.5 bg-emerald-500 rounded-sm mt-1"></div>
        </div>
      </div>
    ),
    services: (
      <div className="w-full h-full bg-slate-50 p-1">
        <div className="grid grid-cols-2 gap-1 h-full">
          {['🎨', '⚡', '🔒', '💡'].map((emoji, i) => (
            <div key={i} className="bg-white rounded shadow-sm p-1 flex flex-col items-center justify-center">
              <span className="text-[8px] mb-0.5">{emoji}</span>
              <div className="w-4 h-0.5 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    ),
    team: (
      <div className="w-full h-full bg-gray-50 p-1">
        <div className="flex gap-1 justify-center items-end h-full">
          {[1,2,3].map(i => (
            <div key={i} className="flex-1 bg-white rounded-lg shadow-sm p-1 text-center">
              <div className={`w-4 h-4 rounded-full mx-auto mb-0.5 bg-gradient-to-br ${
                i === 1 ? 'from-blue-300 to-blue-400' : 
                i === 2 ? 'from-pink-300 to-pink-400' : 
                'from-purple-300 to-purple-400'
              }`}></div>
              <div className="w-5 h-0.5 bg-gray-300 rounded mx-auto mb-0.5"></div>
              <div className="w-4 h-0.5 bg-gray-200 rounded mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    ),
    gallery: (
      <div className="w-full h-full p-0.5 bg-white">
        <div className="grid grid-cols-3 gap-0.5 h-full">
          <div className="bg-gradient-to-br from-rose-200 to-rose-300 rounded-sm"></div>
          <div className="bg-gradient-to-br from-sky-200 to-sky-300 rounded-sm"></div>
          <div className="bg-gradient-to-br from-amber-200 to-amber-300 rounded-sm"></div>
          <div className="bg-gradient-to-br from-emerald-200 to-emerald-300 rounded-sm"></div>
          <div className="bg-gradient-to-br from-violet-200 to-violet-300 rounded-sm"></div>
          <div className="bg-gradient-to-br from-orange-200 to-orange-300 rounded-sm"></div>
        </div>
      </div>
    ),
    imageComparison: (
      <div className="w-full h-full flex relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-300"></div>
        <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-gradient-to-r from-emerald-400 to-emerald-300 flex items-center justify-center">
          <span className="text-white/80 text-[5px] font-medium">Before</span>
        </div>
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white shadow-md border border-gray-200"></div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-center">
          <span className="text-gray-600 text-[5px] font-medium">After</span>
        </div>
      </div>
    ),
    video: (
      <div className="w-full h-full bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900"></div>
        <div className="absolute inset-2 rounded bg-slate-700/50"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5"></div>
          </div>
        </div>
        <div className="absolute bottom-1 left-1 right-1 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="w-1/3 h-full bg-red-500"></div>
        </div>
      </div>
    ),
    faq: (
      <div className="w-full h-full bg-gray-50 p-1.5">
        <div className="space-y-1">
          {[true, false, false].map((open, i) => (
            <div key={i} className={`rounded ${open ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-1 p-0.5 px-1">
                <span className={`text-[6px] ${open ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {open ? '−' : '+'}
                </span>
                <div className={`flex-1 h-0.5 rounded ${open ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
              </div>
              {open && (
                <div className="px-1 pb-1">
                  <div className="h-0.5 bg-gray-200 rounded w-11/12 mb-0.5"></div>
                  <div className="h-0.5 bg-gray-200 rounded w-3/4"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    products: (
      <div className="w-full h-full bg-gray-100 p-1">
        <div className="grid grid-cols-2 gap-1 h-full">
          {[1,2].map(i => (
            <div key={i} className="bg-white rounded shadow-sm overflow-hidden flex flex-col">
              <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="w-4 h-4 rounded bg-gray-300"></div>
              </div>
              <div className="p-0.5">
                <div className="w-full h-0.5 bg-gray-300 rounded mb-0.5"></div>
                <div className="flex justify-between items-center">
                  <div className="w-3 h-0.5 bg-emerald-500 rounded"></div>
                  <div className="w-2 h-2 rounded bg-emerald-500"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    collections: (
      <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 p-1">
        <div className="text-[5px] font-bold text-center text-slate-700 mb-1">Shop by Collection</div>
        <div className="grid grid-cols-2 gap-1 h-[calc(100%-12px)]">
          {[
            { color: 'from-emerald-700 to-emerald-900' },
            { color: 'from-pink-400 to-rose-500' },
            { color: 'from-amber-400 to-orange-500' },
            { color: 'from-blue-500 to-indigo-600' }
          ].map((item, i) => (
            <div key={i} className={`rounded overflow-hidden relative bg-gradient-to-br ${item.color}`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-icons text-white/60 text-[10px]">collections</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 p-0.5">
                <div className="h-0.5 w-2/3 bg-white/80 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    deals: (
      <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-100 p-1.5 flex gap-1.5">
        <div className="w-1/2 bg-white rounded-lg shadow-sm overflow-hidden flex items-center justify-center">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-200 to-amber-300 flex items-center justify-center">
            <span className="text-[8px]">🏷️</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-[5px] font-bold text-amber-600 mb-0.5">Deal of the Day</div>
          <div className="w-full h-0.5 bg-gray-300 rounded mb-1"></div>
          <div className="flex gap-0.5">
            {['00','00','00'].map((n, i) => (
              <div key={i} className="bg-slate-800 rounded px-0.5 py-0.5">
                <span className="text-white text-[5px] font-mono">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    pricing: (
      <div className="w-full h-full bg-gray-50 p-1 flex gap-0.5 items-end justify-center">
        <div className="w-1/4 h-3/4 bg-white rounded-t shadow-sm p-0.5 text-center">
          <div className="w-2 h-0.5 bg-gray-300 rounded mx-auto mb-0.5"></div>
          <div className="text-[6px] font-bold text-gray-600">$9</div>
        </div>
        <div className="w-1/3 h-full bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-t shadow-lg p-0.5 text-center relative">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-amber-400 text-[4px] px-1 rounded-full text-white">★</div>
          <div className="w-3 h-0.5 bg-white/60 rounded mx-auto mb-0.5"></div>
          <div className="text-[7px] font-bold text-white">$29</div>
        </div>
        <div className="w-1/4 h-3/4 bg-white rounded-t shadow-sm p-0.5 text-center">
          <div className="w-2 h-0.5 bg-gray-300 rounded mx-auto mb-0.5"></div>
          <div className="text-[6px] font-bold text-gray-600">$99</div>
        </div>
      </div>
    ),
    testimonials: (
      <div className="w-full h-full bg-emerald-50 p-1.5 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-1.5 w-full">
          <div className="text-emerald-400 text-[10px] leading-none mb-0.5">"</div>
          <div className="space-y-0.5 mb-1">
            <div className="w-full h-0.5 bg-gray-200 rounded"></div>
            <div className="w-3/4 h-0.5 bg-gray-200 rounded"></div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-300 to-blue-400"></div>
            <div>
              <div className="w-4 h-0.5 bg-gray-400 rounded"></div>
              <div className="w-3 h-0.5 bg-gray-200 rounded mt-0.5"></div>
            </div>
          </div>
        </div>
      </div>
    ),
    cta: (
      <div className="w-full h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 flex flex-col items-center justify-center px-2">
        <div className="text-white text-[7px] font-bold mb-0.5 text-center">Ready to Start?</div>
        <div className="text-white/70 text-[4px] mb-1 text-center">Join thousands of happy customers</div>
        <div className="px-3 py-1 bg-white rounded shadow-sm">
          <span className="text-emerald-600 text-[5px] font-semibold">Get Started Free</span>
        </div>
      </div>
    ),
    contact: (
      <div className="w-full h-full bg-gray-50 p-1.5 flex gap-1.5">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="flex gap-0.5">
            <div className="flex-1 h-2 bg-white rounded border border-gray-200"></div>
            <div className="flex-1 h-2 bg-white rounded border border-gray-200"></div>
          </div>
          <div className="h-2 bg-white rounded border border-gray-200"></div>
          <div className="flex-1 bg-white rounded border border-gray-200"></div>
          <div className="h-2 bg-emerald-500 rounded"></div>
        </div>
        <div className="w-1/3 flex flex-col gap-1 justify-center items-center">
          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-[6px]">📍</span>
          </div>
          <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-[6px]">📧</span>
          </div>
        </div>
      </div>
    ),
    newsletter: (
      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center px-2">
        <div className="text-white text-[6px] font-bold mb-0.5">Stay Updated</div>
        <div className="text-slate-400 text-[4px] mb-1">Get the latest news delivered</div>
        <div className="flex w-full max-w-[90%] gap-0.5">
          <div className="flex-1 h-2 bg-white/10 rounded border border-white/20 flex items-center px-1">
            <span className="text-white/40 text-[4px]">email@example.com</span>
          </div>
          <div className="px-1.5 h-2 bg-emerald-500 rounded flex items-center">
            <span className="text-white text-[4px] font-medium">→</span>
          </div>
        </div>
      </div>
    ),
    countdown: (
      <div className="w-full h-full bg-gradient-to-r from-violet-600 to-purple-600 flex flex-col items-center justify-center px-1">
        <div className="text-white/80 text-[5px] font-medium mb-1">Sale Ends In</div>
        <div className="flex gap-1">
          {[
            { val: '02', label: 'D' },
            { val: '14', label: 'H' },
            { val: '36', label: 'M' },
            { val: '52', label: 'S' }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="bg-white/20 backdrop-blur rounded px-1 py-0.5">
                <span className="text-white text-[7px] font-bold font-mono">{item.val}</span>
              </div>
              <span className="text-white/60 text-[4px]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    stats: (
      <div className="w-full h-full bg-white p-1.5">
        <div className="flex gap-1 justify-center items-center h-full">
          {[
            { num: '10K+', label: 'Users' },
            { num: '500+', label: 'Reviews' },
            { num: '99%', label: 'Happy' }
          ].map((stat, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="text-[8px] font-bold text-emerald-600">{stat.num}</div>
              <div className="text-[4px] text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    partners: (
      <div className="w-full h-full bg-gray-50 p-1.5 flex items-center justify-center gap-1">
        {[1,2,3,4].map(i => (
          <div 
            key={i} 
            className="w-5 h-3 rounded bg-white shadow-sm flex items-center justify-center border border-gray-100"
          >
            <div className={`w-3 h-1.5 rounded-sm bg-gradient-to-r ${
              i === 1 ? 'from-blue-400 to-blue-500' :
              i === 2 ? 'from-orange-400 to-orange-500' :
              i === 3 ? 'from-green-400 to-green-500' :
              'from-purple-400 to-purple-500'
            }`}></div>
          </div>
        ))}
      </div>
    )
  };
  
  return previewStyles[type] || (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <span className="material-icons text-gray-300 text-sm">widgets</span>
    </div>
  );
};

const BuilderSidebar = ({ onAddSection, sections, onSelectSection, selectedSection }: Props) => {
  const [openCategory, setOpenCategory] = useState<string | null>('Layout');
  
  // Group sections by category
  const categories = Array.from(new Set(sectionTypes.map(s => s.category)));
  
  const handleCategoryClick = (category: string) => {
    setOpenCategory(openCategory === category ? null : category);
  };
  
  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="p-4 pb-3 flex-shrink-0 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-800">Add Section</h2>
        <p className="text-xs text-gray-500 mt-0.5">Choose from {sectionTypes.length} section types</p>
      </div>
      
      {/* Category Tabs - Accordion Style */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="divide-y divide-gray-100">
          {categories.map((category) => {
            const config = categoryConfig[category];
            const isOpen = openCategory === category;
            const categorySections = sectionTypes.filter((s) => s.category === category);
            
            return (
              <div key={category} className="bg-white">
                {/* Category Tab Header */}
                <button
                  type="button"
                  onClick={() => handleCategoryClick(category)}
                  className={`w-full px-4 py-3 flex items-center justify-between transition-all duration-200 hover:bg-gray-50 ${
                    isOpen ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200"
                      style={{ 
                        backgroundColor: config.bgColor,
                        transform: isOpen ? 'scale(1.05)' : 'scale(1)'
                      }}
                    >
                      <span 
                        className="material-icons text-lg"
                        style={{ color: config.color }}
                      >
                        {config.icon}
                      </span>
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-medium text-gray-800">{category}</h3>
                      <p className="text-xs text-gray-400">{categorySections.length} sections</p>
                    </div>
        </div>
                  <span 
                    className="material-icons text-gray-400 transition-transform duration-300"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    expand_more
                  </span>
                </button>
                
                {/* Category Content - Dropdown */}
                <div 
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ 
                    maxHeight: isOpen ? `${categorySections.length * 90 + 24}px` : '0px',
                    opacity: isOpen ? 1 : 0
                  }}
                >
                  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                    {categorySections.map((sectionType, idx) => (
                      <button
                        key={`${sectionType.type}-${sectionType.variant || idx}`}
                        type="button"
                        onClick={() => onAddSection(sectionType.type, sectionType.initialData)}
                        className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-primary hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
                      >
                        {/* Preview */}
                        <div className="h-14 w-full overflow-hidden rounded-t-lg">
                          <SectionPreview type={sectionType.type} variant={sectionType.variant} />
                        </div>
                        
                        {/* Label */}
                        <div className="p-2 border-t border-gray-100 bg-white group-hover:bg-primary/5 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="material-icons text-xs transition-colors"
                              style={{ color: config.color }}
                            >
                            {sectionType.icon}
                          </span>
                            <span className="text-[11px] font-medium text-gray-700 group-hover:text-primary truncate transition-colors">
                              {sectionType.label}
                            </span>
                          </div>
                        </div>
                        
                        {/* Add Overlay on Hover */}
                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                          <div className="bg-white rounded-full p-1.5 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200">
                            <span className="material-icons text-primary text-base">add</span>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
          </div>
            );
          })}
        </div>
      </div>

      {/* Sections List - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 max-h-[35%] overflow-hidden flex flex-col bg-gray-50">
        <div className="p-3 pb-2 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center justify-between">
            <span>Your Sections</span>
            <span 
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: sections.length > 0 ? '#eef2ff' : '#f3f4f6',
                color: sections.length > 0 ? '#6366f1' : '#9ca3af'
              }}
            >
              {sections.length}
            </span>
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 pb-3">
        {sections.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="material-icons text-2xl text-gray-300">add_circle_outline</span>
              </div>
              <p className="text-xs text-gray-500">No sections yet</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Select a category above to add sections</p>
          </div>
        ) : (
            <div className="space-y-1.5">
            {sections
              .sort((a, b) => a.order - b.order)
              .map((section) => {
                const sectionType = sectionTypes.find((st) => st.type === section.type);
                  const config = sectionType ? categoryConfig[sectionType.category] : null;
                  
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSelectSection(section.id)}
                      className={`w-full text-left p-2 rounded-lg transition-all flex items-center gap-2 ${
                      selectedSection === section.id
                          ? 'bg-white shadow-sm ring-2 ring-primary/20'
                          : 'bg-white/60 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                      {/* Mini Preview */}
                      <div 
                        className="w-10 h-7 rounded overflow-hidden flex-shrink-0 border"
                        style={{ borderColor: config?.color || '#e5e7eb' }}
                      >
                        <SectionPreview type={section.type} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-700 truncate block">
                          {sectionType?.label || section.type}
                      </span>
                      </div>
                      
                      <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        #{section.order + 1}
                      </span>
                  </button>
                );
              })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default BuilderSidebar;
