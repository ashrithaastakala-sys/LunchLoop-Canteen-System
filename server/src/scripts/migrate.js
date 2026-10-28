const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

async function runMigrations() {
  const clientConfig = {
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    user: 'postgres.nvlnzdlokbpttpealgqj',
    password: process.env.DB_PASSWORD || 'N6K8kaqp/9/,@c7',
    port: 5432,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  };

  console.log('🔄 Connecting to Supabase PostgreSQL at aws-0-ap-northeast-1.pooler.supabase.com...');
  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database successfully!');

    const files = [
      'supabase/migrations/001_initial_schema.sql',
      'supabase/migrations/002_create_constraints_and_indexes.sql',
      'supabase/migrations/003_rls_and_policies.sql',
      'supabase/migrations/004_rpc_atomic_order_and_cancel.sql',
      'supabase/seed.sql',
    ];

    for (const relPath of files) {
      const fullPath = path.resolve(__dirname, '../../../', relPath);
      console.log(`⏳ Applying ${relPath}...`);
      const sql = fs.readFileSync(fullPath, 'utf8');
      await client.query(sql);
      console.log(`✅ Applied ${relPath}`);
    }

    console.log('\n🎉 All migrations and seed data have been applied successfully to Supabase!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
