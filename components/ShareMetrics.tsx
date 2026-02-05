'use client'

import React, { useEffect, useState } from 'react'

interface ShareMetricsProps {
  businessId: string
}

const ShareMetrics = ({ businessId }: ShareMetricsProps) => {
  const [facebookShares, setFacebookShares] = useState(0)
  const [twitterShares, setTwitterShares] = useState(0)
  const [whatsappShares, setWhatsappShares] = useState(0)
  const [totalShares, setTotalShares] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/share-metrics/${businessId}`)
      .then((res) => res.json())
      .then((data) => {
        setFacebookShares(data.facebookShares)
        setTwitterShares(data.twitterShares)
        setWhatsappShares(data.whatsappShares)
        setTotalShares(data.totalShares)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch share metrics:', error)
        setLoading(false)
      })
  }, [businessId])

  if (loading) {
    return <div className="text-gray-600 text-sm">Loading share metrics...</div>
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-1">Facebook Shares</h3>
        <p className="text-2xl font-bold text-blue-600">{facebookShares}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-1">Twitter Shares</h3>
        <p className="text-2xl font-bold text-sky-500">{twitterShares}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-1">WhatsApp Shares</h3>
        <p className="text-2xl font-bold text-green-600">{whatsappShares}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-600 mb-1">Total Shares</h3>
        <p className="text-2xl font-bold text-gray-900">{totalShares}</p>
      </div>
    </div>
  )
}

export default ShareMetrics
