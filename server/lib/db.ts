import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Create Neon database client - using neon with HTTP connection
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });