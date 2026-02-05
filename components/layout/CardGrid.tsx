/**
 * CardGrid - Authoritative Layout Component
 *
 * Grid layout for cards matching ZIP layout exactly.
 * Uses CSS Grid with responsive breakpoints
 * Consistent gap spacing
 *
 * THIS IS THE AUTHORITATIVE LAYOUT - DO NOT MODIFY DIMENSIONS
 */

import { ReactNode } from 'react'

export interface CardGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4 | 5 | 6
  gap?: 'small' | 'medium' | 'large'
  className?: string
}

export function CardGrid({
  children,
  columns = 3,
  gap = 'medium',
  className = ''
}: CardGridProps) {
  const gapValues = {
    small: '12px',
    medium: '20px',
    large: '24px'
  }

  const columnClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  }

  return (
    <div
      className={`grid ${columnClasses[columns]} ${className}`}
      style={{ gap: gapValues[gap] }}
    >
      {children}
    </div>
  )
}
