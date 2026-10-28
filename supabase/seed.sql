-- ============================================================================
-- LunchLoop: Canteen Pre-Order and Peak-Hour Queue Management
-- Seed Data: Demonstration & Testing Dataset (Valid UUID hex digits 0-9, a-f)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. APP SETTINGS
-- ----------------------------------------------------------------------------
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES 
    ('canteen_info', '{
        "name": "Campus Central Canteen",
        "campus": "College of Engineering & Technology",
        "location": "Student Activity Center, Ground Floor",
        "operating_hours": "08:00 AM - 06:30 PM",
        "peak_hours": "12:30 PM - 02:00 PM",
        "contact_phone": "+91 98765 43210",
        "contact_email": "canteen@campus.edu",
        "payment_policy": "Pay upon pickup at Counter #2 or online tokens"
    }'::jsonb),
    ('order_rules', '{
        "cancellation_cutoff_minutes": 10,
        "max_items_per_order": 10,
        "max_quantity_per_item": 10,
        "default_window_capacity": 25,
        "is_preordering_active": true
    }'::jsonb)
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value, updated_at = now();

-- ----------------------------------------------------------------------------
-- 2. MENU CATEGORIES
-- ----------------------------------------------------------------------------
INSERT INTO public.menu_categories (id, name, slug, display_order, active)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Breakfast & Tiffin', 'breakfast', 1, true),
    ('c2222222-2222-2222-2222-222222222222', 'Meals & Biryani', 'meals', 2, true),
    ('c3333333-3333-3333-3333-333333333333', 'Quick Snacks & Rolls', 'snacks', 3, true),
    ('c4444444-4444-4444-4444-444444444444', 'Hot & Cold Beverages', 'beverages', 4, true),
    ('c5555555-5555-5555-5555-555555555555', 'Gen-Z Munchies & Vibe Check ⚡', 'genz-munchies', 5, true)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, display_order = EXCLUDED.display_order;

