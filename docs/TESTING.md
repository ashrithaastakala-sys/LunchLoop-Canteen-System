# LunchLoop Quality Assurance & Testing Guide

LunchLoop includes automated unit and integration tests built with the native Node.js test runner (`node:test`, `node:assert/strict`) and Supertest.

---

## 1. Automated Test Commands

### Run All Tests
```bash
npm test
```

### Run Business Rules Unit Tests Only
```bash
npm run test:unit
```

### Run API Integration Tests Only
```bash
npm run test:api
```

### Run Syntax Verification
```bash
npm run check
```

---

## 2. Test Suites Covered

### Business Rules Unit Tests (`server/tests/unit/businessRules.test.js`)
- **Order Payload Validation**:
  - Accepts well-formed order payloads.
  - Rejects empty items array.
  - Rejects non-positive or negative quantities.
  - Enforces 10 portion limit per dish.
- **State Machine Transitions**:
  - Validates `confirmed` &rarr; `preparing` &rarr; `ready` &rarr; `collected`.
  - Rejects invalid or arbitrary transitions.
- **Cancellation Cutoff**:
  - Validates cancellation permitted when window starts in 30 minutes (cutoff = 10 mins).
  - Rejects cancellation when within 5 minutes of window start.
- **Menu & Stock Validation**:
  - Validates item creation parameters.
  - Rejects negative dish prices.
  - Validates stock adjustment quantities and reasons.
- **Pickup Windows Validation**:
  - Rejects invalid windows where `ends_at <= starts_at`.

### API Integration Tests (`server/tests/api/apiEndpoints.test.js`)
- `GET /api/health`: Verifies 200 response and JSON envelope.
- `GET /api/public/canteen`: Verifies public canteen metadata and order rules.
- `GET /api/orders`: Verifies 401 UNAUTHORIZED when no token is supplied.
- `POST /api/orders`: Verifies 401 UNAUTHORIZED when unauthenticated.
- `POST /api/orders`: Verifies 400 VALIDATION_ERROR on malformed request payloads.
- `GET /api/staff/orders`: Verifies 403 FORBIDDEN when student token accesses staff endpoints.
- `GET /api/admin/users`: Verifies 403 FORBIDDEN when staff accesses admin endpoints.
- `GET /api/admin/users`: Verifies 403 FORBIDDEN when student accesses admin endpoints.
- `GET /api/non-existent-endpoint`: Verifies 404 NOT_FOUND error response.

---

## 3. Manual Verification Checklist

1. **Student Pre-Order Flow**:
   - Open [http://localhost:3000/menu.html](http://localhost:3000/menu.html).
   - Click "Sign In / Demo" and select "Student".
   - Filter by "Pure Vegetarian" or search for "Masala Dosa".
   - Click "+ Add to Tray".
   - Open tray, select a pickup window, and click "Confirm Pre-Order".
   - Observe redirect to `order-tracker.html` displaying Token (e.g. `T-101`) and order timeline.
2. **Cancellation Flow**:
   - While order is in `confirmed` status, click "Cancel This Order".
   - Verify status transitions to "Cancelled" and portion stock is restored.
3. **Kitchen Ticket Flow**:
   - Click "Sign In / Demo" and select "Staff".
   - Navigate to [http://localhost:3000/kitchen.html](http://localhost:3000/kitchen.html).
   - Find active ticket and click "Start Preparing".
   - Verify card transitions to Preparing (`status-preparing`).
   - Click "Mark Ready for Pickup".
   - Click "Handed to Student (Collected)".
4. **Staff Stock Management**:
   - Navigate to [http://localhost:3000/staff.html](http://localhost:3000/staff.html).
   - Change a stock portion count and click "Save".
   - Click "Mark Sold Out" and verify the item disables in the student menu.
5. **Peak Analytics**:
   - Navigate to [http://localhost:3000/analytics.html](http://localhost:3000/analytics.html).
   - Review hourly demand bar chart and pickup window occupancy gauges.
