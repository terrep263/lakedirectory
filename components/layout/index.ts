/**
 * Layout Components - Authoritative Exports
 *
 * These components define the AUTHORITATIVE layout system.
 * All layout dimensions come from the lcl.zip reference.
 *
 * STRICT RULES:
 * - No new container widths
 * - No alternative spacing systems
 * - No full-bleed content without inner containers
 * - No mixed alignment strategies
 *
 * Use these components for all page layouts.
 * Use shadcn/ui for interactive components INSIDE these layouts.
 */

export { Section } from './Section'
export type { SectionProps } from './Section'

export { HeroSection } from './HeroSection'
export type { HeroSectionProps } from './HeroSection'

export { SearchSection } from './SearchSection'
export type { SearchSectionProps, Badge } from './SearchSection'

export { CTASection } from './CTASection'
export type { CTASectionProps, CTAButton } from './CTASection'

export { CardGrid } from './CardGrid'
export type { CardGridProps } from './CardGrid'

export { Card } from './Card'
export type { CardProps } from './Card'
