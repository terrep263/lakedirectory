import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'

/**
 * Correlation ID helper for request tracing.
 * - Honors inbound `x-request-id` if present
 * - Falls back to a generated UUID
 */
export function getCorrelationId(request?: Pick<NextRequest, 'headers'>): string {
  const headerValue =
    request?.headers?.get?.('x-request-id') ||
    request?.headers?.get?.('x-correlation-id') ||
    null

  if (headerValue && headerValue.trim()) return headerValue.trim()
  return randomUUID()
}

