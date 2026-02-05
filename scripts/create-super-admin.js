const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

function loadEnvFile(filename) {
  try {
    const p = path.join(__dirname, '..', filename)
    if (!fs.existsSync(p)) return
    const raw = fs.readFileSync(p, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (!key) continue
      if (process.env[key] !== undefined) continue

      // strip optional quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  } catch {
    // ignore env loading failures; defaults still work
  }
}

async function main() {
  // Node scripts do NOT automatically load .env files.
  // Load local overrides first, then base env.
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@lakedirectory.local').toLowerCase()
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPassword123!'

  const passwordHash = await bcrypt.hash(password, 10)

  // Account must be ADMIN (admin login + session cookie), identity must be SUPER_ADMIN (super-admin authorization).
  const account = await prisma.account.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      fullName: 'Super Admin',
      emailVerified: true,
    },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      fullName: 'Super Admin',
      emailVerified: true,
    },
  })

  await prisma.userIdentity.upsert({
    where: { email },
    update: {
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  })

  // eslint-disable-next-line no-console
  console.log('✓ Super Admin account created/updated:')
  // eslint-disable-next-line no-console
  console.log(`  Email: ${email}`)
  // eslint-disable-next-line no-console
  console.log('\nLogin at: /admin-login')
  // eslint-disable-next-line no-console
  console.log('Then open: /super-admin/counties')
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('✗ Error creating super admin:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

