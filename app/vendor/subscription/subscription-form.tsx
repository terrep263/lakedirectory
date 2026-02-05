'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, XCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SubscriptionFormProps {
  plan: 'founders-free' | 'basic' | 'pro' | 'cancel';
}

export default function SubscriptionForm({ plan }: SubscriptionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (plan === 'cancel') {
        const response = await fetch('/api/subscriptions/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to cancel subscription');
        }

        router.refresh();
        alert('Subscription canceled successfully');
      } else {
        const response = await fetch('/api/subscriptions/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ plan }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to activate subscription');
        }

        router.refresh();
        router.push('/vendor/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="submit"
        disabled={loading}
        variant={plan === 'cancel' ? 'destructive' : 'default'}
        className={`w-full h-11 ${plan !== 'cancel' ? 'bg-lake-blue hover:bg-lake-blue-dark' : ''}`}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : plan === 'cancel' ? (
          <>
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Subscription
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Activate Plan
          </>
        )}
      </Button>
    </form>
  );
}
