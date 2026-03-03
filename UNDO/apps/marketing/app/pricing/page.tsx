import { Pricing } from '@/components/sections/Pricing'
import { FAQ } from '@/components/sections/FAQ'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const metadata = {
  title: 'Pricing - Madas',
  description: 'Choose the perfect plan for your website building needs. Start free or upgrade to unlock premium features.',
}

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="pt-20">
        <Pricing />
        <FAQ />
      </div>
      <Footer />
    </main>
  )
}
