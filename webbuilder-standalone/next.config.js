/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001',
    NEXT_PUBLIC_BUILDER_URL: process.env.NEXT_PUBLIC_BUILDER_URL || 'http://localhost:3002',
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003',
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/builder',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001',
        permanent: false,
      },
      {
        source: '/admin',
        destination: process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3003',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;