-- ----------------------------------------------------------------------------
-- 3. MENU ITEMS (14 authentic Indian college canteen items)
-- Includes regular stock, low-stock (<=5), and sold-out (available_quantity = 0)
-- ----------------------------------------------------------------------------
INSERT INTO public.menu_items (id, category_id, name, description, price, available_quantity, low_stock_threshold, is_available, is_vegetarian, allergens, prep_time_minutes)
VALUES
    -- Breakfast items
    ('ba111111-1111-1111-1111-111111111101', 'c1111111-1111-1111-1111-111111111111', 
     'Crispy Masala Dosa', 'Golden fermented rice crepe stuffed with spiced potato masala, served with fresh coconut chutney & piping hot sambar.', 
     60.00, 25, 5, true, true, ARRAY['Mustard'], 6),

    ('ba111111-1111-1111-1111-111111111102', 'c1111111-1111-1111-1111-111111111111', 
     'Steamed Idli with Sambar (3 pcs)', 'Soft, fluffy steamed fermented rice cakes served with aromatic vegetable sambar and tomato-onion chutney.', 
     40.00, 30, 5, true, true, ARRAY['Mustard'], 4),

    ('ba111111-1111-1111-1111-111111111103', 'c1111111-1111-1111-1111-111111111111', 
     'Chole Bhature (2 pcs)', 'Spicy chickpea curry paired with deep-fried puffy bhature, pickled green chilies and sliced red onions.', 
     75.00, 18, 5, true, true, ARRAY['Gluten'], 8),

    ('ba111111-1111-1111-1111-111111111104', 'c1111111-1111-1111-1111-111111111111', 
     'Poha with Roasted Peanuts', 'Light flattened rice tempered with curry leaves, mustard seeds, turmeric, green chillies and crunchy peanuts.', 
     35.00, 4, 5, true, true, ARRAY['Peanuts', 'Mustard'], 5), -- LOW STOCK!

    -- Meals items
    ('ba222222-2222-2222-2222-222222222201', 'c2222222-2222-2222-2222-222222222222', 
     'Hyderabadi Veg Dum Biryani', 'Fragrant basmati rice layered with garden vegetables, fried onions, mint, and slow-cooked in sealed dum pot with raita.', 
     90.00, 20, 5, true, true, ARRAY['Dairy'], 10),

    ('ba222222-2222-2222-2222-222222222202', 'c2222222-2222-2222-2222-222222222222', 
     'Veg Fried Rice with Manchurian Gravy', 'Wok-tossed long-grain rice with seasonal greens paired with vegetable dumplings in savoury soy garlic gravy.', 
     85.00, 15, 5, true, true, ARRAY['Soy', 'Gluten'], 7),

    ('ba222222-2222-2222-2222-222222222203', 'c2222222-2222-2222-2222-222222222222', 
     'South Indian Curd Rice', 'Tempered basmati rice with creamy yoghurt, mustard seeds, ginger, pomegranate kernels and crisp papad.', 
     45.00, 22, 5, true, true, ARRAY['Dairy', 'Mustard'], 3),

    ('ba222222-2222-2222-2222-222222222204', 'c2222222-2222-2222-2222-222222222222', 
     'Tangy Lemon Rice', 'Zesty rice tempered with roasted chana dal, peanuts, curry leaves, fresh lemon juice and green chilies.', 
     45.00, 0, 5, false, true, ARRAY['Peanuts', 'Mustard'], 4), -- SOLD OUT!

    -- Snacks items
    ('ba333333-3333-3333-3333-333333333301', 'c3333333-3333-3333-3333-333333333333', 
     'Paneer Tikka Kathi Roll', 'Whole-wheat flatbread wrapped around marinated grilled paneer cubes, crunchy peppers, onions and mint chutney.', 
     70.00, 14, 5, true, true, ARRAY['Dairy', 'Gluten'], 6),

    ('ba333333-3333-3333-3333-333333333302', 'c3333333-3333-3333-3333-333333333333', 
     'Crispy Punjabi Samosa (2 pcs)', 'Spiced potato and sweet green pea pastry fried crisp, served with tangy tamarind and mint chutney.', 
     30.00, 3, 5, true, true, ARRAY['Gluten'], 3), -- LOW STOCK!

    ('ba333333-3333-3333-3333-333333333303', 'c3333333-3333-3333-3333-333333333333', 
     'Grilled Cheese Veg Sandwich', 'Toasted bread loaded with sliced cucumber, tomato, beetroot, green chutney and melted cheese.', 
     50.00, 16, 5, true, true, ARRAY['Dairy', 'Gluten'], 5),

    -- Beverages
    ('ba444444-4444-4444-4444-444444444401', 'c4444444-4444-4444-4444-444444444444', 
     'Adrak Masala Chai', 'Strong brewed Assam tea simmered with fresh crushed ginger, green cardamom and milk.', 
     15.00, 50, 10, true, true, ARRAY['Dairy'], 3),

    ('ba444444-4444-4444-4444-444444444402', 'c4444444-4444-4444-4444-444444444444', 
     'South Indian Filter Coffee', 'Traditional chicory-infused decoction frothed with boiling whole milk.', 
     20.00, 40, 10, true, true, ARRAY['Dairy'], 3),

    ('ba444444-4444-4444-4444-444444444403', 'c4444444-4444-4444-4444-444444444444', 
     'Fresh Sweet & Salt Lime Soda', 'Freshly squeezed Indian key limes with chilled bubbly soda, black salt and mint sprig.', 
     25.00, 35, 10, true, true, '{}', 2),

    -- Gen-Z Coded Munchies & Refreshers
    ('ba555555-5555-5555-5555-555555555501', 'c5555555-5555-5555-5555-555555555555',
     'Main Character Energy Cheese Maggi', 'Double tastemaker, melted cheddar, butter glaze & spring onions. Perfect for curing assignment depression. No cap.',
     55.00, 40, 10, true, true, ARRAY['Dairy', 'Gluten'], 5),

    ('ba555555-5555-5555-5555-555555555502', 'c5555555-5555-5555-5555-555555555555',
     'No Cap Peri Peri Crinkle Fries', 'Extra crispy crinkle fries heavily tossed in fiery African peri-peri dust & spicy sriracha mayo. Hits different.',
     65.00, 35, 8, true, true, ARRAY['Gluten'], 6),

    ('ba555555-5555-5555-5555-555555555503', 'c4444444-4444-4444-4444-444444444444',
     'Sigma Double-Shot Cold Frappe', 'Intense double espresso blended with creamy vanilla, dark chocolate drizzle & cold foam. 100% grindset, zero sleep.',
     70.00, 30, 5, true, true, ARRAY['Dairy'], 4),

    ('ba555555-5555-5555-5555-555555555504', 'c3333333-3333-3333-3333-333333333333',
     'Rizz Paneer Tikka Loaded Roll', 'Charred smoky malai paneer cubes wrapped in flaky laccha paratha with mint glaze & pickled onions. Certified rizz.',
     85.00, 25, 6, true, true, ARRAY['Dairy', 'Gluten'], 7),

    ('ba555555-5555-5555-5555-555555555505', 'c5555555-5555-5555-5555-555555555555',
     'Bussin Kurkure Crunchy Momos (6 pcs)', 'Crispy spiced crumb-crusted vegetable momos served with devilishly spicy roasted garlic red chutney. Pure fire.',
     75.00, 28, 6, true, true, ARRAY['Gluten', 'Soy'], 8),

    ('ba555555-5555-5555-5555-555555555506', 'c4444444-4444-4444-4444-444444444444',
     'Delulu Electric Blue Lemon Fizz', 'Chilled sparkling blue curacao refresher with crushed mint, sea salt & citrus splash. For when you think attendance will be condoned.',
     45.00, 50, 10, true, true, '{}', 3),

    ('ba555555-5555-5555-5555-555555555507', 'c5555555-5555-5555-5555-555555555555',
     'Vibe Check Loaded Jalapeno Nachos', 'Crunchy tortilla rounds drowning in warm molten queso, pickled jalapeños, sweet corn & tomato-herb salsa.',
     80.00, 20, 5, true, true, ARRAY['Dairy'], 5),

    ('ba555555-5555-5555-5555-555555555508', 'c5555555-5555-5555-5555-555555555555',
     'Slay Cheesy Garlic Pull-Apart Baguette', 'Herbed garlic butter toasties with stretchy mozzarella pulls. Ate and left no crumbs.',
     70.00, 22, 5, true, true, ARRAY['Dairy', 'Gluten'], 6),

    ('ba555555-5555-5555-5555-555555555509', 'c4444444-4444-4444-4444-444444444444',
     'Aesthetic Brown Sugar Boba Frappe', 'Slow-steeped royal black milk tea with brown sugar tiger syrup & soft chewy tapioca boba pearls. Very demure, very mindful.',
     90.00, 18, 4, true, true, ARRAY['Dairy'], 4),

    ('ba555555-5555-5555-5555-555555555510', 'c5555555-5555-5555-5555-555555555555',
     'Lowkey Addictive Spicy Crispy Corn', 'Wok-fried sweet corn tossed in schezwan spices, crushed garlic, spring onions & lemon zest. Dangerously munchable.',
     60.00, 25, 5, true, true, '{}', 5)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    price = EXCLUDED.price, 
    available_quantity = EXCLUDED.available_quantity,
    is_available = EXCLUDED.is_available;

