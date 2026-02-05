'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type CountyAdminAccessRow = {
  accessId: string
  adminId: string
  email: string
  role: string
  status: string
  grantedAt: string
  grantedBy: string
}

type AdminIdentityRow = {
  id: string
  email: string | null
  status: string
  createdAt: string
}

export default function AdminAccessClient({ countyId }: { countyId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CountyAdminAccessRow[]>([])

  const [adminIdentities, setAdminIdentities] = useState<AdminIdentityRow[]>([])
  const [selectedAdminId, setSelectedAdminId] = useState('')

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('adminToken')
  }, [])

  const load = useCallback(async () => {
    if (!token) {
      setError('Missing adminToken in localStorage. Please log in again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [accessRes, adminsRes] = await Promise.all([
        fetch(`/api/super-admin/counties/${countyId}/admins`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/super-admin/admin-identities', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const accessJson = await accessRes.json().catch(() => ({}))
      if (!accessRes.ok || !accessJson?.success) {
        throw new Error(
          accessJson?.error || `Failed to load county admins (${accessRes.status})`
        )
      }

      const adminsJson = await adminsRes.json().catch(() => ({}))
      if (!adminsRes.ok || !adminsJson?.success) {
        throw new Error(
          adminsJson?.error || `Failed to load admin identities (${adminsRes.status})`
        )
      }

      setRows(Array.isArray(accessJson.data) ? accessJson.data : [])
      const identities = Array.isArray(adminsJson.data) ? adminsJson.data : []
      setAdminIdentities(identities)
      if (!selectedAdminId && identities.length > 0) {
        setSelectedAdminId(identities[0].id)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load admin access')
    } finally {
      setLoading(false)
    }
  }, [countyId, selectedAdminId, token])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countyId])

  const grant = useCallback(async () => {
    if (!token) {
      setError('Missing adminToken in localStorage. Please log in again.')
      return
    }
    if (!selectedAdminId) {
      setError('Select an admin to grant access to.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/counties/${countyId}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminId: selectedAdminId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Failed to grant access (${res.status})`)
      }
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to grant access')
    } finally {
      setSaving(false)
    }
  }, [countyId, load, selectedAdminId, token])

  const revoke = useCallback(
    async (adminId: string) => {
      if (!token) {
        setError('Missing adminToken in localStorage. Please log in again.')
        return
      }
      if (!confirm('Revoke this admin’s access to this county?')) return

      setSaving(true)
      setError(null)
      try {
        const res = await fetch(`/api/super-admin/counties/${countyId}/admins`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ adminId }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || `Failed to revoke access (${res.status})`)
        }
        await load()
      } catch (e: any) {
        setError(e?.message || 'Failed to revoke access')
      } finally {
        setSaving(false)
      }
    },
    [countyId, load, token]
  )

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              County admin access
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Grant/revoke which admins may operate this county in the Admin UI.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/super-admin/counties/${countyId}`}
              className="px-3 py-2 rounded-md bg-white border border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              ← Back
            </Link>
            <button
              onClick={() => void load()}
              className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900">Grant access</h3>
        <div className="mt-3 flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600">
              Admin identity
            </label>
            <select
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {adminIdentities.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.email || a.id).toString()}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void grant()}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Working…' : 'Grant access'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Note: only identities with role <span className="font-mono">ADMIN</span>{' '}
          are listed (per API rules).
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Current access</h3>
          <p className="text-xs text-gray-500">
            {loading ? 'Loading…' : `${rows.length} admins`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-5 py-3">Admin</th>
                <th className="text-left px-5 py-3">Role</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Granted</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.accessId}>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900">{r.email}</div>
                    <div className="text-xs font-mono text-gray-500">{r.adminId}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{r.role}</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.status}</td>
                  <td className="px-5 py-3 text-xs text-gray-600">
                    {new Date(r.grantedAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => void revoke(r.adminId)}
                      disabled={saving}
                      className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-sm text-gray-600"
                    colSpan={5}
                  >
                    No admins have access yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

