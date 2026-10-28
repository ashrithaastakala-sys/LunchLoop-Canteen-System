# 🍱 LunchLoop: Canteen Pre-Order & Peak-Hour Queue Management System

> **Skip the queue. Keep your break.**  
> A full-stack, database-backed web application designed for college campus canteens to eliminate long lunch lines, prevent dish overselling, organize kitchen preparation, and provide real-time operational analytics.

[![Tests](https://img.shields.io/badge/tests-20%20passed-brightgreen.svg)](#5-automated-testing)
[![PostgreSQL](https://img.shields.io/badge/database-Supabase%20PostgreSQL%2017-blue.svg)](#database--authentication)
[![Frontend](https://img.shields.io/badge/frontend-Vanilla%20HTML5%20%2F%20CSS3%20%2F%20ES6+-orange.svg)](#frontend)
[![Zero-Login](https://img.shields.io/badge/access-Zero--Login%20Demo-success.svg)](#4-zero-login-architecture)

---

## 1. Project Overview & Problem Statement

College students often have short lunch breaks (35 to 45 minutes). Long queues, uncertain food availability, manual counter ordering, stock confusion, and poorly coordinated preparation frequently waste 20 to 30 minutes of valuable break time.

Meanwhile, canteen operators and kitchen staff struggle to predict peak-hour lunch demand, manage dish portion quantities, coordinate orders, and communicate pickup readiness.

**LunchLoop** solves this bottleneck by providing:
- **For Students:** Live menu availability in Indian Rupees (₹), dietary tags (Pure Vegetarian), atomic cart reservation, guaranteed 20-minute pickup windows, unique pickup tokens (e.g. `T-101`), printable digital pickup passes, and real-time order lifecycle tracking (Confirmed &rarr; Preparing &rarr; Ready &rarr; Collected).
- **For Kitchen Staff:** A dedicated Kitchen Display System (KDS) queue board with elapsed queue timers, instant token search, audio arrival chimes, live stock adjusters with instant "Sold Out" toggles, and pickup window capacity controls.
- **For Canteen Management:** Data-driven peak-hour analytics with hourly demand curves, window occupancy rates, top-ordered dishes, stock mutation audit trails, and 1-click CSV shift report export.

---

## 2. Technology Stack

### Frontend
- **HTML5:** Semantic, accessible markup with landmark navigation and skip links.
- **CSS3:** Custom responsive design system with Flexbox, CSS Grid, and custom variables matching the college campus visual identity:
  - Warm Cream (`#FFF8ED`), Tomato Red (`#E94B35`), Basil Green (`#287A50`), Deep Charcoal (`#252823`).
  - Native CSS/SVG bar charts and occupancy meters.
  - Dedicated `@media print` styling for thermal canteen token slips.
  - Zero external UI libraries (No React, Vue, Bootstrap, or Tailwind).
- **Vanilla JavaScript:** Native Fetch API client, state management, safe DOM escaping (`escapeHTML`) preventing XSS, Web Audio API synthesizer for kitchen arrival chimes, and visibility-aware polling refresh.

### Backend
- **Node.js & Express.js:** Layered REST API architecture with separated routes, controllers, services, repositories, validators, and middleware.
- **Security:** Helmet-style headers, CORS, sliding-window rate limiting, 500kb payload size limits, parameterized database access, and centralized error masking.
- **Response Format:** Uniform JSON envelope (`{ success: true, data: ..., meta: ... }` / `{ success: false, error: { code, message, details } }`).

### Database & Concurrency Guardrails
- **Supabase PostgreSQL 17:** Relational database with foreign keys, checks, indexes, and automated `updated_at` triggers.
- **AWS Connection Pooler:** Routed through `aws-0-ap-northeast-1.pooler.supabase.com:5432` to guarantee IPv4 compatibility without `ENOTFOUND` domain issues.
- **Atomic Transactions (RPCs):** PostgreSQL stored functions (`create_order_atomic`, `cancel_order_atomic`, `update_order_status_atomic`) with explicit row locking (`SELECT FOR UPDATE`) to guarantee zero overselling and zero race conditions under concurrent submissions.
- **Row Level Security (RLS):** Strict multi-tenant data isolation ensuring students can only access their own private orders.
- **Dynamic Pickup Windows:** Automatic rolling generation of upcoming 20-minute windows relative to `NOW()` so evaluators on any date never encounter expired slots.

---

## 3. Project Structure

```
lunchloop/
├── public/                     # Static frontend client (No build step required)
│   ├── favicon.svg             # Custom SVG brand favicon
│   ├── index.html              # Public landing page & SAC canteen info
│   ├── menu.html               # Student menu, search, filters & cart
│   ├── orders.html             # Student order history & tokens
│   ├── order-tracker.html      # Live token tracker, timeline & printable pass
│   ├── kitchen.html            # Kitchen Display System (KDS) board with search & chime
│   ├── staff.html              # Staff inventory & window operations
│   ├── analytics.html          # Peak-hour analytics & CSV shift report export
│   ├── css/
│   │   ├── styles.css          # Design tokens, variables & typography
│   │   ├── components.css      # Cards, steppers, badges, tables & print styles
│   │   └── responsive.css      # Breakpoints (360px, 390px, 768px, 1024px)
│   └── js/
│       ├── api.js              # Fetch client, auth headers, toasts & XSS filter
│       ├── auth.js             # Zero-barrier role switcher (Student <-> Staff)
│       ├── cart.js             # Tray state, subtotal & atomic checkout
│       ├── menu.js             # Menu fetching, search & dietary filtering
│       ├── tracker.js          # Live token display, stepper & auto-refresh
│       ├── orders.js           # Order history list & status filters
│       ├── kitchen.js          # Kitchen ticket cards, elapsed timers & audio chime
│       ├── staff.js            # Live stock adjustments & window toggles
│       └── analytics.js        # Hourly demand charts, KPIs & CSV exporter
│
├── server/                     # Layered Express REST API backend
│   ├── src/
│   │   ├── app.js              # Express app setup & middleware
│   │   ├── server.js           # Server listen & graceful shutdown
│   │   ├── config/             # Environment & Supabase initialization
│   │   ├── routes/             # REST route definitions
│   │   ├── controllers/        # Request handling & JSON response formatting
│   │   ├── services/           # Business logic & workflow orchestration
│   │   ├── repositories/       # Database queries & Supabase RPC calls
│   │   ├── middleware/         # Auth, roles, rate limiter & error handling
│   │   ├── validators/         # Input schemas (orders, menu, windows)
│   │   ├── utils/              # Date formatters & response helpers
│   │   └── errors/             # Custom AppError class
│   └── tests/
│       ├── unit/               # Business rules & validation unit tests
│       └── api/                # Integration API tests with Supertest
│
├── supabase/                   # Database migrations & seed data
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_create_constraints_and_indexes.sql
│   │   ├── 003_rls_and_policies.sql
│   │   └── 004_rpc_atomic_order_and_cancel.sql
│   └── seed.sql                # 23 authentic & Gen-Z canteen items & demo orders
│
└── README.md
```

---

## 4. Zero-Login Architecture

To eliminate cognitive friction for academic evaluators, hackathons, and demonstrations:
- **No Login Barriers:** Anyone can immediately browse dishes, add meals to their tray, reserve pickup windows, and place orders without entering passwords.
- **Relational Integrity:** Unauthenticated client requests automatically default to pre-provisioned demo accounts (`DEFAULT_STUDENT_USER` / `DEFAULT_STAFF_USER`), maintaining 100% database foreign-key integrity in Supabase.
- **One-Click Role Switcher:** In the top navigation bar, click the **Switch to Staff / Student** pill to instantly toggle views between campus student and canteen chef.

---

## 5. Live Navigation & URLs

When the application is running locally:

| Page | URL | Key Features |
| :--- | :--- | :--- |
| **Home / Landing** | `http://localhost:3000/` | Hero section, today's operating hours, SAC canteen info, quick stats |
| **Today's Menu** | `http://localhost:3000/menu.html` | 23 items, category filters, pure-veg toggle, prep-time sort, tray drawer |
| **My Orders** | `http://localhost:3000/orders.html` | View recent orders with active status chips and tokens |
| **Live Order Tracker** | `http://localhost:3000/order-tracker.html` | Large pickup token (`T-101`), 4-stage stepper, cancel timer, printable pass |
| **Kitchen Queue (KDS)** | `http://localhost:3000/kitchen.html` | Chef board: elapsed queue timers, instant search, audio arrival chimes |
| **Staff Operations** | `http://localhost:3000/staff.html` | Portion stock manager, instant "Mark Sold Out", create new dishes |
| **Peak Analytics** | `http://localhost:3000/analytics.html` | Hourly demand curve, window capacity bars, 1-click CSV shift report export |

---

## 6. How to Run the Project

### Prerequisites
- Node.js v20.x LTS or higher
- npm 10.x or higher

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env` or verify the pre-configured credentials:
```env
PORT=3000
NODE_ENV=development
CAMPUS_TIMEZONE=Asia/Kolkata
SUPABASE_URL=https://nvlnzdlokbpttpealgqj.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DB_HOST=aws-0-ap-northeast-1.pooler.supabase.com
DB_USER=postgres.nvlnzdlokbpttpealgqj
DB_PASSWORD=...
DB_PORT=5432
DB_NAME=postgres
```

### Step 3: Run Database Migrations (Optional - Already applied to live DB)
```bash
npm run migrate
```

### Step 4: Start the Server
```bash
# Starts the server at http://localhost:3000
npm start
```

---

## 7. Automated Testing

Run the automated test suite verifying all 20 business rules, security boundaries, and API routes:

```bash
npm test
```

### Verified Test Results (20/20 Passed)
- **8 API Integration Tests:** Health checks, public canteen info, zero-login student orders, validation failure handling, kitchen queue access, analytics overview, admin security boundaries, and 404 handler.
- **12 Business Rules Unit Tests:** Order payloads, non-zero positive quantities, 10-portion max limit, status progression state machines, 10-minute cancellation cutoff calculations, stock adjustments, and pickup window chronological validity.

---

## 8. Complete User Workflows

### Student Pre-Order & Pickup Workflow
1. Open [http://localhost:3000/menu.html](http://localhost:3000/menu.html).
2. Browse through categories or click **"Gen-Z Munchies & Vibe Check ⚡"**.
3. Click **"+ Add to Tray"** on any available dish (e.g. *Main Character Energy Cheese Maggi* or *Peri Peri Crinkle Fries*).
4. Open your tray, select an upcoming **Pickup Window**, add optional notes, and click **"Confirm Pre-Order (Pay at Pickup)"**.
5. The system atomically locks portion inventory, reserves window capacity, and generates your unique **Pickup Token** (e.g., `T-101`).
6. You are redirected to **`order-tracker.html`**, which automatically updates as the kitchen prepares your food.
7. Click **"🖨️ Print Pickup Slip / Save Pass"** to print or save your digital canteen token slip.

### Kitchen & Staff Operations Workflow
1. In the navbar, toggle to **Staff View** (or visit `/kitchen.html` directly).
2. Open **[Kitchen Queue](http://localhost:3000/kitchen.html)**:
   - Live elapsed timers (`✨ 2m ago`, `⚠️ 12m ago (Rush)`) indicate queue priorities.
   - An audio synthesizer chime alerts chefs whenever a new order is received.
   - Chefs can filter by stage or search tokens via the instant search input.
   - Click **"Start Preparing"** &rarr; **"Mark Ready for Pickup"** &rarr; **"Handed to Student (Collected)"**.
3. Open **[Staff Operations](http://localhost:3000/staff.html)**:
   - Adjust available stock portions inline and click **"Save"**.
   - Click **"Mark Sold Out"** to instantly disable an item in the student menu.
   - Click **"+ Add New Menu Item"** to introduce midday special items.
4. Open **[Analytics](http://localhost:3000/analytics.html)**:
   - Inspect the hourly demand curve (08:00 to 18:00) with peak rush highlighted.
   - Click **"📥 Export Shift Report (CSV)"** to instantly download the full operational shift log.

---

## 9. Security & Concurrency Highlights

- **Server-Side Price Calculation**: Total amounts are recalculated on the server directly from PostgreSQL records, preventing any client-side price tampering.
- **Atomic Transactions (`SELECT FOR UPDATE`)**: Concurrency race conditions and overselling are strictly prevented at the database level.
- **Tenant Isolation**: RLS policies prevent students from querying or canceling orders placed by other students.
- **No Client Secrets**: Service role keys are restricted exclusively to the backend.

---

## 10. License

This project is licensed under the **MIT License**.
