/**
 * SearchSection - Authoritative Layout Component
 *
 * Search section matching ZIP layout exactly.
 * Background: white
 * Padding: 40px 20px
 * Search input max-width: 700px centered
 *
 * THIS IS THE AUTHORITATIVE LAYOUT - DO NOT MODIFY DIMENSIONS
 */

export interface Badge {
  text: string
}

export interface SearchSectionProps {
  title?: string
  placeholder?: string
  buttonText?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  onSearch?: () => void
  badges?: Badge[]
  className?: string
}

export function SearchSection({
  title = 'Find Local Businesses & Deals',
  placeholder = 'Search businesses or deals...',
  buttonText = 'Search',
  searchValue = '',
  onSearchChange,
  onSearch,
  badges = [
    { text: '100% Free Listings' },
    { text: 'All 15 Cities' },
    { text: 'Growing Daily' }
  ],
  className = ''
}: SearchSectionProps) {
  return (
    <section
      className={`bg-white text-center ${className}`}
      style={{ padding: '40px 20px' }}
    >
      <h2 className="font-bold mb-6" style={{ fontSize: '24px' }}>
        {title}
      </h2>

      <div className="flex" style={{ maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
          className="flex-1"
          style={{
            padding: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '6px 0 0 6px',
            fontSize: '16px'
          }}
        />
        <button
          onClick={onSearch}
          className="font-bold hover:opacity-90 cursor-pointer"
          style={{
            padding: '14px 24px',
            border: 'none',
            background: '#2563eb',
            color: 'white',
            borderRadius: '0 6px 6px 0'
          }}
        >
          {buttonText}
        </button>
      </div>

      {badges.length > 0 && (
        <div className="mt-4 flex justify-center gap-2 flex-wrap">
          {badges.map((badge, index) => (
            <span
              key={index}
              className="inline-block"
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '14px',
                margin: '4px'
              }}
            >
              {badge.text}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
