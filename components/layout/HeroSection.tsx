/**
 * HeroSection - Authoritative Layout Component
 *
 * Hero section matching ZIP layout exactly.
 * Full-width background with dark overlay
 * Centered content with max-w-[700px] for text
 * Padding: 120px 20px
 *
 * THIS IS THE AUTHORITATIVE LAYOUT - DO NOT MODIFY DIMENSIONS
 */

import { ReactNode } from 'react'

export interface HeroSectionProps {
  backgroundImageUrl?: string
  logoUrl?: string
  logoAlt?: string
  subtitle?: string
  children?: ReactNode
  className?: string
}

export function HeroSection({
  backgroundImageUrl = 'https://019bb44e-0d7e-7695-9ab5-ee7e0fcf0839.mochausercontent.com/header.jpg',
  logoUrl = 'https://019bb44e-0d7e-7695-9ab5-ee7e0fcf0839.mochausercontent.com/LAKELOCAL.png',
  logoAlt = 'Lake County Local',
  subtitle = 'Discover the best local deals and businesses across Lake County, Florida',
  children,
  className = ''
}: HeroSectionProps) {
  return (
    <section
      className={`text-center text-white ${className}`}
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${backgroundImageUrl})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        padding: '120px 20px'
      }}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt={logoAlt}
          className="mx-auto mb-3"
          style={{ maxWidth: '600px', width: '100%' }}
        />
      )}
      {subtitle && (
        <p className="mx-auto" style={{ fontSize: '18px', maxWidth: '700px' }}>
          {subtitle}
        </p>
      )}
      {children}
    </section>
  )
}
