import crypto from 'crypto'

export function generateQRToken(): string {
  const timestamp = Date.now().toString(36)
  const randomBytes = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .createHash('sha256')
    .update(`${timestamp}-${randomBytes}-${crypto.randomBytes(8).toString('hex')}`)
    .digest('hex')
    .substring(0, 32)
  
  return `VCH-${timestamp}-${hash}`.toUpperCase()
}

export function generateCUID(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = crypto.randomBytes(12).toString('base64url')
  return `${timestamp}${randomPart}`
}

export function isValidExternalRef(ref: string): boolean {
  return typeof ref === 'string' && ref.length > 0 && ref.length <= 500
}