-- ----------------------------------------------------------------------------
-- 4. PICKUP WINDOWS (Spanning today and upcoming time slots)
-- ----------------------------------------------------------------------------
INSERT INTO public.pickup_windows (id, starts_at, ends_at, capacity, reserved_count, is_active)
VALUES
    ('fa111111-1111-1111-1111-111111111101', 
     (CURRENT_DATE + INTERVAL '12 hours')::TIMESTAMPTZ, 
     (CURRENT_DATE + INTERVAL '12 hours 20 minutes')::TIMESTAMPTZ, 
     20, 6, true),

    ('fa111111-1111-1111-1111-111111111102', 
     (CURRENT_DATE + INTERVAL '12 hours 20 minutes')::TIMESTAMPTZ, 
     (CURRENT_DATE + INTERVAL '12 hours 40 minutes')::TIMESTAMPTZ, 
     25, 12, true),

    ('fa111111-1111-1111-1111-111111111103', 
     (CURRENT_DATE + INTERVAL '12 hours 40 minutes')::TIMESTAMPTZ, 
     (CURRENT_DATE + INTERVAL '13 hours')::TIMESTAMPTZ, 
     30, 28, true), -- HIGH PEAK DEMAND

    ('fa111111-1111-1111-1111-111111111104', 
     (CURRENT_DATE + INTERVAL '13 hours')::TIMESTAMPTZ, 
     (CURRENT_DATE + INTERVAL '13 hours 20 minutes')::TIMESTAMPTZ, 
     30, 15, true),

    ('fa111111-1111-1111-1111-111111111105', 
     (CURRENT_DATE + INTERVAL '13 hours 20 minutes')::TIMESTAMPTZ, 
     (CURRENT_DATE + INTERVAL '13 hours 40 minutes')::TIMESTAMPTZ, 
     25, 8, true),

    ('fa111111-1111-1111-1111-111111111106', 
     (CURRENT_DATE + INTERVAL '13 hours 40 minutes')::TIMESTAMPTZ, 
     (CURRENT_DATE + INTERVAL '14 hours')::TIMESTAMPTZ, 
     20, 4, true)
ON CONFLICT (id) DO UPDATE 
SET starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, capacity = EXCLUDED.capacity;
