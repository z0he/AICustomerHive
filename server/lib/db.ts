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
 * Execute database operations within a transaction
 * 
 * Usage example:
 * ```
 * const result = await executeTransaction(async (tx) => {
 *   // Perform multiple operations in a transaction
 *   await tx.insert(users).values({ name: 'User 1' });
 *   await tx.insert(users).values({ name: 'User 2' });
 *   return { success: true };
 * });
 * ```
 */
export async function executeTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  let result: T;
  
  await queryClient.begin(async (sqlTransaction) => {
    const transaction = drizzle(sqlTransaction, { schema });
    result = await callback(transaction);
  });
  
  return result!;
}

// Export the raw query client for when we need direct access
export { queryClient };