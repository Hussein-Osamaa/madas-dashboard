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

export const SECTION_RENDERERS: Record<SectionType, React.ComponentType<SectionRendererProps>> = {
  hero:            ({ data, style }) => <HeroSection data={data as never} style={style} />,
  navbar:          ({ data, style, siteId }) => <NavbarSection data={data as never} style={style} siteId={siteId} />,
  features:        ({ data, style }) => <FeaturesSection data={data as never} style={style} />,
  products:        ({ data, style }) => <ProductsSection data={data as never} style={style} />,
  deals:           ({ data, style }) => <DealsSection data={data as never} style={style} />,
  collections:     ({ data, style }) => <CollectionsSection data={data as never} style={style} />,
  testimonials:    ({ data, style }) => <TestimonialsSection data={data as never} style={style} />,
  cta:             ({ data, style }) => <CTASection data={data as never} style={style} />,
  about:           ({ data, style }) => <AboutSection data={data as never} style={style} />,
  contact:         ({ data, style }) => <ContactSection data={data as never} style={style} />,
  gallery:         ({ data, style }) => <GallerySection data={data as never} style={style} />,
  pricing:         ({ data, style }) => <PricingSection data={data as never} style={style} />,
  faq:             ({ data, style }) => <FAQSection data={data as never} style={style} />,
  footer:          ({ data, style, siteId }) => <FooterSection data={data as never} style={style} siteId={siteId} />,
  stats:           ({ data, style }) => <StatsSection data={data as never} style={style} />,
  team:            ({ data, style }) => <TeamSection data={data as never} style={style} />,
  services:        ({ data, style }) => <ServicesSection data={data as never} style={style} />,
  video:           ({ data, style }) => <VideoSection data={data as never} style={style} />,
  countdown:       ({ data, style }) => <CountdownSection data={data as never} style={style} />,
  banner:          ({ data, style }) => <BannerSection data={data as never} style={style} />,
  partners:        ({ data, style }) => <PartnersSection data={data as never} style={style} />,
  newsletter:      ({ data, style }) => <NewsletterSection data={data as never} style={style} />,
  divider:         ({ data, style }) => <DividerSection data={data as never} style={style} />,
  imageComparison: ({ data, style }) => <ImageComparisonSection data={data as never} style={style} />,
};
