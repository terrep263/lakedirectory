import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Email | Lakedirectory',
  description: 'Verify your email address',
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-8 w-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
            <p className="mt-2 text-sm text-gray-600">
              We've sent a verification email to:
            </p>
            {email && (
              <p className="mt-1 font-medium text-gray-900">{email}</p>
            )}
          </div>

          <div className="space-y-4 text-sm text-gray-600">
            <p>
              Click the link in the email to verify your account. The link will expire in 24 hours.
            </p>
            <p>
              After verifying your email, you'll need to verify your phone number to complete registration.
            </p>
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
