import { NextResponse } from 'next/server'

export type ApiErrorPayload = {
  success: false
  error: string
  errorCode?: string
  correlationId?: string
  details?: unknown
}

export function apiError(
  status: number,
  payload: Omit<ApiErrorPayload, 'success'> & { success?: false }
): NextResponse<ApiErrorPayload> {
  return NextResponse.json(
    {
      success: false,
      error: payload.error,
      errorCode: payload.errorCode,
      correlationId: payload.correlationId,
      details: payload.details,
    },
    { status }
  )
}

