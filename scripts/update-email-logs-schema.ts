import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script updates the email_logs table schema by fixing column names
 */
async function updateEmailLogsSchema() {
  console.log("Checking if email_logs table needs to be updated...");

  try {
    // Check required columns
    async function checkColumnExists(columnName: string): Promise<boolean> {
      const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'email_logs' AND column_name = ${columnName};
      `);
      return result.length > 0;
    }

    // Handle from column
    const hasFromAddress = await checkColumnExists('from_address');
    const hasFrom = await checkColumnExists('from');
    
    if (!hasFromAddress && hasFrom) {
      console.log("Renaming 'from' column to 'from_address'...");
      await db.execute(sql`ALTER TABLE email_logs RENAME COLUMN "from" TO from_address;`);
      console.log("Successfully renamed 'from' to 'from_address'");
    } else if (!hasFromAddress) {
      console.log("Adding from_address column...");
      await db.execute(sql`ALTER TABLE email_logs ADD COLUMN from_address TEXT NOT NULL DEFAULT '';`);
      console.log("Successfully added from_address column");
    } else {
      console.log("from_address column already exists correctly");
    }

    // Handle to column
    const hasToAddress = await checkColumnExists('to_address');
    const hasTo = await checkColumnExists('to');
    
    if (!hasToAddress && hasTo) {
      console.log("Renaming 'to' column to 'to_address'...");
      await db.execute(sql`ALTER TABLE email_logs RENAME COLUMN "to" TO to_address;`);
      console.log("Successfully renamed 'to' to 'to_address'");
    } else if (!hasToAddress) {
      console.log("Adding to_address column...");
      await db.execute(sql`ALTER TABLE email_logs ADD COLUMN to_address TEXT NOT NULL DEFAULT '';`);
      console.log("Successfully added to_address column");
    } else {
      console.log("to_address column already exists correctly");
    }

  } catch (error) {
    console.error("Error updating email_logs schema:", error);
    process.exit(1);
  }

  console.log("Email logs schema update completed");
  process.exit(0);
}

updateEmailLogsSchema();