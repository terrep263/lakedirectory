# Vendor PWA Scanner

Production-ready PWA for voucher redemption by business vendors.

## System Requirements

- Node.js 18+
- PostgreSQL database (Supabase)
- Modern browser with camera access

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
DATABASE_URL="your-supabase-connection-string"
JWT_SECRET="your-secure-secret-key"
```

3. Run database migrations (manual via Supabase SQL Editor):
```sql
-- Run the SQL from prisma/migrations/0_init/migration.sql
```

4. Generate Prisma Client:
```bash
npx prisma generate
```

5. Start development server:
```bash
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

## Architecture

### Database Schema (Frozen - Schema v2)
- Account (business authentication)
- Business (vendor details)
- Voucher (redemption tracking)
- VoucherValidation (external references)
- Deal (voucher offerings)
- User (voucher holders)
- Subscription (business subscriptions)

### API Endpoints

**POST /api/auth/login**
- Authenticates business account
- Returns JWT token

**POST /api/redeem**
- Redeems voucher by qrToken
- Requires Bearer token
- Atomic transaction with race-condition protection

### UI States

1. **Scan Screen** (neutral) - Camera QR scanning
2. **Processing** (neutral) - Brief loading state
3. **Success** (GREEN) - Voucher redeemed successfully
4. **Failure** (RED) - Redemption blocked

### Security

- Business-level authentication only
- Server-side validation enforcement
- JWT-based session management
- Atomic database transactions
- Idempotent redemption operations

### PWA Features

- Offline-capable manifest
- Mobile-first responsive design
- Camera-based QR scanning
- Installable on mobile devices

## Business Rules (Non-negotiable)

- Redemption is one-time and irreversible
- Only ISSUED vouchers can be redeemed
- Vouchers must belong to authenticated business
- No offline redemption
- No staff or admin roles in PWA
- GREEN = proceed with order
- RED = do not serve

## Out of Scope

- Voucher issuance
- Payment processing
- Admin dashboards
- Staff management
- POS integration
- Offline mode
- Analytics dashboards
