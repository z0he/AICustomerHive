import { db } from '../server/lib/db';
import { sql } from 'drizzle-orm';

async function addGoogleIdColumn() {
  try {
    console.log('Adding google_id column to users table...');
    
    // Check if the column already exists
    const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'google_id'
    `;
    
    const columnExists = await db.execute(checkColumnQuery);
    
    if (columnExists.length > 0) {
      console.log('google_id column already exists. Skipping.');
      return;
    }
    
    // Add the column
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN google_id TEXT
    `);
    
    console.log('Successfully added google_id column to users table');
  } catch (error) {
    console.error('Error adding google_id column:', error);
    throw error;
  }
}

// Execute migration
addGoogleIdColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });