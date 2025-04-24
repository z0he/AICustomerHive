import { db } from "../server/lib/db";
import { exec } from "child_process";
import { promisify } from "util";
import { leads } from "../shared/schema";
import { sql } from "drizzle-orm";

const execAsync = promisify(exec);

/**
 * This script performs manual migrations to update the leads table with new fields
 */
async function migrateLeadsTable() {
  try {
    console.log("Starting migration for leads table...");

    // First, run drizzle-kit push to create the new columns
    console.log("Running drizzle-kit push to add new columns...");
    const { stdout, stderr } = await execAsync("npm run db:push");
    
    console.log("drizzle-kit push output:");
    console.log(stdout);
    
    if (stderr) {
      console.error("drizzle-kit push stderr:", stderr);
    }
    
    console.log("Migration completed successfully!");
    
    // Check what columns we have
    console.log("Checking current lead table structure...");
    const columns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads'
    `);
    
    console.log("Current lead table columns:", columns.rows);
    
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateLeadsTable();