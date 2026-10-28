-- ============================================================================
-- LunchLoop: Canteen Pre-Order and Peak-Hour Queue Management
-- Migration 002: Indexes and Integrity Constraints
-- ============================================================================

-- Fast lookup of profiles by role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Category filtering and ordering
CREATE INDEX IF NOT EXISTS idx_menu_categories_active_order ON public.menu_categories(active, display_order);

-- Menu items searching and filtering by category & availability
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available, available_quantity);
CREATE INDEX IF NOT EXISTS idx_menu_items_name_lower ON public.menu_items(lower(name));

-- Pickup windows querying active and by start time
CREATE INDEX IF NOT EXISTS idx_pickup_windows_starts ON public.pickup_windows(starts_at);
CREATE INDEX IF NOT EXISTS idx_pickup_windows_active_starts ON public.pickup_windows(is_active, starts_at);

-- Orders lookups by user (for student order history)
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
-- Orders lookups by pickup window (for staff queue and capacity tracking)
CREATE INDEX IF NOT EXISTS idx_orders_pickup_window ON public.orders(pickup_window_id);
-- Orders filtering by status & timestamp (for kitchen queue and peak-hour analytics)
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_public_order_no ON public.orders(public_order_number);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_token ON public.orders(pickup_token);

-- Order items lookup by order
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);

-- Inventory events by menu item & created_at (for stock change audit & analytics)
CREATE INDEX IF NOT EXISTS idx_inventory_events_item_created ON public.inventory_events(menu_item_id, created_at DESC);

-- Order status events by order & created_at (for timeline tracker & KPI calculation)
CREATE INDEX IF NOT EXISTS idx_order_status_events_order ON public.order_status_events(order_id, created_at);

-- Auto-update updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER set_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_pickup_windows_updated_at ON public.pickup_windows;
CREATE TRIGGER set_pickup_windows_updated_at
    BEFORE UPDATE ON public.pickup_windows
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER set_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
