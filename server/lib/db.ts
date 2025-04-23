import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Create PostgreSQL connection with proper connection pooling
const connectionString = process.env.DATABASE_URL!;

// Connection pool for Drizzle ORM with optimized settings
const queryClient = postgres(connectionString, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Max seconds a client can be idle before being closed
  connect_timeout: 10, // Max seconds to wait for a connection
  prepare: false, // Auto-prepare statements - use true in production
});

// Create Drizzle ORM instance
export const db = drizzle(queryClient, { schema });

/**
 * Execute database operations using a simplified transaction pattern
 * 
 * This function creates a wrapper around multiple database operations to be run
 * together, with error handling that will rollback if any operation fails.
 * 
 * Usage example:
 * ```
 * const result = await executeTransaction(async () => {
 *   // Perform multiple operations that should be atomic
 *   await db.insert(users).values({ name: 'User 1' });
 *   await db.insert(users).values({ name: 'User 2' });
 *   return { success: true };
 * });
 * ```
 */
export async function executeTransaction<T>(
  callback: () => Promise<T>
): Promise<T> {
  try {
    // Start transaction with a query
    await db.execute(sql`BEGIN`);
    
    // Run the callback operations
    const result = await callback();
    
    // If successful, commit
    await db.execute(sql`COMMIT`);
    
    return result;
  } catch (error) {
    // If any error, rollback
    await db.execute(sql`ROLLBACK`).catch(e => {
      console.error("Error during rollback:", e);
    });
    
    throw error;
  }
}

// Export the raw query client for when we need direct access
export { queryClient };