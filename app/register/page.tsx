import { Metadata } from 'next';
import Link from 'next/link';
import { RegisterForm } from './register-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Register | Lake County Local',
  description: 'Create your account to join Lake County Local',
};

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Lake County Local
            </h1>
          </Link>
        </div>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl">Create Account</CardTitle>
            <CardDescription>
              Join Lake County Local to claim your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
          <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
            <p>
              Already have an account?{' '}
              <Link href="/login" className="text-lake-blue hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
