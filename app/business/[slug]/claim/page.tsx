import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ClaimForm } from './claim-form';
import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MainNav, Footer } from '@/components/home';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      title: 'Claim Business | Lake County Local',
      description: 'Submit a claim request for a local business.',
    };
  }

  const { slug } = await params;

  try {
    const business = await prisma.business.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
      select: {
        name: true,
      },
    });

    if (!business) {
      return {
        title: 'Business Not Found',
      };
    }

    return {
      title: `Claim ${business.name} | Lake County Local`,
      description: `Submit a claim request for ${business.name}`,
    };
  } catch {
    return {
      title: 'Claim Business | Lake County Local',
      description: 'Submit a claim request for a local business.',
    };
  }
}

export default async function ClaimBusinessPage({ params }: PageProps) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="hero-gradient text-white">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <MainNav variant="dark" />
          </div>
        </header>
        <main className="flex-1 py-12">
          <div className="mx-auto max-w-2xl px-6">
            <Card className="shadow-soft border-0">
              <CardHeader>
                <CardTitle className="font-heading">Claim This Business</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">This page loads at runtime in production.</p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { slug } = await params;

  let business: any
  try {
    // Get business
    business = await prisma.business.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        address: true,
        city: true,
        state: true,
      },
    });
  } catch {
    business = null
  }

  if (!business) {
    // Soft failure when DB is unreachable
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="hero-gradient text-white">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <MainNav variant="dark" />
          </div>
        </header>
        <main className="flex-1 py-12">
          <div className="mx-auto max-w-2xl px-6">
            <Card className="shadow-soft border-0">
              <CardHeader>
                <CardTitle className="font-heading">This page is temporarily unavailable</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Please try again in a moment.</p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If already claimed, redirect to profile
  if (business.ownerId !== null) {
    redirect(`/business/${business.slug || business.id}`);
  }

  // Check if user is logged in (simplified - should use proper session)
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session');

  if (!sessionToken) {
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(`/business/${business.slug || business.id}/claim`);
    redirect(`/login?returnUrl=${returnUrl}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="hero-gradient text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <MainNav variant="dark" />
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-2xl px-6">
          {/* Back Link */}
          <Link
            href={`/business/${business.slug || business.id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Business Profile
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold text-foreground">Claim This Business</h1>
            <p className="mt-2 text-muted-foreground">
              Submit a claim request for <span className="font-medium text-foreground">{business.name}</span>
            </p>
          </div>

          {/* Info Box */}
          <Alert className="mb-8 border-lake-blue/30 bg-lake-blue/5">
            <Info className="h-5 w-5 text-lake-blue" />
            <AlertTitle className="font-heading font-bold text-lake-blue">Claim Process</AlertTitle>
            <AlertDescription className="text-lake-blue/80">
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>Provide your contact information and verification details</li>
                <li>Our team will review your claim (usually within 2-3 business days)</li>
                <li>Upon approval, you'll gain access to manage your business profile</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Claim Form */}
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="font-heading">Claim Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ClaimForm business={business} />
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
