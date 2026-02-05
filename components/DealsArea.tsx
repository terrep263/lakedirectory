'use client';

import { useState, useEffect } from 'react';

interface Deal {
  id: string;
  title: string;
  description: string;
  type: string;
  value: string;
  expiresAt: string;
}

interface DealsAreaProps {
  businessId: string;
  userId?: string;
}

/**
 * DealsArea Component
 * Displays available deals for a business and allows users to purchase them
 */
export default function DealsArea({ businessId, userId }: DealsAreaProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingDealId, setPurchasingDealId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Fetch available deals for the business
    fetch(`/api/business/${businessId}/deals`)
      .then((res) => res.json())
      .then((data) => {
        setDeals(data.deals || []);
      })
      .catch((error) => {
        console.error('Error fetching deals:', error);
        setDeals([]);
      })
      .finally(() => setLoading(false));
  }, [businessId]);

  const handlePurchaseDeal = async (dealId: string) => {
    if (!userId) {
      setMessage({ type: 'error', text: 'Please sign in to purchase deals' });
      return;
    }

    setPurchasingDealId(dealId);
    setMessage(null);

    try {
      const response = await fetch('/api/deals/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealId,
          userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Deal purchased! Check your account for the voucher.`,
        });
        // Clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to purchase deal',
        });
      }
    } catch (error) {
      console.error('Error purchasing deal:', error);
      setMessage({
        type: 'error',
        text: 'Failed to purchase deal. Please try again.',
      });
    } finally {
      setPurchasingDealId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading deals...
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div style={{ padding: '24px', color: '#6b7280' }}>
        No deals available at the moment.
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
        Available Deals
      </h2>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '14px',
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {deals.map((deal) => (
          <div
            key={deal.id}
            style={{
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#ffffff',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                {deal.title}
              </h4>
              {deal.description && (
                <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>
                  {deal.description}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {deal.type && (
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: '#f0fdf4',
                    color: '#15803d',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  {deal.type}
                </span>
              )}
              {deal.value && (
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  Value: {deal.value}
                </span>
              )}
              {deal.expiresAt && (
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: '#f3e8ff',
                    color: '#6b21a8',
                    fontSize: '12px',
                    fontWeight: '500',
                  }}
                >
                  Expires: {new Date(deal.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <button
              onClick={() => handlePurchaseDeal(deal.id)}
              disabled={purchasingDealId === deal.id}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                background: purchasingDealId === deal.id ? '#d1d5db' : '#10b981',
                color: 'white',
                border: 'none',
                fontWeight: '500',
                cursor: purchasingDealId === deal.id ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: purchasingDealId === deal.id ? 0.7 : 1,
              }}
            >
              {purchasingDealId === deal.id ? 'Processing...' : 'Purchase Deal'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
