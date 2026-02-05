import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signIdentityToken } from '@/lib/identity/token';
import { IdentityRole } from '@/lib/identity/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const normalizedEmail =
      typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        fullName: true,
      },
    });

    if (!account || account.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!account.passwordHash) {
      return NextResponse.json(
        { error: 'Account not configured' },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, account.passwordHash);

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('session', `admin-${account.id}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Generate JWT token for API access
    // Find or create UserIdentity for this admin
    let userIdentity = await prisma.userIdentity.findUnique({
      where: { email: account.email },
    });

    if (!userIdentity) {
      // Create UserIdentity if it doesn't exist
      userIdentity = await prisma.userIdentity.create({
        data: {
          email: account.email,
          role: IdentityRole.ADMIN,
          status: 'ACTIVE',
        },
      });
    }

    const token = signIdentityToken({
      id: userIdentity.id,
      email: userIdentity.email,
      role: userIdentity.role as IdentityRole,
    });

    return NextResponse.json({
      success: true,
      redirectTo: '/admin',
      token,
      account: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        role: account.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
