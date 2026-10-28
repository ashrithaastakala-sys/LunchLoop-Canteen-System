const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

async function seedGenZItems() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    user: 'postgres.nvlnzdlokbpttpealgqj',
    password: process.env.DB_PASSWORD || 'N6K8kaqp/9/,@c7',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Supabase to add Gen-Z coded menu items...');

    // 1. Add Gen Z Munchies category
    await client.query(`
      INSERT INTO public.menu_categories (id, name, slug, display_order, active)
      VALUES ('c5555555-5555-5555-5555-555555555555', 'Gen-Z Munchies & Vibe Check ⚡', 'genz-munchies', 5, true)
      ON CONFLICT (slug) DO UPDATE 
      SET name = EXCLUDED.name, display_order = EXCLUDED.display_order;
    `);
    console.log('Added Gen-Z category.');

    // 2. Add Gen Z menu items
    const sql = `
      INSERT INTO public.menu_items (id, category_id, name, description, price, available_quantity, low_stock_threshold, is_available, is_vegetarian, allergens, prep_time_minutes)
      VALUES
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
          description = EXCLUDED.description,
          price = EXCLUDED.price, 
          available_quantity = EXCLUDED.available_quantity,
          is_available = EXCLUDED.is_available,
          allergens = EXCLUDED.allergens,
          prep_time_minutes = EXCLUDED.prep_time_minutes;
    `;

    await client.query(sql);
    console.log('Successfully seeded 10 Gen-Z coded menu items into Supabase!');
  } catch (err) {
    console.error('Error seeding Gen-Z items:', err.message);
  } finally {
    await client.end();
  }
}

seedGenZItems();
