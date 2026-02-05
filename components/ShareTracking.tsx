'use client'

import { useState } from 'react'

interface ShareTrackingProps {
  businessId?: string
  dealId?: string
  countyId: string
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin'
  shareUrl: string
  children: (props: {
    handleShare: () => Promise<void>
    isSharing: boolean
    error: string | null
    pointsEarned: number | null
  }) => React.ReactNode
}

/**
 * ShareTracking component
 * 
 * Handles social media sharing with automatic tracking
 * 
 * Usage:
 * ```tsx
 * <ShareTracking 
 *   businessId="123" 
 *   countyId="456" 
 *   platform="facebook"
 *   shareUrl="https://example.com/business/123"
 * >
 *   {({ handleShare, isSharing }) => (
 *     <button onClick={handleShare} disabled={isSharing}>
 *       Share on Facebook
 *     </button>
 *   )}
 * </ShareTracking>
 * ```
 */
export function ShareTracking({
  businessId,
  dealId,
  countyId,
  platform,
  shareUrl,
  children,
}: ShareTrackingProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pointsEarned, setPointsEarned] = useState<number | null>(null)

  const handleShare = async () => {
    setIsSharing(true)
    setError(null)

    try {
      // Open share dialog based on platform
      const shareUrls: Record<string, string> = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
        instagram: shareUrl, // Instagram doesn't support direct sharing via URL
      }

      const platformShareUrl = shareUrls[platform]
      
      if (platform !== 'instagram') {
        // Open share window
        window.open(
          platformShareUrl,
          'share-dialog',
          'width=600,height=400,location=no,menubar=no'
        )
      }

      // Track the share event
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          dealId,
          countyId,
          platform,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to track share')
      }

      const data = await response.json()

      // Set points earned for display
      setPointsEarned(data.rewards?.pointsEarned || 0)

      // Optional: Show success message or update UI
      console.log('Share tracked successfully', data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share'
      setError(errorMessage)
      console.error('Share error:', err)
    } finally {
      setIsSharing(false)
    }
  }

  return <>{children({ handleShare, isSharing, error, pointsEarned })}</>
}
