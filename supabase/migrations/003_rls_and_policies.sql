-- ============================================================================
-- LunchLoop: Canteen Pre-Order and Peak-Hour Queue Management
-- Migration 003: Row Level Security (RLS) & Access Policies
-- ============================================================================

-- Enable RLS on all exposed tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('staff', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "Users can update their own basic profile" ON public.profiles;
CREATE POLICY "Users can update their own basic profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        -- Prevent self-promotion: role must not change unless admin
        (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR public.is_admin())
    );

DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
CREATE POLICY "Admin can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- MENU CATEGORIES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active categories" ON public.menu_categories;
CREATE POLICY "Public can view active categories"
    ON public.menu_categories FOR SELECT
    USING (active = true OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "Staff and Admin can modify categories" ON public.menu_categories;
CREATE POLICY "Staff and Admin can modify categories"
    ON public.menu_categories FOR ALL
    USING (public.is_staff_or_admin());

-- ----------------------------------------------------------------------------
-- MENU ITEMS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
CREATE POLICY "Public can view menu items"
    ON public.menu_items FOR SELECT
    USING (is_available = true OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "Staff and Admin can manage menu items" ON public.menu_items;
CREATE POLICY "Staff and Admin can manage menu items"
    ON public.menu_items FOR ALL
    USING (public.is_staff_or_admin());

-- ----------------------------------------------------------------------------
-- PICKUP WINDOWS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active pickup windows" ON public.pickup_windows;
CREATE POLICY "Public can view active pickup windows"
    ON public.pickup_windows FOR SELECT
    USING (is_active = true OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "Staff and Admin can manage pickup windows" ON public.pickup_windows;
CREATE POLICY "Staff and Admin can manage pickup windows"
    ON public.pickup_windows FOR ALL
    USING (public.is_staff_or_admin());

-- ----------------------------------------------------------------------------
-- ORDERS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view their own orders" ON public.orders;
CREATE POLICY "Students can view their own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR public.is_staff_or_admin());

-- Insert/Update on orders is strictly handled via atomic RPCs or authenticated backend services
DROP POLICY IF EXISTS "Staff and Admin can update order status" ON public.orders;
CREATE POLICY "Staff and Admin can update order status"
    ON public.orders FOR UPDATE
    USING (public.is_staff_or_admin());

-- ----------------------------------------------------------------------------
-- ORDER ITEMS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view order items for their orders" ON public.order_items;
CREATE POLICY "Users can view order items for their orders"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR public.is_staff_or_admin())
        )
    );

-- ----------------------------------------------------------------------------
-- INVENTORY EVENTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff and Admin can view inventory events" ON public.inventory_events;
CREATE POLICY "Staff and Admin can view inventory events"
    ON public.inventory_events FOR SELECT
    USING (public.is_staff_or_admin());

-- ----------------------------------------------------------------------------
-- ORDER STATUS EVENTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view timeline for their orders" ON public.order_status_events;
CREATE POLICY "Users can view timeline for their orders"
    ON public.order_status_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_status_events.order_id
            AND (orders.user_id = auth.uid() OR public.is_staff_or_admin())
        )
    );

-- ----------------------------------------------------------------------------
-- APP SETTINGS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view application settings" ON public.app_settings;
CREATE POLICY "Public can view application settings"
    ON public.app_settings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin can manage application settings" ON public.app_settings;
CREATE POLICY "Admin can manage application settings"
    ON public.app_settings FOR ALL
    USING (public.is_admin());
