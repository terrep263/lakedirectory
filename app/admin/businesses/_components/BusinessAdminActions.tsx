'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessStatus } from '@prisma/client'

export default function BusinessAdminActions({
  businessId,
  businessName,
  businessStatus,
  compact = false,
}: {
  businessId: string
  businessName: string
  businessStatus: BusinessStatus
  compact?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const adminToken = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('adminToken')
  }, [])

  async function changeStatus(nextStatus: BusinessStatus) {
    if (!adminToken) {
      window.alert('Missing admin token. Please sign in again.')
      router.push('/admin-login')
      return
    }

    const reason = window.prompt('Reason (optional):') || undefined

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/business/${businessId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: nextStatus, ...(reason ? { reason } : {}) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data?.error || 'Failed to change status')
        setLoading(false)
        return
      }
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      window.alert(msg)
    } finally {
      setLoading(false)
    }
  }

  async function deleteBusiness() {
    if (!adminToken) {
      window.alert('Missing admin token. Please sign in again.')
      router.push('/admin-login')
      return
    }

    const ok = window.confirm(
      `Delete business “${businessName}”?\n\nThis is a hard delete and may fail if the business has dependent records (deals, vouchers, purchases).`
    )
    if (!ok) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/businesses/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ action: 'delete', businessIds: [businessId] }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data?.error || 'Failed to delete business')
        setLoading(false)
        return
      }

      router.push('/admin/businesses/manage')
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      window.alert(msg)
    } finally {
      setLoading(false)
    }
  }

  const buttonClass = compact
    ? 'px-2 py-1 rounded text-xs font-semibold'
    : 'px-3 py-2 rounded-md text-xs font-semibold'

  return (
    <div className={`flex ${compact ? 'gap-2' : 'gap-3'} items-center`}>
      {(businessStatus === 'DRAFT' || businessStatus === 'SUSPENDED') && (
        <button
          disabled={loading}
          onClick={() => changeStatus('ACTIVE')}
          className={`${buttonClass} bg-green-600 text-white hover:bg-green-700 disabled:opacity-50`}
        >
          Activate
        </button>
      )}
      {businessStatus === 'ACTIVE' && (
        <button
          disabled={loading}
          onClick={() => changeStatus('SUSPENDED')}
          className={`${buttonClass} bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50`}
        >
          Suspend
        </button>
      )}
      <button
        disabled={loading}
        onClick={deleteBusiness}
        className={`${buttonClass} bg-red-600 text-white hover:bg-red-700 disabled:opacity-50`}
      >
        Delete
      </button>
    </div>
  )
}

