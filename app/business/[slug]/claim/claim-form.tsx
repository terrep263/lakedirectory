'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ClaimFormProps {
  business: {
    id: string;
    name: string;
    slug: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  };
}

export function ClaimForm({ business }: ClaimFormProps) {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/claims/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          ownerName,
          businessEmail,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit claim');
      }

      // Redirect to success page
      router.push(`/business/${business.slug || business.id}/claim/success`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="ownerName">
          Your Full Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ownerName"
          type="text"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
          disabled={loading}
          placeholder="John Doe"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Legal name of the business owner or authorized representative
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessEmail">
          Business Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="businessEmail"
          type="email"
          value={businessEmail}
          onChange={(e) => setBusinessEmail(e.target.value)}
          required
          disabled={loading}
          placeholder="owner@business.com"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Must be a business-domain email (e.g., @{business.name.toLowerCase().replace(/\s+/g, '')}.com)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Business Phone <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          disabled={loading}
          placeholder="(555) 555-5555"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          We'll send a verification code to this number
        </p>
      </div>

      {/* Business Information (Read-Only) */}
      <Card className="bg-muted/50 border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading">Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-foreground">Business Name:</span>{' '}
            <span className="text-muted-foreground">{business.name}</span>
          </div>
          {business.address && (
            <div>
              <span className="font-medium text-foreground">Address:</span>{' '}
              <span className="text-muted-foreground">
                {business.address}
                {business.city && `, ${business.city}`}
                {business.state && `, ${business.state}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50 border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading">What happens next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Your claim will be reviewed by our team</li>
            <li>We may contact you for additional verification</li>
            <li>Upon approval, you'll receive ownership access</li>
            <li>You can then edit your business profile</li>
          </ol>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-lake-blue hover:bg-lake-blue-dark text-white"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting Claim...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit Claim Request
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By submitting this claim, you confirm that you are authorized to represent this business.
        False claims may result in account suspension.
      </p>
    </form>
  );
}
