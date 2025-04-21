import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Create the database connection
const sql = neon(process.env.DATABASE_URL!);
// Type assertion to make TypeScript happy with this connection
export const db = drizzle(sql as any, { schema });