import { db } from '../server/lib/db';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running database migrations...');
  
  // Create tables if they don't exist
  try {
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        initials TEXT NOT NULL
      )
    `);
    console.log('✅ Users table migrated');

    // Create campaigns table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        target_audience TEXT NOT NULL,
        message TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        conversions INTEGER DEFAULT 0,
        percentage INTEGER DEFAULT 0
      )
    `);
    console.log('✅ Campaigns table migrated');

    // Create customers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        phone TEXT,
        company TEXT,
        job_title TEXT,
        linkedin_url TEXT,
        lifecycle_stage TEXT DEFAULT 'lead',
        lead_status TEXT,
        contact_industry TEXT,
        contact_owner TEXT,
        contact_source TEXT,
        contact_type TEXT,
        country TEXT,
        legal_basis TEXT,
        created_at TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'active'
      )
    `);
    console.log('✅ Customers table migrated');

    // Create customer_activities table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customer_activities (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        campaign TEXT,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'active'
      )
    `);
    console.log('✅ Customer activities table migrated');

    // Create leads table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        industry TEXT NOT NULL,
        location TEXT,
        score INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL
      )
    `);
    console.log('✅ Leads table migrated');

    // Create tasks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL
      )
    `);
    console.log('✅ Tasks table migrated');

    console.log('All tables have been migrated successfully!');
    
    // Insert a default user if users table is empty
    const usersCount = await db.select({ count: sql`count(*)` }).from(schema.users);
    if (parseInt(usersCount[0].count as string) === 0) {
      await db.insert(schema.users).values({
        username: 'johndoe',
        password: 'password',
        name: 'John Doe',
        initials: 'JD'
      } as any);
      console.log('✅ Created default user: johndoe / password');
    }
    
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });