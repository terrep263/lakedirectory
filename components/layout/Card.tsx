/**
 * Card - Authoritative Layout Component
 *
 * Card component matching ZIP layout exactly.
 * Background: white
 * Border: 1px solid #e5e7eb
 * Border-radius: 12px (rounded-xl)
 * Padding: 24px
 *
 * THIS IS THE AUTHORITATIVE LAYOUT - DO NOT MODIFY DIMENSIONS
 */

import { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  title?: string
  className?: string
  hover?: boolean
}

export function Card({
  children,
  title,
  className = '',
  hover = false
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl ${hover ? 'hover:shadow-lg transition' : ''} ${className}`}
      style={{
        padding: '24px',
        border: '1px solid #e5e7eb'
      }}
    >
      {title && (
        <h3 className="font-bold mt-0 mb-3" style={{ fontSize: '20px' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
