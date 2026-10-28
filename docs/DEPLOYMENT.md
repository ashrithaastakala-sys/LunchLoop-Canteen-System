# LunchLoop Production Deployment Guide

## 1. Prerequisites
- A cloud hosting provider supporting Node.js (e.g., Render, Railway, Fly.io, AWS EC2, or DigitalOcean)
- A Supabase project (Free or Pro tier) with PostgreSQL database
- Node.js LTS (v18+)

---

## 2. Environment Variables

Configure the following environment variables in your hosting provider's dashboard:

| Variable | Description | Example / Default |
|---|---|---|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port (assigned by host) | `3000` |
| `APP_BASE_URL` | Canonical public URL | `https://lunchloop.yourcampus.edu` |
| `SUPABASE_URL` | Supabase Project URL | `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anon Public Key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret | `eyJhbGciOi...` |
| `CAMPUS_TIMEZONE` | Canteen operational timezone | `Asia/Kolkata` |
| `CANCELLATION_CUTOFF_MINUTES` | Cutoff before window start | `10` |

---

## 3. Database Deployment

1. Log into your Supabase Dashboard: [https://supabase.com](https://supabase.com).
2. Go to the **SQL Editor** and execute the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_create_constraints_and_indexes.sql`
   - `supabase/migrations/003_rls_and_policies.sql`
   - `supabase/migrations/004_rpc_atomic_order_and_cancel.sql`
   - `supabase/seed.sql`
3. Under **Authentication &rarr; URL Configuration**, set your **Site URL** to your production domain (e.g. `https://lunchloop.yourcampus.edu`).

---

## 4. Node.js Production Start

1. Install production dependencies:
   ```bash
   npm ci --omit=dev
   ```
2. Start the Express application:
   ```bash
   npm start
   ```
3. Verify the deployment:
   ```bash
   curl -i https://lunchloop.yourcampus.edu/api/health
   ```
   Should return HTTP 200 with `status: "healthy"`.

---

## 5. Security & Operational Checklist
- [x] Ensure `SUPABASE_SERVICE_ROLE_KEY` is never committed to Git or exposed in public files.
- [x] Verify that HTTPS is enforced on all routes.
- [x] Confirm that Row Level Security (RLS) is enabled on all tables in Supabase.
- [x] Ensure Express rate-limiting is enabled for API endpoints.
