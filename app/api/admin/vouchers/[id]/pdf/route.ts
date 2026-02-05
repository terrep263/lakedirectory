import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { generateVoucherPDF } from '@/lib/voucher/pdf'

async function requireAdminCookie(request: NextRequest): Promise<boolean> {
  // Uses existing admin session cookie format: session=admin-<accountId>
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')
  if (!sessionToken) return false

  const sessionValue = sessionToken.value
  if (!sessionValue.startsWith('admin-')) return false

  const adminAccountId = sessionValue.replace('admin-', '')
  const account = await prisma.account.findUnique({
    where: { id: adminAccountId },
    select: { role: true },
  })

  return !!account && account.role === 'ADMIN'
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ok = await requireAdminCookie(request)
  if (!ok) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await context.params

  try {
    const pdf = await generateVoucherPDF(id)
    // Ensure PDF bytes satisfy the Web Response BodyInit typing (use Uint8Array, not Buffer).
    const body = new Uint8Array(pdf as unknown as ArrayLike<number>)
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=\"voucher-${id}.pdf\"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to generate PDF'
    return new Response(msg, { status: 400 })
  }
}

