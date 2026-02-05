'use client'

import { useState } from 'react'

export function ImportButton() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleImport() {
    if (!confirm('Start bulk import from Google Places for all Lake County cities and categories? This may take several minutes.')) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/business/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ radiusMeters: 40000 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setMessage({
        type: 'success',
        text: `✓ Import complete! Found: ${data.stats.totalFound}, Created: ${data.stats.createdCount}, Skipped: ${data.stats.skippedCount}, Errors: ${data.stats.errorCount}`,
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: `✗ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleImport}
        disabled={loading}
        className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '⏳ Importing...' : '📥 Import from Google Places'}
      </button>
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
