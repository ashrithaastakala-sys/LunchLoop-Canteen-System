# LunchLoop Database Architecture & Supabase Guide

LunchLoop uses Supabase PostgreSQL as its persistent relational database. The schema is designed for strict transaction isolation, inventory consistency, auditability, and role-based access control.

---

## 1. Schema Tables & Relationships

```
auth.users (Supabase Managed)
    ├── profiles (1:1, extends auth user with role, display_name)
    ├── orders (1:N, pre-orders placed by student)
    ├── inventory_events (1:N, actor that modified inventory)
    └── order_status_events (1:N, actor that transitioned order status)

menu_categories
    └── menu_items (1:N, category grouping)
            ├── order_items (1:N, immutable snapshot of item name & price)
            └── inventory_events (1:N, stock adjustments and reservations)

pickup_windows
    └── orders (1:N, reserved window slot)

orders
    ├── order_items (1:N, purchased line items)
    ├── inventory_events (1:N, reservation or restock deductions)
    └── order_status_events (1:N, timeline of kitchen state changes)
```

### Table Definitions

| Table | Purpose | Primary Key | Critical Constraints |
|---|---|---|---|
| `profiles` | User identity and role | `id` (UUID references `auth.users`) | `role IN ('student', 'staff', 'admin')` |
| `menu_categories` | Menu catalog categories | `id` (UUID) | `name UNIQUE`, `slug UNIQUE` |
| `menu_items` | Dishes, portions, prices | `id` (UUID) | `price >= 0`, `available_quantity >= 0` |
| `pickup_windows` | 20-minute pickup slots | `id` (UUID) | `ends_at > starts_at`, `reserved_count <= capacity` |
| `orders` | Pre-order header | `id` (UUID) | `public_order_number UNIQUE`, `subtotal >= 0` |
| `order_items` | Historical line item snapshots | `id` (UUID) | `unit_price_snapshot >= 0`, `quantity > 0` |
| `inventory_events` | Stock audit ledger | `id` (UUID) | `event_type IN ('order_reservation', ...)` |
| `order_status_events` | Kitchen workflow audit trail | `id` (UUID) | `new_status IN ('confirmed', ...)` |
| `app_settings` | Operational configurations | `id` (UUID) | `setting_key UNIQUE`, `setting_value JSONB` |

---

## 2. Atomic Transactional RPC Functions

### `create_order_atomic(p_user_id, p_pickup_window_id, p_items, p_notes, p_idempotency_key)`
- **Concurrency Protection**:
  1. Executes `SELECT ... FROM pickup_windows WHERE id = ... FOR UPDATE` to lock slot availability.
  2. Executes `SELECT ... FROM menu_items WHERE id = ... FOR UPDATE` in deterministic order to prevent deadlocks and overselling race conditions.
  3. Rechecks server-side prices and calculates subtotal directly from the database (never trusts client price).
  4. Deducts available portions atomically.
  5. Increments `pickup_windows.reserved_count`.
  6. Inserts immutable snapshot records into `order_items`.
  7. Creates the initial `order_status_events` record.
  8. Commits all records in a single isolated transaction. If any portion is insufficient or window is full, the entire transaction rolls back.

### `cancel_order_atomic(p_order_id, p_actor_id, p_reason, p_cutoff_minutes)`
- **Idempotent Restock**:
  1. Checks if order is already cancelled; if so, returns without re-incrementing stock.
  2. Verifies student ownership or staff authorization.
  3. Enforces cancellation cutoff (e.g., 10 minutes prior to window start time).
  4. Releases pickup window slot (`reserved_count = GREATEST(0, reserved_count - 1)`).
  5. Restores portion quantity for each line item in `order_items` exactly once.
  6. Logs `inventory_events` with type `order_cancellation`.
  7. Updates order status to `cancelled`.

### `update_order_status_atomic(p_order_id, p_new_status, p_actor_id, p_note)`
- **State Machine Enforcement**:
  - `confirmed` &rarr; `preparing` or `cancelled`
  - `preparing` &rarr; `ready`
  - `ready` &rarr; `collected`
  - Terminal states (`collected`, `cancelled`) cannot be reopened.

---

## 3. Row Level Security (RLS) Policies

All tables have RLS enabled:
- **`profiles`**: Students can view their own profile; staff and admin can view profiles; only admin can update roles.
- **`menu_categories` & `menu_items`**: Public can view active/available items; staff/admin can modify items.
- **`pickup_windows`**: Public can view active windows; staff/admin can modify.
- **`orders`**: Students can view only their own orders (`auth.uid() = user_id`); staff/admin can view all. Direct inserts/updates are restricted to database RPCs and backend services.
- **`order_items`**: Students can view line items belonging to their own orders.
- **`inventory_events`**: Restricted to staff and admin.
- **`order_status_events`**: Students can view events for their own orders; staff/admin can view all.

---

## 4. Applying Migrations in Supabase

1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project and navigate to the **SQL Editor**.
3. Execute the SQL files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_create_constraints_and_indexes.sql`
   - `supabase/migrations/003_rls_and_policies.sql`
   - `supabase/migrations/004_rpc_atomic_order_and_cancel.sql`
   - `supabase/seed.sql`
4. Copy your **Project URL**, **anon public key**, and **service_role key** from **Project Settings &rarr; API** into your `.env` file.
