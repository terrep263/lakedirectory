'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface Business {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  photos: string[];
  hours: any;
}

export function BusinessEditForm({ business }: { business: Business }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    description: business.description || '',
    category: business.category || '',
    address: business.address || '',
    city: business.city || '',
    state: business.state || '',
    zipCode: business.zipCode || '',
    phone: business.phone || '',
    website: business.website || '',
    logoUrl: business.logoUrl || '',
    coverUrl: business.coverUrl || '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('vendorToken')
      const response = await fetch('/api/vendor/business/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update business');
      }

      // Redirect to business profile
      router.push(`/business/${business.slug || business.id}`);
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

      {/* Read-Only Name */}
      <div className="space-y-2">
        <Label>Business Name</Label>
        <Input
          type="text"
          value={business.name}
          disabled
          className="h-11 bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Contact support to change your business name
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          placeholder="Tell customers about your business..."
          className="resize-none"
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder="e.g., Restaurant, Salon, Retail"
          className="h-11"
        />
      </div>

      <Separator />

      {/* Location */}
      <div className="space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Location</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="e.g., CA"
              className="h-11"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="zipCode">ZIP Code</Label>
            <Input
              id="zipCode"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              className="h-11"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact */}
      <div className="space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Contact Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://"
              className="h-11"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Media */}
      <div className="space-y-4">
        <h3 className="font-heading font-semibold text-foreground">Media</h3>
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            type="url"
            id="logoUrl"
            name="logoUrl"
            value={formData.logoUrl}
            onChange={handleChange}
            placeholder="https://example.com/logo.png"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverUrl">Cover Photo URL</Label>
          <Input
            type="url"
            id="coverUrl"
            name="coverUrl"
            value={formData.coverUrl}
            onChange={handleChange}
            placeholder="https://example.com/cover.png"
            className="h-11"
          />
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1 h-11"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 h-11 bg-lake-blue hover:bg-lake-blue-dark"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
