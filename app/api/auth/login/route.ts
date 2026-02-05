import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { signIdentityToken } from '@/lib/identity/token'
import { IdentityRole } from '@/lib/identity/types'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        business: {
          select: {
            id: true,
            name: true,
            isVerified: true,
          },
        },
      },
    });

    if (!account || account.role !== 'BUSINESS' || !account.business) {
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
    cookieStore.set('session', account.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    // Ensure schema-truth vendor identity and ownership binding exist (Module 1)
    let userIdentity = await prisma.userIdentity.findUnique({
      where: { email: account.email },
    })

    if (!userIdentity) {
      userIdentity = await prisma.userIdentity.create({
        data: {
          email: account.email,
          role: IdentityRole.VENDOR,
          status: 'ACTIVE',
        },
      })
    } else if (userIdentity.role !== IdentityRole.VENDOR) {
      // Vendor login is the canonical USER -> VENDOR transition in legacy system.
      userIdentity = await prisma.userIdentity.update({
        where: { id: userIdentity.id },
        data: { role: IdentityRole.VENDOR },
      })
    }

    // Ensure VendorOwnership binding (enforced uniqueness)
    const existingBinding = await prisma.vendorOwnership.findUnique({
      where: { userId: userIdentity.id },
    })
    if (existingBinding && existingBinding.businessId !== account.business.id) {
      return NextResponse.json(
        { error: 'Vendor is already bound to a different business' },
        { status: 409 }
      )
    }
    if (!existingBinding) {
      await prisma.vendorOwnership.create({
        data: { userId: userIdentity.id, businessId: account.business.id },
      })
    }

    // Ensure Business.ownerUserId matches identity (schema-truth canonical owner binding)
    const biz = await prisma.business.findUnique({
      where: { id: account.business.id },
      select: { ownerUserId: true },
    })
    if (biz && biz.ownerUserId && biz.ownerUserId !== userIdentity.id) {
      return NextResponse.json(
        { error: 'Business is already bound to a different vendor identity' },
        { status: 409 }
      )
    }
    await prisma.business.update({
      where: { id: account.business.id },
      data: { ownerUserId: userIdentity.id },
    })

    const token = signIdentityToken({
      id: userIdentity.id,
      email: userIdentity.email,
      role: userIdentity.role as IdentityRole,
    })

    return NextResponse.json({
      success: true,
      redirectTo: '/vendor/dashboard',
      token,
      business: {
        id: account.business.id,
        name: account.business.name,
        isVerified: account.business.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
