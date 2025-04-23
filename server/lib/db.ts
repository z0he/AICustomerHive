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
 * Manages database transactions to ensure atomic operations
 * 
 * This uses the raw Postgres client rather than the Drizzle ORM's
 * transaction features to ensure maximum control over the transaction.
 */
export class TransactionManager {
  /**
   * Executes a function within a transaction
   * 
   * @param fn Function that receives the database client and returns a promise
   * @returns The result of the function
   * 
   * Example usage:
   * ```typescript
   * const result = await TransactionManager.execute(async (db) => {
   *   const user = await db.insert(users).values({ name: 'New User' }).returning();
   *   const profile = await db.insert(profiles).values({ userId: user[0].id }).returning();
   *   return { user: user[0], profile: profile[0] };
   * });
   * ```
   */
  public static async execute<T>(fn: (db: typeof db) => Promise<T>): Promise<T> {
    // Create a dedicated connection for this transaction
    const client = postgres(connectionString, { max: 1 });
    
    try {
      // Begin transaction
      await client`BEGIN`;
      
      // Create a transaction-specific db instance
      const transactionDb = drizzle(client, { schema });
      
      // Execute the function
      const result = await fn(transactionDb);
      
      // If we got here without errors, commit the transaction
      await client`COMMIT`;
      
      return result;
    } catch (error) {
      // If an error occurred, roll back the transaction
      try {
        await client`ROLLBACK`;
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      
      // Re-throw the original error
      throw error;
    } finally {
      // Always close the client
      try {
        await client.end();
      } catch (closeError) {
        console.error('Error closing transaction client:', closeError);
      }
    }
  }
}

// Export the raw query client for when we need direct access
export { queryClient };