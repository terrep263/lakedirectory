'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CreateDealForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    brief: '',
    dealCategory: 'restaurant',
    redemptionWindowStart: '',
    redemptionWindowEnd: '',
    voucherQuantityLimit: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('vendorToken')
      const response = await fetch('/api/vendor/deals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));
      setResult(data);

      if (response.ok) {
        // Approved and published instantly. Show guidance + summary here.
        setError('');
        return
      }

      // rewrite_required / rejected are shown inline
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-soft border-0">
      <CardHeader>
        <CardTitle className="font-heading">Create a Deal (AI generated)</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {result?.success ? (
            <Alert>
              <AlertDescription>
                <div className="font-semibold">Deal published.</div>
                {result?.summary ? (
                  <div className="mt-2 text-sm">
                    <div><span className="font-semibold">Title:</span> {result.summary.title}</div>
                    <div>
                      <span className="font-semibold">Price:</span> ${result.summary.dealPrice} (regular ${result.summary.originalValue})
                    </div>
                    <div><span className="font-semibold">Category:</span> {result.summary.dealCategory}</div>
                  </div>
                ) : null}
                {result?.guidance ? (
                  <div className="mt-3 text-sm">
                    <div className="font-semibold">Deal Guard guidance (not enforced)</div>
                    <div className="mt-1">
                      Suggested deal price: <span className="font-semibold">${result.guidance.recommendedDealPrice}</span>
                      {' '}(<span className="font-semibold">{result.guidance.targetDiscountPercentRange?.[0]}–{result.guidance.targetDiscountPercentRange?.[1]}%</span> typical range)
                    </div>
                    {Array.isArray(result.guidance.notes) && result.guidance.notes.length > 0 ? (
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        {result.guidance.notes.map((n: string, idx: number) => (
                          <li key={idx}>{n}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4">
                  <Button type="button" className="bg-lake-blue hover:bg-lake-blue-dark" onClick={() => router.push('/vendor/dashboard')}>
                    Go to dashboard
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-slate-900">Deal brief</div>
                <div className="mt-1 text-sm text-slate-600">
                  Enter a simple transparent offer like: <span className="font-semibold">“3 tacos for $3, regular $9.”</span>
                  <div className="mt-1 text-xs text-slate-500">No BOGO, % off, “free”, or vague pricing.</div>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Textarea
                value={formData.brief}
                onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
                rows={3}
                placeholder="e.g., I want to sell 3 tacos for $3, the regular price is $9."
                className="resize-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dealCategory">
                Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="dealCategory"
                value={formData.dealCategory}
                onChange={(e) => setFormData({ ...formData, dealCategory: e.target.value })}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="restaurant">Restaurant</option>
                <option value="auto">Auto</option>
                <option value="beauty">Beauty</option>
                <option value="fitness">Fitness</option>
                <option value="entertainment">Entertainment</option>
                <option value="retail">Retail</option>
                <option value="services">Services</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voucherQuantityLimit">
                Voucher limit <span className="text-destructive">*</span>
              </Label>
              <Input
                id="voucherQuantityLimit"
                required
                value={formData.voucherQuantityLimit}
                onChange={(e) => setFormData({ ...formData, voucherQuantityLimit: e.target.value })}
                placeholder="e.g., 50"
                className="h-11"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="redemptionWindowStart">
                Redemption start <span className="text-destructive">*</span>
              </Label>
              <Input
                id="redemptionWindowStart"
                type="datetime-local"
                required
                value={formData.redemptionWindowStart}
                onChange={(e) => setFormData({ ...formData, redemptionWindowStart: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redemptionWindowEnd">
                Redemption end <span className="text-destructive">*</span>
              </Label>
              <Input
                id="redemptionWindowEnd"
                type="datetime-local"
                required
                value={formData.redemptionWindowEnd}
                onChange={(e) => setFormData({ ...formData, redemptionWindowEnd: e.target.value })}
                className="h-11"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="h-11 bg-lake-blue hover:bg-lake-blue-dark"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate & Publish Deal
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-11"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
