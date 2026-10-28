# LunchLoop REST API Documentation

LunchLoop provides a structured RESTful API for canteen pre-ordering, kitchen preparation queue, inventory stock control, and peak-hour operational metrics.

## Base URL
```
http://localhost:3000/api
```

## Response Envelopes

### Success Envelope (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-10-27T06:30:00.000Z",
    "limit": 20,
    "offset": 0
  }
}
```

### Error Envelope (HTTP 400 / 401 / 403 / 404 / 409 / 422 / 500)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Only 2 portions of \"Masala Dosa\" available (requested 5).",
    "details": []
  }
}
```

---

## 1. General & Public Endpoints

### `GET /api/health`
Health check endpoint reporting server status and configuration.
- **Access**: Public
- **Response**: `{ status: "healthy", service: "LunchLoop API Server", uptime_seconds: 120, supabase_configured: true }`

### `GET /api/public/canteen`
Returns campus canteen operating hours, location, contact, and pre-ordering policy.
- **Access**: Public
- **Response**: `{ canteen: { name, location, operating_hours, peak_hours }, rules: { cancellation_cutoff_minutes } }`

### `GET /api/menu`
Retrieves menu items with active pricing and portion availability.
- **Access**: Public
- **Query Parameters**:
  - `category_id` (UUID, optional): Filter by category.
  - `search` (string, optional): Search query matched against dish names.
  - `vegetarian_only` (boolean, optional): Set to `true` for pure vegetarian dishes.
  - `max_price` (numeric, optional): Maximum INR price threshold.
  - `sort` (`name` | `price_asc` | `price_desc` | `prep_time`): Sorting order.

### `GET /api/menu/categories`
Retrieves all active food categories (Breakfast, Meals, Snacks, Beverages).
- **Access**: Public

### `GET /api/pickup-windows`
Retrieves today's active pickup windows with remaining capacity slots.
- **Access**: Public

---

## 2. Authentication & User Profile

Authentication is performed via Bearer tokens in the `Authorization` HTTP header (`Bearer <token>`).

### `GET /api/me`
Fetches the profile and assigned role (`student`, `staff`, or `admin`) for the authenticated user.
- **Access**: Authenticated

### `PATCH /api/me`
Updates allowed profile fields (`display_name`, `phone`).
- **Access**: Authenticated
- **Security**: Role promotion is rejected.

---

## 3. Student Order Workflow

### `POST /api/orders`
Creates a transactional pre-order. Automatically decrements inventory, reserves window capacity slot, captures immutable price snapshots, generates public order number and token.
- **Access**: Authenticated Student
- **Body**:
  ```json
  {
    "pickup_window_id": "w1111111-1111-1111-1111-111111111101",
    "items": [
      { "menu_item_id": "m1111111-1111-1111-1111-111111111101", "quantity": 2 }
    ],
    "notes": "No coriander",
    "idempotency_key": "idemp_1700000000"
  }
  ```
- **Response**: `{ order: { order_id, public_order_number, pickup_token, status: "confirmed", subtotal } }`

### `GET /api/orders`
Retrieves order history for the authenticated student.
- **Access**: Authenticated Student
- **Query Parameters**: `status`, `limit`, `offset`

### `GET /api/orders/:id`
Retrieves full details, item breakdown, and live cancellation eligibility for a specific order.
- **Access**: Authenticated (Owner or Staff/Admin only)

### `POST /api/orders/:id/cancel`
Cancels a confirmed order if the cancellation cutoff has not passed. Restores inventory and releases window reservation capacity atomically.
- **Access**: Authenticated Student (Owner or Staff/Admin)
- **Body**: `{ "reason": "Change of schedule" }`

---

## 4. Staff Menu & Inventory Operations

All staff endpoints require the `staff` or `admin` role.

### `GET /api/staff/menu`
Retrieves all items with full inventory metrics.

### `POST /api/staff/menu`
Creates a new menu item.
- **Body**: `{ name, category_id, price, available_quantity, low_stock_threshold, is_vegetarian, description }`

### `PATCH /api/staff/menu/:id/stock`
Adjusts portion stock and records an auditable `inventory_event`.
- **Body**: `{ "quantity": 30, "reason": "Fresh midday batch" }`

### `PATCH /api/staff/menu/:id/availability`
Toggles dish availability (`is_available: true/false`).

---

## 5. Kitchen Queue & Operations

### `GET /api/staff/queue`
Retrieves active unfulfilled orders (`confirmed`, `preparing`, `ready`) ordered by time received.

### `PATCH /api/staff/orders/:id/status`
Advances order through valid state machine transitions:
- `confirmed` &rarr; `preparing`
- `preparing` &rarr; `ready`
- `ready` &rarr; `collected`
- **Body**: `{ "status": "preparing", "note": "Wok assigned" }`

---

## 6. Peak-Hour Analytics

### `GET /api/staff/analytics/overview`
Returns summary metrics: total orders, active queue, cancellation rate, revenue, low stock count.

### `GET /api/staff/analytics/hourly-demand`
Returns order distribution grouped by hour (08:00 to 18:00).

### `GET /api/staff/analytics/top-items`
Returns top ordered dishes by quantity and revenue.

### `GET /api/staff/analytics/window-demand`
Returns capacity occupancy percentage across all pickup windows.

### `GET /api/staff/analytics/inventory`
Returns recent inventory stock mutations audit trail.
