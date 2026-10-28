# LunchLoop Application Security Guide

## 1. Security Architecture & Threat Boundaries

LunchLoop is designed with defense-in-depth across the browser, API layer, and database.

```
[ Browser Client ]
       │  (Bearer JWT / Safe JSON / DOM Sanitized)
       ▼
[ Express API Gateway ]
       ├── CORS Protection
       ├── Sliding-Window Rate Limiting (Prevents Brute Force / DoS)
       ├── Body Size Limit (500kb max)
       ├── Authentication Middleware (Verifies Supabase JWT)
       ├── Role Authorization (Enforces 'staff' / 'admin')
       ├── Domain Validation (Prices, Quantities 1..10, Notes, Enums)
       └── Safe Error Masking (No internal stack traces leaked)
       │
       ▼
[ Supabase PostgreSQL ]
       ├── Row Level Security (RLS) Policies on all tables
       ├── Atomic RPC Transactions (SELECT ... FOR UPDATE)
       ├── Immutable Historical Line Item Price Snapshots
       └── Auditable Inventory & Order Status Ledgers
```

---

## 2. Core Security Controls

### Client Input Non-Trust
- The backend never trusts prices, subtotals, quantities, user IDs, or roles sent in request JSON.
- Every order subtotal is recalculated on the server directly from the PostgreSQL `menu_items` database table.
- Line items are snapshotted in `order_items` at purchase time (`item_name_snapshot`, `unit_price_snapshot`) so subsequent menu price changes never alter past order records.

### Concurrency & Overselling Prevention
- Standard web applications with sequential `SELECT` then `UPDATE` queries are vulnerable to race conditions when two students order the last available portion simultaneously.
- LunchLoop executes all order reservations inside an isolated PostgreSQL transaction via `public.create_order_atomic`.
- It acquires explicit row locks (`SELECT ... FOR UPDATE`) on both the `pickup_windows` and `menu_items` rows in deterministic order.
- Inventory is verified and decremented in the same transaction. If stock or window capacity is exceeded, the transaction fails atomically without partial state changes.

### Student Privacy & Ownership Isolation
- Students can only view, query, and cancel their own orders (`auth.uid() = user_id`).
- Attempting to access an order ID belonging to another student returns an HTTP 403 Forbidden error.
- Public pickup tokens (e.g. `T-101`) are used solely for kitchen ticketing and pickup counter announcements; they never grant access to private customer data.

### Self-Promotion & Role Escalation Defense
- User roles (`student`, `staff`, `admin`) are stored in the server-managed `profiles` table.
- The `PATCH /api/me` profile endpoint strictly ignores or rejects any `role` field submitted in request bodies.
- Only users with the `admin` role can update user roles via `PATCH /api/admin/users/:id/role`.

### Cross-Site Scripting (XSS) Prevention
- Frontend vanilla JavaScript uses `escapeHTML()` and safe DOM properties (`textContent`) for all dynamic strings, public order numbers, notes, dish names, and cancellation reasons.
- Untrusted user strings are never directly concatenated into `innerHTML`.

### Secret Management
- Privileged keys (`SUPABASE_SERVICE_ROLE_KEY`) are kept exclusively on the server and never bundled or referenced in frontend JavaScript files.
- The `.env` file is excluded from git commits via `.gitignore`.
- An `.env.example` template with placeholder values is provided for developers.
