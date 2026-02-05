const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'admin@lakedirectory.local';
    const password = 'AdminPassword123!';

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the admin account
    const account = await prisma.account.upsert({
      where: { email },
      update: {
        passwordHash,
        role: 'ADMIN',
        fullName: 'Admin User',
        emailVerified: true,
      },
      create: {
        email,
        passwordHash,
        role: 'ADMIN',
        fullName: 'Admin User',
        emailVerified: true,
      },
    });

    console.log('✓ Admin account created/updated:');
    console.log(`  Email: ${account.email}`);
    console.log(`  Role: ${account.role}`);
    console.log(`  Password: ${password}`);
    console.log('\nUse these credentials to login at /admin');
  } catch (error) {
    console.error('✗ Error creating admin account:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
