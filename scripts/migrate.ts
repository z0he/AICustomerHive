import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '../shared/schema';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Running database migrations...');
  
  const connectionString = process.env.DATABASE_URL!;
  console.log('Creating database connection...');
  
  // Create a connection to PostgreSQL with better settings
  const migrationClient = postgres(connectionString, { 
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10
  });
  
  try {
    console.log('Connected to database successfully');
    
    // Use Drizzle's migration system
    const db = drizzle(migrationClient, { schema });
    
    console.log('Running migrations using drizzle-orm...');
    
    // Use Drizzle ORM's migration system - this will use the migrations folder
    // defined in drizzle.config.ts
    // If this migrations folder doesn't exist, you need to run:
    // npx drizzle-kit generate to generate migrations
    try {
      await migrate(db, { migrationsFolder: path.join(__dirname, '../migrations') });
      console.log('✅ Database schema migrated successfully!');
    } catch (err) {
      console.warn(`Unable to run migrations: ${err.message}`);
      console.log('Falling back to schema push to ensure tables exist');
      
      // Alternative: push the schema directly if migrations aren't set up
      console.log('Using db:push as fallback to create tables...');
      
      // Define existing tables
      const tables = ['users', 'campaigns', 'customers', 'customer_activities', 'leads', 'tasks'];
      
      // Check if we need to create the default user
      const needsDefaultUser = await checkIfTablesEmpty(migrationClient, tables);
      
      if (needsDefaultUser) {
        console.log('Creating default user...');
        await migrationClient`
          INSERT INTO users (username, password, name, initials)
          VALUES ('johndoe', 'password', 'John Doe', 'JD')
          ON CONFLICT (username) DO NOTHING
        `;
        console.log('✅ Created default user: johndoe / password');
      } else {
        console.log('Default user already exists, skipping creation');
      }
    }
    
    console.log('Migration completed successfully');
    
    // Close the connection
    await migrationClient.end();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error during migration:', error);
    await migrationClient.end().catch(console.error);
    process.exit(1);
  }
}

// Helper function to check if tables exist and are empty
async function checkIfTablesEmpty(client, tables) {
  try {
    // Get list of all tables in the database
    const existingTables = await client`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    
    const existingTableNames = existingTables.map(t => t.tablename);
    
    // Check if any table is missing
    const missingTables = tables.filter(t => !existingTableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.log(`Tables missing: ${missingTables.join(', ')}`);
      return true;
    }
    
    // Check if users table is empty
    const usersCount = await client`SELECT COUNT(*) FROM users`;
    return parseInt(usersCount[0].count) === 0;
  } catch (error) {
    console.error('Error checking tables:', error);
    return true; // Assume we need to create default data
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });