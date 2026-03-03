import { Hero } from '@/components/sections/Hero'
import { Features } from '@/components/sections/Features'
import { Testimonials } from '@/components/sections/Testimonials'
import { Pricing } from '@/components/sections/Pricing'
import { CTA } from '@/components/sections/CTA'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </main>
  )
}
