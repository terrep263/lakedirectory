/**
 * CTASection - Authoritative Layout Component
 *
 * Call-to-action bands matching ZIP layout exactly.
 * Full-width colored background
 * Centered inner container max-w-2xl
 * Padding: 60px 20px (default) or 40px 20px (compact)
 *
 * THIS IS THE AUTHORITATIVE LAYOUT - DO NOT MODIFY DIMENSIONS
 */

import { ReactNode } from 'react'
import Link from 'next/link'

export interface CTAButton {
  text: string
  href: string
  variant?: 'primary' | 'secondary'
}

export interface CTASectionProps {
  title: string
  subtitle?: string
  description?: string
  buttons?: CTAButton[]
  background?: 'green' | 'blue'
  compact?: boolean
  children?: ReactNode
  className?: string
}

export function CTASection({
  title,
  subtitle,
  description,
  buttons = [],
  background = 'green',
  compact = false,
  children,
  className = ''
}: CTASectionProps) {
  const bgColor = background === 'green' ? '#16a34a' : '#2563eb'
  const buttonBg = 'white'
  const buttonColor = bgColor

  return (
    <section
      className={`text-white text-center ${className}`}
      style={{
        background: bgColor,
        padding: compact ? '40px 20px' : '60px 20px'
      }}
    >
      <h2 className="font-bold mb-4" style={{ fontSize: compact ? '24px' : '36px' }}>
        {title}
      </h2>

      {subtitle && (
        <p className="mb-4 mx-auto" style={{ fontSize: '18px', maxWidth: '42rem' }}>
          {subtitle}
        </p>
      )}

      {description && (
        <p
          className="mb-8 mx-auto"
          style={{
            fontSize: '16px',
            maxWidth: '42rem',
            color: background === 'green' ? 'rgba(187, 247, 208, 1)' : 'rgba(191, 219, 254, 1)'
          }}
        >
          {description}
        </p>
      )}

      {buttons.length > 0 && (
        <div>
          {buttons.map((button, index) => (
            <Link
              key={index}
              href={button.href}
              className="inline-block font-bold hover:opacity-90"
              style={{
                background: buttonBg,
                color: buttonColor,
                padding: '12px 20px',
                borderRadius: '6px',
                margin: '10px'
              }}
            >
              {button.text}
            </Link>
          ))}
        </div>
      )}

      {children}
    </section>
  )
}
