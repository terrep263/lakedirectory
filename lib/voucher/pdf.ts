/**
 * Voucher PDF Generation
 *
 * Generates in-memory PDF vouchers with deterministic output.
 * Does NOT store PDFs permanently.
 * Does NOT modify voucher state.
 */

import { PDFDocument, rgb } from 'pdf-lib'
import * as QRCode from 'qrcode'
import { getVoucherRenderData } from './renderData'

/**
 * Generate a voucher PDF as a Buffer (in-memory, no storage)
 */
export async function generateVoucherPDF(
  voucherId: string
): Promise<Buffer> {
  // Fetch render data
  const renderData = await getVoucherRenderData(voucherId)
  if (!renderData) {
    throw new Error(`Voucher not found: ${voucherId}`)
  }

  // Create PDF document
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // US Letter size
  const { width, height } = page.getSize()

  // Set default font
  const fontSize = 12
  const smallFontSize = 10
  const titleFontSize = 24
  const sectionFontSize = 14

  let yPos = height - 40 // Start from top

  // =========================================================================
  // Business Header
  // =========================================================================

  // Business name (large, bold)
  page.drawText(renderData.businessName, {
    x: 40,
    y: yPos,
    size: titleFontSize,
    color: rgb(0, 0, 0),
  })
  yPos -= 40

  // Business logo (if present)
  if (renderData.businessLogo) {
    try {
      // Attempt to embed logo as base64 or URL
      // For now, skip if it's a URL; only support embedded images
      if (renderData.businessLogo.startsWith('data:')) {
        const base64Data = renderData.businessLogo.split(',')[1]
        const logoBytes = Buffer.from(base64Data, 'base64')
        const embeddedImage = await pdfDoc.embedPng(logoBytes)
        page.drawImage(embeddedImage, {
          x: 40,
          y: yPos - 60,
          width: 80,
          height: 60,
        })
        yPos -= 80
      } else {
        // URL or other format - skip for determinism
        yPos -= 20
      }
    } catch {
      // Logo rendering failed, continue without it
      yPos -= 20
    }
  }

  yPos -= 20

  // =========================================================================
  // Deal Information
  // =========================================================================

  // Deal title (prominent)
  page.drawText(renderData.dealTitle, {
    x: 40,
    y: yPos,
    size: sectionFontSize,
    color: rgb(0.2, 0.2, 0.2),
  })
  yPos -= 30

  // Deal description (if present)
  if (renderData.dealDescription) {
    const maxWidth = width - 80
    const wrappedText = wrapText(
      renderData.dealDescription,
      maxWidth,
      fontSize
    )

    page.drawText(wrappedText, {
      x: 40,
      y: yPos,
      size: fontSize,
      color: rgb(0.4, 0.4, 0.4),
    })

    yPos -= wrappedText.split('\n').length * 16 + 10
  }

  yPos -= 20

  // =========================================================================
  // Expiration Date
  // =========================================================================

  const expirationDate = renderData.expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  page.drawText('Expires:', {
    x: 40,
    y: yPos,
    size: smallFontSize,
    color: rgb(0.5, 0.5, 0.5),
  })
  page.drawText(expirationDate, {
    x: 120,
    y: yPos,
    size: sectionFontSize,
    color: rgb(1, 0, 0), // Red for expiration
  })
  yPos -= 35

  // =========================================================================
  // QR Code
  // =========================================================================

  try {
    const qrImage = await (QRCode as any).toDataURL(renderData.qrToken, {
      errorCorrectionLevel: 'H',
      width: 200,
      margin: 2,
    })

    const qrBase64 = qrImage.split(',')[1]
    const qrBytes = Buffer.from(qrBase64, 'base64')
    const embeddedQR = await pdfDoc.embedPng(qrBytes)

    const qrSize = 120
    const qrX = width / 2 - qrSize / 2
    page.drawImage(embeddedQR, {
      x: qrX,
      y: yPos - qrSize,
      width: qrSize,
      height: qrSize,
    })

    yPos -= qrSize + 30
  } catch (error) {
    // QR generation failed - continue without QR
    page.drawText('[QR Code Generation Failed]', {
      x: 40,
      y: yPos,
      size: fontSize,
      color: rgb(1, 0, 0),
    })
    yPos -= 30
  }

  // =========================================================================
  // Human-Friendly Voucher Code
  // =========================================================================

  // Extract first 16 chars of voucher ID for display
  const voucherCode = renderData.voucherId.substring(0, 16).toUpperCase()

  page.drawText('Voucher Code:', {
    x: 40,
    y: yPos,
    size: smallFontSize,
    color: rgb(0.5, 0.5, 0.5),
  })
  page.drawText(voucherCode, {
    x: 150,
    y: yPos,
    size: fontSize,
    color: rgb(0, 0, 0),
  })
  yPos -= 30

  // =========================================================================
  // Redemption Instructions
  // =========================================================================

  const instructionsTitle = 'How to Redeem'
  page.drawText(instructionsTitle, {
    x: 40,
    y: yPos,
    size: sectionFontSize,
    color: rgb(0.2, 0.2, 0.2),
  })
  yPos -= 25

  const instructions = [
    '1. Visit the business location',
    '2. Show this voucher or present the QR code',
    '3. Voucher is valid one time only',
    '4. Must be used before expiration date',
  ]

  for (const instruction of instructions) {
    page.drawText(instruction, {
      x: 50,
      y: yPos,
      size: smallFontSize,
      color: rgb(0.3, 0.3, 0.3),
    })
    yPos -= 16
  }

  yPos -= 20

  // =========================================================================
  // Legal Footer
  // =========================================================================

  const legalText =
    'Payment was processed directly by the business.\nLake County Local does not process or store payment information.'

  page.drawText(legalText, {
    x: 40,
    y: yPos,
    size: 9,
    color: rgb(0.6, 0.6, 0.6),
  })

  // =========================================================================
  // Serialize to Buffer
  // =========================================================================

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Wrap text to fit within a specified width
 * Simple line-breaking algorithm
 */
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number
): string {
  // Approximate character width (varies by font, but close enough)
  const charWidth = fontSize * 0.6

  const maxCharsPerLine = Math.floor(maxWidth / charWidth)
  const lines: string[] = []

  let currentLine = ''
  const words = text.split(' ')

  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine.trim())
      }
      currentLine = word + ' '
    } else {
      currentLine += word + ' '
    }
  }

  if (currentLine) {
    lines.push(currentLine.trim())
  }

  return lines.join('\n')
}
