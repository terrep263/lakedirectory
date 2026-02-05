'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ArchiveButton({ businessId }: { businessId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleArchive = async () => {
    if (!confirm('Archive this business? It will be marked as inactive.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/businesses/${businessId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to archive business')
      }

      router.refresh()
    } catch (error) {
      alert('Error archiving business')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleArchive}
      disabled={loading}
      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium disabled:opacity-50"
    >
      {loading ? 'Archiving...' : 'Archive'}
    </button>
  )
}

export function RestoreButton({ businessId }: { businessId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRestore = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/businesses/${businessId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to restore business')
      }

      router.refresh()
    } catch (error) {
      alert('Error restoring business')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRestore}
      disabled={loading}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
    >
      {loading ? 'Restoring...' : 'Restore'}
    </button>
  )
}

export function DeleteButton({ businessId, businessName }: { businessId: string; businessName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    const confirmation = prompt(
      `Type "${businessName}" to permanently delete this business:`
    )

    if (confirmation !== businessName) {
      alert('Confirmation did not match. Deletion cancelled.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/businesses/${businessId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete business')
      }

      router.push('/admin/businesses')
    } catch (error) {
      alert('Error deleting business')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
    >
      {loading ? 'Deleting...' : 'Delete Permanently'}
    </button>
  )
}
