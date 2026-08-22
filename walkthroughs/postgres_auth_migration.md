# Walkthrough: Complete Migration to Native PostgreSQL Authentication

We have completely removed Supabase Authentication from **Smart Money** and replaced it with a self-contained, native PostgreSQL authentication architecture.

## Summary of Changes Made

1. **PostgreSQL Database Schema (`public.users`)**:
   - Removed `users_id_fkey` constraint referencing `auth.users(id)`.
   - Added `password_hash text` column to `public.users`.
   - Enabled native UUID generation via `gen_random_uuid()` for user IDs.
   - Enforced unique index on `users.email`.

2. **Native Authentication Core ([`src/lib/auth.ts`](file:///home/ec2-user/smart-money/src/lib/auth.ts))**:
   - Built password hashing and verification using `bcryptjs`.
   - Created HMAC-signed HTTP-only session cookies (`smart_money_session`).
   - Direct PostgreSQL database queries for user retrieval (`findUserByEmail`, `findUserById`, `createUser`).

3. **API Routes**:
   - **`POST /api/auth/register`**: Hashes password, creates user in PostgreSQL `public.users`, sets HTTP-only session cookie.
   - **`POST /api/auth/login`**: Verifies email & hashed password against PostgreSQL, sets HTTP-only session cookie.
   - **`POST /api/auth/logout`**: Clears session cookie.
   - **`GET /api/auth/google/callback`**: Exchanges Google code, upserts user in PostgreSQL, sets HTTP-only session cookie.

4. **Middleware & Server Compatibility ([`src/proxy.ts`](file:///home/ec2-user/smart-money/src/proxy.ts) & [`src/lib/supabase/server.ts`](file:///home/ec2-user/smart-money/src/lib/supabase/server.ts))**:
   - Replaced all Supabase session checks in proxy middleware with native `smart_money_session` cookie verification.
   - Updated server-side compatibility shims so all existing user queries use native PostgreSQL auth seamlessly.

---

## Verification & Testing Results

- **Next.js Production Build**: Executed `npm run build` cleanly with **0 build errors**.
- **Process Restart**: Successfully reloaded PM2 cluster instances (`smart-money`).
- **Endpoint Test**: Verified Google OAuth redirect output (`HTTP 307` with `https://smartmoney.technology/api/auth/google/callback`).
