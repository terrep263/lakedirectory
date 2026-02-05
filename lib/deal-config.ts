/**
 * Deal Configuration Model
 * 
 * Purpose: Enforce deal business rules without modifying Schema v2
 * 
 * Requirements:
 * - Exactly one canonical description per deal
 * - Required voucher expiration duration
 * - Optional time-of-day validity windows
 * - Platform-defined maximum expiration window
 * - Rejection of values exceeding maximum
 * - No open-ended or indefinite vouchers
 * - Expiration enforcement BEFORE voucher issuance
 * 
 * Storage: JSON metadata field (compatible with Schema v2)
 */

export interface DealConfig {
  // Canonical description (single source of truth)
  canonicalDescription: string
  
  // Voucher expiration (required)
  voucherExpirationHours: number
  
  // Optional time-of-day validity windows
  validityWindows?: TimeWindow[]
}

export interface TimeWindow {
  dayOfWeek: DayOfWeek
  startTime: string // HH:MM format (24-hour)
  endTime: string   // HH:MM format (24-hour)
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

// Export DayOfWeek as object for convenience
export const DayOfWeek = {
  MONDAY: 'MONDAY' as DayOfWeek,
  TUESDAY: 'TUESDAY' as DayOfWeek,
  WEDNESDAY: 'WEDNESDAY' as DayOfWeek,
  THURSDAY: 'THURSDAY' as DayOfWeek,
  FRIDAY: 'FRIDAY' as DayOfWeek,
  SATURDAY: 'SATURDAY' as DayOfWeek,
  SUNDAY: 'SUNDAY' as DayOfWeek
}

// Platform-defined maximum expiration window
export const MAX_VOUCHER_EXPIRATION_HOURS = 2160 // 90 days

// Validation errors
export class DealConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DealConfigError'
  }
}

/**
 * Validate deal configuration
 * 
 * Enforces all platform rules before deal publication
 */
export function validateDealConfig(config: Partial<DealConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 1. Canonical description required
  if (!config.canonicalDescription || config.canonicalDescription.trim().length === 0) {
    errors.push('Canonical description is required')
  } else if (config.canonicalDescription.trim().length < 10) {
    errors.push('Canonical description must be at least 10 characters')
  }

  // 2. Expiration duration required
  if (config.voucherExpirationHours === undefined || config.voucherExpirationHours === null) {
    errors.push('Voucher expiration hours is required')
  } else {
    // 3. Expiration duration must be positive (no indefinite vouchers)
    if (config.voucherExpirationHours <= 0) {
      errors.push('Voucher expiration must be greater than 0 (no indefinite vouchers)')
    }

    // 4. Expiration duration must not exceed platform maximum
    if (config.voucherExpirationHours > MAX_VOUCHER_EXPIRATION_HOURS) {
      errors.push(
        `Voucher expiration cannot exceed ${MAX_VOUCHER_EXPIRATION_HOURS} hours (90 days)`
      )
    }

    // 5. Expiration duration must be whole number
    if (!Number.isInteger(config.voucherExpirationHours)) {
      errors.push('Voucher expiration must be a whole number of hours')
    }
  }

  // 6. Validate time windows if provided
  if (config.validityWindows && config.validityWindows.length > 0) {
    config.validityWindows.forEach((window, index) => {
      const windowErrors = validateTimeWindow(window, index)
      errors.push(...windowErrors)
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate a single time window
 */
function validateTimeWindow(window: TimeWindow, index: number): string[] {
  const errors: string[] = []
  const prefix = `Time window ${index + 1}:`

  // Validate day of week
  const validDays: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  if (!window.dayOfWeek || !validDays.includes(window.dayOfWeek)) {
    errors.push(`${prefix} Invalid day of week`)
  }

  // Validate start time format
  if (!window.startTime || !isValidTimeFormat(window.startTime)) {
    errors.push(`${prefix} Start time must be in HH:MM format (24-hour)`)
  }

  // Validate end time format
  if (!window.endTime || !isValidTimeFormat(window.endTime)) {
    errors.push(`${prefix} End time must be in HH:MM format (24-hour)`)
  }

  // Validate time range
  if (window.startTime && window.endTime && isValidTimeFormat(window.startTime) && isValidTimeFormat(window.endTime)) {
    const startMinutes = timeToMinutes(window.startTime)
    const endMinutes = timeToMinutes(window.endTime)
    
    if (startMinutes >= endMinutes) {
      errors.push(`${prefix} End time must be after start time`)
    }
  }

  return errors
}

/**
 * Check if time string matches HH:MM format (24-hour)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return timeRegex.test(time)
}

/**
 * Convert HH:MM time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Check if a voucher issuance would fall within validity windows
 * 
 * If no windows defined, voucher is valid at any time
 * If windows defined, voucher must match at least one window
 */
export function isValidIssuanceTime(config: DealConfig, timestamp: Date = new Date()): boolean {
  // No windows = always valid
  if (!config.validityWindows || config.validityWindows.length === 0) {
    return true
  }

  const dayOfWeek = getDayOfWeek(timestamp)
  const timeString = formatTime(timestamp)
  const currentMinutes = timeToMinutes(timeString)

  // Check if current time matches any validity window
  return config.validityWindows.some(window => {
    if (window.dayOfWeek !== dayOfWeek) {
      return false
    }

    const startMinutes = timeToMinutes(window.startTime)
    const endMinutes = timeToMinutes(window.endTime)

    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  })
}

/**
 * Get day of week from Date object
 */
function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  return days[date.getDay()]
}

/**
 * Format Date object as HH:MM string
 */
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Calculate voucher expiration timestamp
 */
export function calculateVoucherExpiration(config: DealConfig, issuedAt: Date = new Date()): Date {
  const expirationDate = new Date(issuedAt)
  expirationDate.setHours(expirationDate.getHours() + config.voucherExpirationHours)
  return expirationDate
}

/**
 * Check if a voucher is expired
 */
export function isVoucherExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now >= expiresAt
}
