export type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs?: number
}

/**
 * fetch() with AbortController timeout.
 * Does not throw on non-2xx responses; callers should check res.ok.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = init

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

