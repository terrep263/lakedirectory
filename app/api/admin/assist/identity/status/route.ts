import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminContext, adminFailure, logAdminAction } from '@/lib/admin'

type Body = {
  email: string
  nextStatus: 'ACTIVE' | 'SUSPENDED'
  reason: string
}

function normEmail(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : ''
}

export async function PATCH(request: NextRequest) {
  const adminResult = await requireAdminContext(request)
  if (!adminResult.success) return adminFailure(adminResult)

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = normEmail(body.email)
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const nextStatus = body.nextStatus

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
  if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 })
  if (nextStatus !== 'ACTIVE' && nextStatus !== 'SUSPENDED') {
    return NextResponse.json({ error: 'nextStatus must be ACTIVE or SUSPENDED' }, { status: 400 })
  }

  const identity = await prisma.userIdentity.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, status: true },
  })
  if (!identity) return NextResponse.json({ error: 'Identity not found' }, { status: 404 })

  // Non-money support only: never suspend admins via this tool.
  if (identity.role === 'ADMIN' || identity.role === 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Not allowed for admin identities' }, { status: 403 })
  }

  if (identity.status === nextStatus) {
    return NextResponse.json({ success: true, identity, unchanged: true })
  }

  const updated = await prisma.userIdentity.update({
    where: { id: identity.id },
    data: { status: nextStatus },
    select: { id: true, email: true, role: true, status: true },
  })

  await logAdminAction(
    adminResult.data.id,
    'ADMIN_ASSIST_IDENTITY_STATUS_CHANGED',
    'IDENTITY',
    updated.id,
    {
      email: updated.email,
      role: updated.role,
      beforeStatus: identity.status,
      afterStatus: updated.status,
      reason,
    }
  )

  return NextResponse.json({ success: true, identity: updated })
}

