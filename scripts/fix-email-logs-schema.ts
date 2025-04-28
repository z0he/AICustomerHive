import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script fixes the email_logs table schema to match what the application expects
 */
async function fixEmailLogsSchema() {
  console.log("Fixing email_logs table schema...");

  try {
    // First drop any existing inconsistent columns
    console.log("Checking existing columns...");
    
    const columnsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_logs';
    `);
    
    const columns = columnsCheck.map((row: any) => row.column_name);
    console.log("Current columns:", columns);

    // Drop existing constraint if it exists
    try {
      console.log("Dropping existing not-null constraints...");
      // Drop constraints on "from" and "to" columns if they exist
      if (columns.includes('from')) {
        await db.execute(sql`ALTER TABLE email_logs ALTER COLUMN "from" DROP NOT NULL;`);
      }
      if (columns.includes('to')) {
        await db.execute(sql`ALTER TABLE email_logs ALTER COLUMN "to" DROP NOT NULL;`);
      }
    } catch (e) {
      console.log("Error dropping constraints (this might be normal):", e);
    }

    // Create new columns with correct structure
    if (!columns.includes('from_address')) {
      console.log("Adding from_address column...");
      await db.execute(sql`ALTER TABLE email_logs ADD COLUMN from_address TEXT;`);
    }

    if (!columns.includes('to_address')) {
      console.log("Adding to_address column...");
      await db.execute(sql`ALTER TABLE email_logs ADD COLUMN to_address TEXT;`);
    }

    // Copy data from old columns if they exist
    if (columns.includes('from')) {
      console.log("Copying data from 'from' to 'from_address'...");
      await db.execute(sql`
        UPDATE email_logs 
        SET from_address = "from" 
        WHERE from_address IS NULL AND "from" IS NOT NULL;
      `);
      
      // Now drop the old column
      console.log("Dropping 'from' column...");
      await db.execute(sql`ALTER TABLE email_logs DROP COLUMN "from";`);
    }

    if (columns.includes('to')) {
      console.log("Copying data from 'to' to 'to_address'...");
      await db.execute(sql`
        UPDATE email_logs 
        SET to_address = "to" 
        WHERE to_address IS NULL AND "to" IS NOT NULL;
      `);
      
      // Now drop the old column
      console.log("Dropping 'to' column...");
      await db.execute(sql`ALTER TABLE email_logs DROP COLUMN "to";`);
    }

    // Ensure not-null constraints on the new columns
    console.log("Adding NOT NULL constraints to new columns...");
    await db.execute(sql`ALTER TABLE email_logs ALTER COLUMN from_address SET NOT NULL;`);
    await db.execute(sql`ALTER TABLE email_logs ALTER COLUMN to_address SET NOT NULL;`);

    console.log("Schema fixed successfully!");
  } catch (error) {
    console.error("Error fixing email_logs schema:", error);
    process.exit(1);
  }

  console.log("Email logs schema update completed");
  process.exit(0);
}

fixEmailLogsSchema();