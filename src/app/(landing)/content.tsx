'use client'

import ApplicationsSection from '@/components/landing/ApplicationsSection'
import FeaturesGrid from '@/components/landing/FeaturesGrid'
import FinalCTA from '@/components/landing/FinalCTA'
import Footer from '@/components/landing/Footer'
import Header from '@/components/landing/Header'
import HeroSection from '@/components/landing/HeroSection'
import IntegrationEcosystem from '@/components/landing/IntegrationEcosystem'
import OpenSourceSection from '@/components/landing/OpenSourceSection'
import ProductOverview from '@/components/landing/ProductOverview'

export default function LandingPageContent() {
  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main>
        <HeroSection />
        <ProductOverview />
        <FeaturesGrid />
        <ApplicationsSection />
        <IntegrationEcosystem />
        <OpenSourceSection />
        {/* <EducationSection /> */}
        <FinalCTA />
      </main>

      <Footer />
    </div>
  )
}
