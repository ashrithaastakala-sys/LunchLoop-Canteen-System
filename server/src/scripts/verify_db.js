const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { getSupabaseClient } = require('../config/supabase');

async function verifyAll() {
  console.log('--- 1. POOLER & CONNECTION TEST ---');
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    user: 'postgres.nvlnzdlokbpttpealgqj',
    password: process.env.DB_PASSWORD || 'N6K8kaqp/9/,@c7',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const info = await client.query('SELECT current_database(), current_user, version()');
  console.log('Database Name:', info.rows[0].current_database);
  console.log('User Role:', info.rows[0].current_user);
  console.log('Engine:', info.rows[0].version.split(' on ')[0]);

  console.log('\n--- 2. RPC CONCURRENCY FUNCTIONS ---');
  const rpcRes = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('create_order_atomic', 'cancel_order_atomic', 'update_order_status_atomic')
  `);
  console.log('Atomic RPC Functions in Supabase:', rpcRes.rows.map(r => r.routine_name).join(', '));

  console.log('\n--- 3. ROW LEVEL SECURITY (RLS) STATUS ---');
  const rlsRes = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  rlsRes.rows.forEach(r => console.log(`   * ${r.tablename.padEnd(20)}: RLS ${r.rowsecurity ? 'ENABLED' : 'DISABLED'}`));

  console.log('\n--- 4. SUPABASE REST CLIENT VALIDATION ---');
  const supabase = getSupabaseClient();
  const { count, error } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Supabase REST client query error:', error);
  } else {
    console.log('Supabase REST API successfully queried orders count:', count);
  }

  await client.end();
}

verifyAll().catch(e => {
  console.error(e);
  process.exit(1);
});
