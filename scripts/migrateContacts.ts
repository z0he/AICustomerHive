#!/usr/bin/env tsx

import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql, eq, and } from "drizzle-orm";
import { db } from "../server/lib/db";
import * as schema from "../shared/schema";

// Define legacy_map table schema
const legacyMap = pgTable("legacy_map", {
  id: uuid("id").defaultRandom().primaryKey(),
  legacyType: varchar("legacy_type", { length: 20 }).notNull(), // 'lead' | 'customer'
  legacyId: varchar("legacy_id", { length: 50 }).notNull(), // UUID or text ID from legacy table
  contactId: uuid("contact_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Lifecycle stage precedence (higher number = higher precedence)
const LIFECYCLE_PRECEDENCE = {
  lead: 1,
  mql: 2,
  opportunity: 3,
  customer: 4,
  evangelist: 5,
  churned: 5,
} as const;

interface MigrationStats {
  inserted: number;
  updated: number;
  skippedNullEmail: number;
  mapped: number;
}

/**
 * Get the higher precedence lifecycle stage
 */
function getHigherLifecycleStage(stage1: string, stage2: string): string {
  const precedence1 = LIFECYCLE_PRECEDENCE[stage1 as keyof typeof LIFECYCLE_PRECEDENCE] || 0;
  const precedence2 = LIFECYCLE_PRECEDENCE[stage2 as keyof typeof LIFECYCLE_PRECEDENCE] || 0;
  return precedence1 >= precedence2 ? stage1 : stage2;
}

/**
 * Create legacy_map table if it doesn't exist
 */
async function ensureLegacyMapTable(dbInstance: any): Promise<void> {
  try {
    await dbInstance.execute(sql`
      CREATE TABLE IF NOT EXISTS legacy_map (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        legacy_type VARCHAR(20) NOT NULL,
        legacy_id VARCHAR(50) NOT NULL,
        contact_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE(legacy_type, legacy_id)
      )
    `);
    console.log("✓ legacy_map table ensured");
  } catch (error) {
    console.error("Error creating legacy_map table:", error);
    throw error;
  }
}

/**
 * Check if a legacy record has already been migrated
 */
async function isAlreadyMigrated(
  dbInstance: any,
  legacyType: string,
  legacyId: string
): Promise<boolean> {
  try {
    const result = await dbInstance.execute(sql`
      SELECT 1 FROM legacy_map 
      WHERE legacy_type = ${legacyType} AND legacy_id = ${legacyId}
      LIMIT 1
    `);
    return result.length > 0;
  } catch (error) {
    // If table doesn't exist yet, record is not migrated
    return false;
  }
}

/**
 * Insert record into legacy_map table
 */
async function addToLegacyMap(
  dbInstance: any,
  legacyType: string,
  legacyId: string,
  contactId: string
): Promise<void> {
  await dbInstance.execute(sql`
    INSERT INTO legacy_map (legacy_type, legacy_id, contact_id)
    VALUES (${legacyType}, ${legacyId}, ${contactId})
    ON CONFLICT (legacy_type, legacy_id) DO NOTHING
  `);
}

/**
 * Migrate leads to contacts table
 */
async function migrateLeads(dbInstance: any, stats: MigrationStats): Promise<void> {
  console.log("📋 Migrating leads...");
  
  const leads = await dbInstance.select().from(schema.leads);
  console.log(`Found ${leads.length} leads to process`);

  for (const lead of leads) {
    // Check if already migrated
    if (await isAlreadyMigrated(dbInstance, 'lead', lead.id.toString())) {
      continue;
    }

    // Skip if email is null - handle separately
    if (!lead.email) {
      stats.skippedNullEmail++;
      
      // Insert without email conflict handling
      const [newContact] = await dbInstance
        .insert(schema.contacts)
        .values({
          firstName: lead.name?.split(' ')[0] || '',
          lastName: lead.name?.split(' ').slice(1).join(' ') || '',
          email: null,
          phone: lead.phone,
          company: lead.company,
          jobTitle: lead.jobTitle,
          lifecycleStage: 'lead',
          status: 'active',
          tags: lead.tags || [],
          properties: {
            ...lead.customFields,
            legacyLeadId: lead.id,
            leadSource: lead.leadSource,
            leadStatus: lead.leadStatus,
            leadOwner: lead.leadOwner,
            industry: lead.industry,
            location: lead.location,
            score: lead.score,
            engagementLevel: lead.engagementLevel,
            conversionProbability: lead.conversionProbability,
            notes: lead.notes,
          },
          createdAt: lead.createdAt,
          updatedAt: sql`NOW()`,
        })
        .returning({ id: schema.contacts.id });

      await addToLegacyMap(dbInstance, 'lead', lead.id.toString(), newContact.id);
      stats.inserted++;
      stats.mapped++;
      continue;
    }

    // Upsert with email conflict handling
    const [contact] = await dbInstance
      .insert(schema.contacts)
      .values({
        firstName: lead.name?.split(' ')[0] || '',
        lastName: lead.name?.split(' ').slice(1).join(' ') || '',
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        jobTitle: lead.jobTitle,
        lifecycleStage: 'lead',
        status: 'active',
        tags: lead.tags || [],
        properties: {
          ...lead.customFields,
          legacyLeadId: lead.id,
          leadSource: lead.leadSource,
          leadStatus: lead.leadStatus,
          leadOwner: lead.leadOwner,
          industry: lead.industry,
          location: lead.location,
          score: lead.score,
          engagementLevel: lead.engagementLevel,
          conversionProbability: lead.conversionProbability,
          notes: lead.notes,
        },
        createdAt: lead.createdAt,
        updatedAt: sql`NOW()`,
      })
      .onConflictDoUpdate({
        target: schema.contacts.email,
        set: {
          // Only update lifecycle stage if the new one has higher precedence
          lifecycleStage: sql`CASE 
            WHEN contacts.lifecycle_stage IN ('evangelist', 'churned') THEN contacts.lifecycle_stage
            WHEN contacts.lifecycle_stage = 'customer' THEN contacts.lifecycle_stage
            WHEN contacts.lifecycle_stage = 'opportunity' THEN contacts.lifecycle_stage  
            WHEN contacts.lifecycle_stage = 'mql' THEN contacts.lifecycle_stage
            ELSE 'lead'
          END`,
          updatedAt: sql`NOW()`,
          // Merge properties while preserving existing data
          properties: sql`contacts.properties || ${JSON.stringify({
            ...lead.customFields,
            legacyLeadId: lead.id,
            leadSource: lead.leadSource,
            leadStatus: lead.leadStatus,
            leadOwner: lead.leadOwner,
            industry: lead.industry,
            location: lead.location,
            score: lead.score,
            engagementLevel: lead.engagementLevel,
            conversionProbability: lead.conversionProbability,
            notes: lead.notes,
          })}::jsonb`,
          // Keep earliest created date
          createdAt: sql`CASE 
            WHEN contacts.created_at < ${lead.createdAt.toISOString()} THEN contacts.created_at
            ELSE ${lead.createdAt.toISOString()}
          END`,
        },
      })
      .returning({ id: schema.contacts.id });

    await addToLegacyMap(dbInstance, 'lead', lead.id.toString(), contact.id);
    
    // Try to detect if this was an insert vs update by checking if mapping exists
    const existingMapping = await dbInstance.execute(sql`
      SELECT 1 FROM legacy_map 
      WHERE contact_id = ${contact.id} AND NOT (legacy_type = 'lead' AND legacy_id = ${lead.id.toString()})
      LIMIT 1
    `);
    
    if (existingMapping.length > 0) {
      stats.updated++;
    } else {
      stats.inserted++;
    }
    stats.mapped++;
  }
  
  console.log(`✓ Leads migration complete`);
}

/**
 * Migrate customers to contacts table
 */
async function migrateCustomers(dbInstance: any, stats: MigrationStats): Promise<void> {
  console.log("👥 Migrating customers...");
  
  const customers = await dbInstance.select().from(schema.customers);
  console.log(`Found ${customers.length} customers to process`);

  for (const customer of customers) {
    // Check if already migrated
    if (await isAlreadyMigrated(dbInstance, 'customer', customer.id.toString())) {
      continue;
    }

    // Upsert with email conflict handling
    const [contact] = await dbInstance
      .insert(schema.contacts)
      .values({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        jobTitle: customer.jobTitle,
        lifecycleStage: 'customer',
        status: customer.status === 'active' ? 'active' : 'inactive',
        tags: [],
        properties: {
          ...customer.customFields,
          legacyCustomerId: customer.id,
          linkedinUrl: customer.linkedinUrl,
          contactOwner: customer.contactOwner,
          contactSource: customer.contactSource,
          contactType: customer.contactType,
          country: customer.country,
          legalBasis: customer.legalBasis,
          industry: customer.industry,
          leadStatus: customer.leadStatus,
        },
        createdAt: customer.createdAt,
        updatedAt: sql`NOW()`,
      })
      .onConflictDoUpdate({
        target: schema.contacts.email,
        set: {
          // Customer beats lead, mql, opportunity but not evangelist/churned
          lifecycleStage: sql`CASE 
            WHEN contacts.lifecycle_stage IN ('evangelist', 'churned') THEN contacts.lifecycle_stage
            ELSE 'customer'
          END`,
          updatedAt: sql`NOW()`,
          // Merge properties while preserving existing data
          properties: sql`contacts.properties || ${JSON.stringify({
            ...customer.customFields,
            legacyCustomerId: customer.id,
            linkedinUrl: customer.linkedinUrl,
            contactOwner: customer.contactOwner,
            contactSource: customer.contactSource,
            contactType: customer.contactType,
            country: customer.country,
            legalBasis: customer.legalBasis,
            industry: customer.industry,
            leadStatus: customer.leadStatus,
          })}::jsonb`,
          // Keep earliest created date
          createdAt: sql`CASE 
            WHEN contacts.created_at < ${customer.createdAt.toISOString()} THEN contacts.created_at
            ELSE ${customer.createdAt.toISOString()}
          END`,
        },
      })
      .returning({ id: schema.contacts.id });

    await addToLegacyMap(dbInstance, 'customer', customer.id.toString(), contact.id);
    
    // Try to detect if this was an insert vs update by checking if mapping exists
    const existingMapping = await dbInstance.execute(sql`
      SELECT 1 FROM legacy_map 
      WHERE contact_id = ${contact.id} AND NOT (legacy_type = 'customer' AND legacy_id = ${customer.id.toString()})
      LIMIT 1
    `);
    
    if (existingMapping.length > 0) {
      stats.updated++;
    } else {
      stats.inserted++;
    }
    stats.mapped++;
  }
  
  console.log(`✓ Customers migration complete`);
}

/**
 * Main migration function
 */
async function migrateContacts(): Promise<void> {
  console.log("🚀 Starting contacts migration...");
  
  const stats: MigrationStats = {
    inserted: 0,
    updated: 0,
    skippedNullEmail: 0,
    mapped: 0,
  };

  try {
    // Execute migration in transaction
    await db.transaction(async (tx) => {
      // Ensure legacy_map table exists
      await ensureLegacyMapTable(tx);
      
      // Migrate leads first (lower precedence)
      await migrateLeads(tx, stats);
      
      // Migrate customers (higher precedence)
      await migrateCustomers(tx, stats);
    });

    // Log summary
    console.log("\n📊 Migration Summary:");
    console.log(`✓ Inserted: ${stats.inserted} new contacts`);
    console.log(`✓ Updated: ${stats.updated} existing contacts`);
    console.log(`⚠ Skipped (null email): ${stats.skippedNullEmail} records`);
    console.log(`📋 Mapped: ${stats.mapped} legacy records`);
    console.log("\n🎉 Migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateContacts()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { migrateContacts };