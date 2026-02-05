/**
 * Section - Authoritative Layout Component
 *
 * Generic section wrapper matching ZIP layout exactly.
 * Container: max-w-[1100px] mx-auto
 * Padding: 60px 20px (default)
 *
 * THIS IS THE AUTHORITATIVE LAYOUT - DO NOT MODIFY DIMENSIONS
 */

import { ReactNode } from 'react'

export interface SectionProps {
  children: ReactNode
  title?: string
  subtitle?: string
  background?: 'white' | 'light' | 'green' | 'blue'
  maxWidth?: '1100px' | '700px' | '600px'
  padding?: 'default' | 'small' | 'large'
  className?: string
  centerTitle?: boolean
}

const backgroundColors = {
  white: '#ffffff',
  light: '#f6f8fb',
  green: '#16a34a',
  blue: '#2563eb'
}

const paddingValues = {
  default: '60px 20px',
  small: '40px 20px',
  large: '80px 20px'
}

export function Section({
  children,
  title,
  subtitle,
  background = 'white',
  maxWidth = '1100px',
  padding = 'default',
  className = '',
  centerTitle = true
}: SectionProps) {
  const textColor = background === 'white' || background === 'light' ? '#111827' : 'white'
  const subtitleColor = background === 'light' ? '#4b5563' : textColor

  return (
    <section
      className={className}
      style={{
        background: backgroundColors[background],
        padding: paddingValues[padding],
        color: textColor
      }}
    >
      <div style={{ maxWidth, marginLeft: 'auto', marginRight: 'auto' }}>
        {title && (
          <h2
            className={`font-bold mb-8 ${centerTitle ? 'text-center' : ''}`}
            style={{ fontSize: '24px', color: textColor }}
          >
            {title}
          </h2>
        )}
        {subtitle && (
          <p
            className={`mb-8 ${centerTitle ? 'text-center max-w-2xl mx-auto' : ''}`}
            style={{
              fontSize: background === 'green' || background === 'blue' ? '18px' : '16px',
              color: subtitleColor
            }}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}
