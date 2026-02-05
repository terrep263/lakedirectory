/**
 * Voucher Email Delivery
 *
 * Sends voucher PDF to customer email.
 * Does NOT modify voucher state.
 * Email failure does NOT block voucher issuance.
 * 
 * Can be called with optional adminId for audit tracking.
 */

import { generateVoucherPDF } from './pdf'
import { getVoucherRenderData } from './renderData'
import { prisma } from '@/lib/prisma'

/**
 * Send voucher PDF to customer via email
 * Failure is logged but does not throw
 * @param voucherId - Voucher ID to send
 * @param adminId - Optional admin user ID for audit trail (if triggered by admin)
 */
export async function sendVoucherEmail(
  voucherId: string,
  adminId?: string
): Promise<void> {
  try {
    // Fetch voucher with customer reference
    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      select: {
        id: true,
        deal: {
          select: {
            title: true,
          },
        },
        purchase: {
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        account: {
          select: {
            email: true,
          },
        },
      },
    })

    if (!voucher) {
      console.warn(`[Voucher Email] Voucher not found: ${voucherId}`)
      return
    }

    // Get customer email (prefer Purchase.user.email; fallback to legacy Voucher.account.email)
    const customerEmail = voucher.purchase?.user?.email || voucher.account?.email
    if (!customerEmail) {
      console.warn(
        `[Voucher Email] No customer reference for voucher: ${voucherId}`
      )
      return
    }

    // Fetch render data for email body
    const renderData = await getVoucherRenderData(voucherId)
    if (!renderData) {
      console.warn(
        `[Voucher Email] Could not fetch render data for voucher: ${voucherId}`
      )
      return
    }

    // Generate PDF
    const pdfBuffer = await generateVoucherPDF(voucherId)

    // Get email configuration from environment
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('[Voucher Email] RESEND_API_KEY not configured')
      return
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'noreply@lakecountylocal.com'

    // Prepare email payload
    const emailPayload = {
      from: fromEmail,
      to: customerEmail,
      subject: 'Your Voucher Is Ready',
      html: generateVoucherEmailHTML(renderData),
      attachments: [
        {
          filename: `voucher-${voucherId.substring(0, 8)}.pdf`,
          content: pdfBuffer.toString('base64'),
          contentType: 'application/pdf',
        },
      ],
    }

    // Send via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(
        `[Voucher Email] Send failed for ${customerEmail}: ${error}`
      )

      // Log failed email attempt to audit trail
      await logFailedEmailAttempt(voucherId, customerEmail, error, adminId)
      return
    }

    const result = await response.json()
    console.log(
      `[Voucher Email] Sent successfully to ${customerEmail}, ID: ${result.id}`
    )

    // Log successful email
    await logSuccessfulEmail(voucherId, customerEmail, adminId)
  } catch (error) {
    // Catch any unexpected errors and log without throwing
    const errorMessage =
      error instanceof Error ? error.message : String(error)
    console.error(
      `[Voucher Email] Unexpected error for voucher ${voucherId}: ${errorMessage}`
    )
  }
}

/**
 * Generate HTML for voucher email
 */
function generateVoucherEmailHTML(renderData: {
  voucherId: string
  businessName: string
  dealTitle: string
  expiresAt: Date
}): string {
  const expirationDate = renderData.expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9fafb;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          }
          .header {
            border-bottom: 2px solid #f3f4f6;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            color: #1f2937;
            font-size: 28px;
          }
          .content {
            margin: 20px 0;
          }
          .business-section {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
          }
          .business-section strong {
            display: block;
            margin-bottom: 5px;
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
          }
          .business-name {
            font-size: 20px;
            color: #1f2937;
            margin: 10px 0;
          }
          .deal-title {
            font-size: 18px;
            color: #374151;
            margin: 15px 0 5px 0;
          }
          .expiration {
            color: #dc2626;
            font-weight: bold;
            font-size: 16px;
            margin: 15px 0;
          }
          .highlight {
            background-color: #fef3c7;
            padding: 10px;
            border-left: 4px solid #fbbf24;
            margin: 15px 0;
          }
          .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            margin-top: 20px;
            font-size: 12px;
            color: #6b7280;
          }
          .cta-button {
            display: inline-block;
            background-color: #3b82f6;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 6px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Voucher Is Ready! 🎉</h1>
          </div>

          <div class="content">
            <p>Hi there,</p>

            <p>Your voucher for a great deal has been successfully created. See the details below and the attached PDF for your voucher.</p>

            <div class="business-section">
              <strong>Business</strong>
              <div class="business-name">${renderData.businessName}</div>

              <div class="deal-title">${renderData.dealTitle}</div>

              <div class="expiration">
                Expires: ${expirationDate}
              </div>
            </div>

            <div class="highlight">
              <strong>Important:</strong> This voucher is single-use and can only be redeemed once. Present it at the business location before the expiration date.
            </div>

            <h3>How to Redeem</h3>
            <ol>
              <li>Visit the business location</li>
              <li>Show this email or the attached PDF with the QR code</li>
              <li>Present the voucher code</li>
              <li>Enjoy your discount!</li>
            </ol>

            <p>The attached PDF contains all the details you need, including a QR code for easy scanning at the business location.</p>
          </div>

          <div class="footer">
            <p><strong>Important Notice:</strong> Payment was processed directly by the business. Lake County Local does not process or store payment information.</p>
            <p>Questions? Contact the business directly or reply to this email.</p>
            <p style="margin-top: 20px; color: #999;">Lake County Local • Your Local Marketplace</p>
          </div>
        </div>
      </body>
    </html>
  `
}

/**
 * Log successful email delivery to audit trail
 */
async function logSuccessfulEmail(
  voucherId: string,
  customerEmail: string,
  adminId?: string
): Promise<void> {
  try {
    await prisma.voucherAuditLog.create({
      data: {
        voucherId,
        actorType: adminId ? 'ADMIN' : 'SYSTEM',
        action: 'EMAIL_SENT',
        metadata: {
          customerEmail,
          adminId,
          timestamp: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error(
      `[Voucher Email] Failed to log successful email for ${voucherId}:`,
      error
    )
  }
}

/**
 * Log failed email delivery attempt to audit trail
 */
async function logFailedEmailAttempt(
  voucherId: string,
  customerEmail: string,
  errorMessage: string,
  adminId?: string
): Promise<void> {
  try {
    await prisma.voucherAuditLog.create({
      data: {
        voucherId,
        actorType: adminId ? 'ADMIN' : 'SYSTEM',
        action: 'EMAIL_FAILED',
        metadata: {
          customerEmail,
          errorMessage,
          adminId,
          timestamp: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error(
      `[Voucher Email] Failed to log email failure for ${voucherId}:`,
      error
    )
  }
}
