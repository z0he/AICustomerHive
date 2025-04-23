import { db } from '../server/lib/db';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';

async function updateSchema() {
  try {
    console.log('Creating new schema for A/B testing...');
    
    // Add isABTestActive column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE campaigns
      ADD COLUMN IF NOT EXISTS is_ab_test_active BOOLEAN DEFAULT FALSE
    `);
    
    // Create message_variants table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS message_variants (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        variant_name TEXT NOT NULL,
        message TEXT NOT NULL,
        impressions INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        conversion_rate INTEGER DEFAULT 0,
        is_control BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log('Schema updated successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
  }
}

updateSchema()
  .then(() => {
    console.log('Migration complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });