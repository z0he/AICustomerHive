/**
 * This script updates existing data to mark it as sample data
 */
import { db } from "../server/db";
import { campaigns, customers, leads } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function markSampleData() {
  console.log("Starting to mark sample data...");
  
  try {
    // Add the is_sample column to all relevant tables if they don't exist
    console.log("Adding is_sample column to tables if needed...");
    
    // Use a transaction to ensure all operations succeed or fail together
    await db.transaction(async (tx) => {
      // Mark all existing campaigns as sample data
      const updatedCampaigns = await tx
        .update(campaigns)
        .set({ isSample: true })
        .returning({ id: campaigns.id, name: campaigns.name });
      
      console.log(`Marked ${updatedCampaigns.length} campaigns as sample data`);
      
      // Mark all existing customers as sample data
      const updatedCustomers = await tx
        .update(customers)
        .set({ isSample: true })
        .returning({ id: customers.id, name: customers.name });
      
      console.log(`Marked ${updatedCustomers.length} customers as sample data`);
      
      // Mark all existing leads as sample data
      const updatedLeads = await tx
        .update(leads)
        .set({ isSample: true })
        .returning({ id: leads.id, name: leads.name });
      
      console.log(`Marked ${updatedLeads.length} leads as sample data`);
    });
    
    console.log("Successfully marked all existing data as sample data");
  } catch (error) {
    console.error("Error marking sample data:", error);
    throw error;
  }
}

// Run the migration
markSampleData()
  .then(() => {
    console.log("Sample data migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Sample data migration failed:", error);
    process.exit(1);
  });