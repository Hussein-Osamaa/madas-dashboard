// src/registry/sectionRenderers.tsx
// Maps every SectionType to its visual renderer component.
// Imported by SectionRenderer.tsx to replace the manual switch.

import React from 'react';
import type { SectionType } from '../types/builder';
import type { SectionRendererProps } from '../types/engine';

// ── Visual Renderer Imports ──────────────────────────────────────────────
import HeroSection from '../components/builder/sections/HeroSection';
import NavbarSection from '../components/builder/sections/NavbarSection';
import FeaturesSection from '../components/builder/sections/FeaturesSection';
import ProductsSection from '../components/builder/sections/ProductsSection';
import DealsSection from '../components/builder/sections/DealsSection';
import CollectionsSection from '../components/builder/sections/CollectionsSection';
import TestimonialsSection from '../components/builder/sections/TestimonialsSection';
import CTASection from '../components/builder/sections/CTASection';
import AboutSection from '../components/builder/sections/AboutSection';
import ContactSection from '../components/builder/sections/ContactSection';
import GallerySection from '../components/builder/sections/GallerySection';
import PricingSection from '../components/builder/sections/PricingSection';
import FAQSection from '../components/builder/sections/FAQSection';
import FooterSection from '../components/builder/sections/FooterSection';
import StatsSection from '../components/builder/sections/StatsSection';
import TeamSection from '../components/builder/sections/TeamSection';
import ServicesSection from '../components/builder/sections/ServicesSection';
import VideoSection from '../components/builder/sections/VideoSection';
import CountdownSection from '../components/builder/sections/CountdownSection';
import BannerSection from '../components/builder/sections/BannerSection';
import PartnersSection from '../components/builder/sections/PartnersSection';
import NewsletterSection from '../components/builder/sections/NewsletterSection';
import DividerSection from '../components/builder/sections/DividerSection';
import ImageComparisonSection from '../components/builder/sections/ImageComparisonSection';
import SlideshowSection from '../components/builder/sections/SlideshowSection';
import ProductInfoSection from '../components/builder/sections/ProductInfoSection';
import CartSection from '../components/builder/sections/CartSection';
import CheckoutSection from '../components/builder/sections/CheckoutSection';

// ── Renderer Map ─────────────────────────────────────────────────────────
// Each entry is a thin wrapper that passes data/style (and siteId where the
// renderer's Props type declares it) to the typed visual renderer.
//
// The cast `as never` is intentional: visual renderers accept typed data
// interfaces (e.g. HeroSectionData), but the engine passes
// Record<string, unknown> for generality. mergeSectionData() guarantees
// the correct shape before this renderer is ever called.
//
// Only NavbarSection and FooterSection declare siteId in their Props type;
// all others only accept data + style.

// Shorthand for the block-editing props forwarded to sections with blocks
const bp = (p: SectionRendererProps) => ({
  isSelected: p.isSelected ?? false,
  onEditBlock: p.onEditBlock,
  onDeleteBlock: p.onDeleteBlock,
});

export const SECTION_RENDERERS: Record<SectionType, React.ComponentType<SectionRendererProps>> = {
  hero:            (p) => <HeroSection data={p.data as never} style={p.style} {...bp(p)} />,
  navbar:          (p) => <NavbarSection data={p.data as never} style={p.style} siteId={p.siteId} />,
  features:        (p) => <FeaturesSection data={p.data as never} style={p.style} {...bp(p)} />,
  products:        (p) => <ProductsSection data={p.data as never} style={p.style} {...bp(p)} />,
  deals:           (p) => <DealsSection data={p.data as never} style={p.style} {...bp(p)} />,
  collections:     (p) => <CollectionsSection data={p.data as never} style={p.style} {...bp(p)} />,
  testimonials:    (p) => <TestimonialsSection data={p.data as never} style={p.style} {...bp(p)} />,
  cta:             (p) => <CTASection data={p.data as never} style={p.style} {...bp(p)} />,
  about:           (p) => <AboutSection data={p.data as never} style={p.style} {...bp(p)} />,
  contact:         (p) => <ContactSection data={p.data as never} style={p.style} {...bp(p)} />,
  gallery:         (p) => <GallerySection data={p.data as never} style={p.style} {...bp(p)} />,
  pricing:         (p) => <PricingSection data={p.data as never} style={p.style} {...bp(p)} />,
  faq:             (p) => <FAQSection data={p.data as never} style={p.style} {...bp(p)} />,
  footer:          (p) => <FooterSection data={p.data as never} style={p.style} siteId={p.siteId} {...bp(p)} />,
  stats:           (p) => <StatsSection data={p.data as never} style={p.style} {...bp(p)} />,
  team:            (p) => <TeamSection data={p.data as never} style={p.style} {...bp(p)} />,
  services:        (p) => <ServicesSection data={p.data as never} style={p.style} {...bp(p)} />,
  video:           (p) => <VideoSection data={p.data as never} style={p.style} {...bp(p)} />,
  countdown:       (p) => <CountdownSection data={p.data as never} style={p.style} {...bp(p)} />,
  banner:          (p) => <BannerSection data={p.data as never} style={p.style} {...bp(p)} />,
  partners:        (p) => <PartnersSection data={p.data as never} style={p.style} {...bp(p)} />,
  newsletter:      (p) => <NewsletterSection data={p.data as never} style={p.style} {...bp(p)} />,
  divider:         (p) => <DividerSection data={p.data as never} style={p.style} {...bp(p)} />,
  imageComparison: (p) => <ImageComparisonSection data={p.data as never} style={p.style} {...bp(p)} />,
  slideshow:       (p) => <SlideshowSection data={p.data as never} style={p.style} {...bp(p)} />,
  productInfo:     (p) => <ProductInfoSection data={p.data as never} style={p.style} {...bp(p)} />,
  cart:            (p) => <CartSection data={p.data as never} style={p.style} {...bp(p)} />,
  checkout:        (p) => <CheckoutSection data={p.data as never} style={p.style} />,
};
