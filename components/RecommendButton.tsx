'use client';

import { useState, useEffect } from 'react';

interface RecommendButtonProps {
  businessId: string;
  businessName: string;
  initialCount?: number;
  userId?: string;
}

/**
 * Recommend Business Button (Rewards System)
 * Allows users to recommend a business and earn reward points
 * Displays recommendation count for social proof
 * Enforces one recommendation per userId
 */
export default function RecommendButton({ businessId, businessName, initialCount = 0, userId }: RecommendButtonProps) {
  const [isRecommended, setIsRecommended] = useState(false);
  const [recommendCount, setRecommendCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);

  useEffect(() => {
    // Try to get userId from localStorage if not provided
    if (!currentUserId && typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        setCurrentUserId(storedUserId);
      }
    }
  }, [currentUserId]);

  const handleRecommend = async () => {
    if (loading) return;

    if (!currentUserId) {
      setMessage('Please sign in to recommend this business');
      return;
    }

    setLoading(true);
    setMessage(null);
    setRewardPoints(null);

    try {
      const response = await fetch('/api/business/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          userId: currentUserId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsRecommended(true);
        setRecommendCount(data.recommendCount);
        setRewardPoints(data.rewardPoints || 0);
        setMessage(`Thank you! You earned ${data.rewardPoints || 0} reward points!`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setMessage(null);
          setRewardPoints(null);
        }, 5000);
      } else {
        // Already recommended
        setMessage(data.message || 'You have already recommended this business');
        setRecommendCount(data.recommendCount || recommendCount);
      }
    } catch (error) {
      console.error('Error recommending business:', error);
      setMessage('Unable to submit recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Recommendation Count Display - Prominent for local customer info */}
      <div 
        className="inline-flex items-center gap-3 px-6 py-4 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
        <div>
          <div className="text-3xl font-bold text-white">{recommendCount}</div>
          <div className="text-sm text-white opacity-90">
            {recommendCount === 1 ? 'Local Recommendation' : 'Local Recommendations'}
          </div>
        </div>
      </div>

      {/* Recommend Action Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRecommend}
          disabled={loading || isRecommended}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
          style={{
            background: isRecommended ? '#10b981' : '#2563eb',
            color: 'white',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          {isRecommended ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Recommended!
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              {loading ? 'Recommending...' : 'Recommend & Earn 3 Points'}
            </>
          )}
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div 
          className="px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
          style={{
            background: isRecommended ? '#d1fae5' : '#fef3c7',
            color: isRecommended ? '#065f46' : '#92400e',
            border: `1px solid ${isRecommended ? '#86efac' : '#fbbf24'}`,
          }}
        >
          {rewardPoints !== null && (
            <span className="text-lg">🎉</span>
          )}
          {message}
        </div>
      )}
    </div>
  );
}
