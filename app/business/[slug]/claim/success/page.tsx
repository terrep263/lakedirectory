import { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Claim Submitted | Lake County Local',
  description: 'Your claim has been submitted',
};

export default async function ClaimSuccessPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="font-heading text-2xl font-bold text-lake-blue">
              Lake County Local
            </h1>
          </Link>
        </div>

        <Card className="shadow-soft border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="font-heading text-2xl">Claim Submitted!</CardTitle>
            <CardDescription>
              Your claim request has been received
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Our team will review your claim within 2-3 business days. You'll receive an email notification once your claim is approved.
              </p>
              <p>
                We may contact you at the email and phone number you provided if we need additional verification.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                asChild
                variant="outline"
                className="w-full h-11"
              >
                <Link href={`/business/${slug}`}>
                  View Business Profile
                </Link>
              </Button>
              <Button
                asChild
                className="w-full h-11 bg-lake-blue hover:bg-lake-blue-dark"
              >
                <Link href="/businesses">
                  Browse Directory
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
