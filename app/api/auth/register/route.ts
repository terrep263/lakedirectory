import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, phone } = await req.json();

    // Validation
    if (!email || !password || !fullName || !phone) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.account.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create account with USER role
    const account = await prisma.account.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        phone,
        role: 'USER',
        emailVerified: false,
        phoneVerified: false,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    // TODO: Send email verification email
    // TODO: Send phone verification SMS

    return NextResponse.json({
      success: true,
      account,
      message: 'Account created. Please verify your email and phone number.',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
