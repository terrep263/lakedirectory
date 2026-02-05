'use client'

import React, { useState } from 'react'
import { FacebookIcon, TwitterIcon, LinkedinIcon } from 'next-share'

interface ShareButtonsProps {
  businessUrl: string
  businessName: string
  businessId?: string
  dealId?: string
  userId?: string
  countyId: string
  showLabels?: boolean
}

/**
 * ShareButtons Component
 * 
 * Displays social media share buttons with automatic event tracking and rewards
 * Supports Facebook, Instagram, Twitter, and LinkedIn
 */
const ShareButtons = ({ 
  businessUrl, 
  businessName, 
  businessId, 
  dealId,
  userId, 
  countyId,
  showLabels = false 
}: ShareButtonsProps) => {
  const [loading, setLoading] = useState<string | null>(null)
  const [rewardEarned, setRewardEarned] = useState<number | null>(null)
  const [limitMessage, setLimitMessage] = useState<string | null>(null)

  const handleShare = async (platform: string) => {
    setLoading(platform)
    setRewardEarned(null)
    setLimitMessage(null)

    try {
      // Log the share event to the backend and earn rewards
      if (userId) {
        const response = await fetch('/api/internal/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            businessId: businessId || null,
            dealId: dealId || null,
            platform,
            countyId,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const pointsEarned = data.rewards?.pointsEarned || 0
          
          setRewardEarned(pointsEarned)
          
          // Show limit message if rewards weren't earned
          if (data.rewards?.limitReached && data.rewards?.limitMessage) {
            setLimitMessage(data.rewards.limitMessage)
          }
          
          // Clear notifications after 5 seconds
          setTimeout(() => {
            setRewardEarned(null)
            setLimitMessage(null)
          }, 5000)
        }
      }

      // Open the respective social media share dialog
      let shareUrl = ''
      switch (platform) {
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(businessUrl)}&quote=${encodeURIComponent(businessName)}`
          break
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(businessUrl)}&text=${encodeURIComponent(businessName)}`
          break
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(businessUrl)}`
          break
        case 'instagram':
          // Instagram doesn't support direct sharing via URL
          // Copy URL to clipboard instead
          await navigator.clipboard.writeText(businessUrl)
          alert('Link copied to clipboard! Share it on Instagram.')
          return
        default:
          break
      }

      if (shareUrl) {
        window.open(shareUrl, 'share-dialog', 'width=600,height=400')
      }
    } catch (error) {
      console.error('Error sharing:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        {/* Facebook */}
        <button
          onClick={() => handleShare('facebook')}
          disabled={loading === 'facebook'}
          className="hover:opacity-80 transition-opacity disabled:opacity-50 flex flex-col items-center gap-1"
          title="Share on Facebook"
        >
          <FacebookIcon size={32} round />
          {showLabels && <span className="text-xs text-gray-600">Facebook</span>}
        </button>

        {/* Instagram */}
        <button
          onClick={() => handleShare('instagram')}
          disabled={loading === 'instagram'}
          className="hover:opacity-80 transition-opacity disabled:opacity-50 flex flex-col items-center gap-1"
          title="Share on Instagram"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white text-xl">
            📷
          </div>
          {showLabels && <span className="text-xs text-gray-600">Instagram</span>}
        </button>

        {/* Twitter */}
        <button
          onClick={() => handleShare('twitter')}
          disabled={loading === 'twitter'}
          className="hover:opacity-80 transition-opacity disabled:opacity-50 flex flex-col items-center gap-1"
          title="Share on Twitter"
        >
          <TwitterIcon size={32} round />
          {showLabels && <span className="text-xs text-gray-600">Twitter</span>}
        </button>

        {/* LinkedIn */}
        <button
          onClick={() => handleShare('linkedin')}
          disabled={loading === 'linkedin'}
          className="hover:opacity-80 transition-opacity disabled:opacity-50 flex flex-col items-center gap-1"
          title="Share on LinkedIn"
        >
          <LinkedinIcon size={32} round />
          {showLabels && <span className="text-xs text-gray-600">LinkedIn</span>}
        </button>
      </div>
      {/* Limit Message Display */}
      {limitMessage && (
        <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
          {limitMessage}
        </div>
      )}
      {/* Reward notification */}
      {rewardEarned !== null && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 animate-fade-in">
          🎉 +{rewardEarned} points earned!
        </div>
      )}
    </div>
  )
}

export default ShareButtons
