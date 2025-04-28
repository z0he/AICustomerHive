import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script updates the email_logs table schema to add the from_address column if it doesn't exist
 */
async function updateEmailLogsSchema() {
  console.log("Checking if email_logs table needs to be updated...");

  try {
    // Check if the from_address column exists
    const checkColumnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'email_logs' AND column_name = 'from_address';
    `);

    // If the column doesn't exist, add it
    if (!checkColumnResult.length) {
      console.log("Adding from_address column to email_logs table...");
      
      await db.execute(sql`
        ALTER TABLE email_logs 
        ADD COLUMN from_address TEXT NOT NULL DEFAULT '';
      `);
      
      console.log("Successfully added from_address column to email_logs table");
    } else {
      console.log("from_address column already exists in email_logs table");
    }

  } catch (error) {
    console.error("Error updating email_logs schema:", error);
    process.exit(1);
  }

  console.log("Email logs schema update completed");
  process.exit(0);
}

updateEmailLogsSchema();