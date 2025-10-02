import { db } from './db';
import { leads, customers, contacts } from '../shared/schema';
import { sql } from 'drizzle-orm';

interface MigrationMapping {
  oldLeadId: number | null;
  oldCustomerId: number | null;
  newContactId: string;
  email: string | null;
  name: string;
  source: 'lead' | 'customer' | 'both';
}

export async function migrateToUnifiedContacts() {
  console.log('🚀 Starting migration to unified contacts table...\n');
  
  const mappings: MigrationMapping[] = [];
  let stats = {
    customersInserted: 0,
    leadsInserted: 0,
    duplicatesSkipped: 0,
    errors: 0
  };

  try {
    // Step 1: Get all customers
    console.log('📊 Step 1: Fetching customers...');
    const allCustomers = await db.select().from(customers);
    console.log(`   Found ${allCustomers.length} customers\n`);

    // Step 2: Insert customers into contacts table
    console.log('📝 Step 2: Migrating customers to contacts table...');
    for (const customer of allCustomers) {
      try {
        // Check if already exists in contacts by email
        const existing = customer.email 
          ? await db.select().from(contacts).where(sql`${contacts.email} = ${customer.email}`).limit(1)
          : [];

        if (existing.length > 0) {
          // Update existing contact with customer data
          await db.update(contacts)
            .set({
              firstName: customer.firstName || existing[0].firstName,
              lastName: customer.lastName || existing[0].lastName,
              phone: customer.phone || existing[0].phone,
              company: customer.company || existing[0].company,
              jobTitle: customer.jobTitle || existing[0].jobTitle,
              industry: customer.industry as any || existing[0].industry,
              contactSource: customer.contactSource as any || existing[0].contactSource,
              lifecycleStage: (customer.lifecycleStage?.toLowerCase() as any) || existing[0].lifecycleStage,
              status: (customer.status === 'active' || customer.status === 'inactive') ? customer.status : existing[0].status,
              country: customer.country || existing[0].country,
              linkedinUrl: customer.linkedinUrl || existing[0].linkedinUrl,
              leadStatus: customer.leadStatus || existing[0].leadStatus,
              customFields: customer.customFields || existing[0].customFields,
            })
            .where(sql`${contacts.id} = ${existing[0].id}`);

          console.log(`   🔄 Updated existing contact ${existing[0].id} with customer ${customer.id} data`);
          mappings.push({
            oldCustomerId: customer.id,
            oldLeadId: null,
            newContactId: existing[0].id,
            email: customer.email,
            name: customer.name,
            source: 'customer'
          });
          stats.customersInserted++;
          continue;
        }

        // Map customer fields to unified contact fields
        const [newContact] = await db.insert(contacts).values({
          firstName: customer.firstName || null,
          lastName: customer.lastName || null,
          email: customer.email || null,
          phone: customer.phone || null,
          company: customer.company || null,
          jobTitle: customer.jobTitle || null,
          industry: customer.industry as any || null,
          contactSource: customer.contactSource as any || null,
          lifecycleStage: (customer.lifecycleStage?.toLowerCase() as any) || 'customer',
          status: (customer.status === 'active' || customer.status === 'inactive') ? customer.status : 'active',
          country: customer.country || null,
          linkedinUrl: customer.linkedinUrl || null,
          leadStatus: customer.leadStatus || null,
          customFields: customer.customFields || null,
          score: 0,
          engagementLevel: 0,
          conversionProbability: 0,
          tags: [],
          properties: {},
          createdAt: customer.createdAt,
        }).returning();

        mappings.push({
          oldCustomerId: customer.id,
          oldLeadId: null,
          newContactId: newContact.id,
          email: customer.email,
          name: customer.name,
          source: 'customer'
        });

        stats.customersInserted++;
        console.log(`   ✅ Migrated customer ${customer.id} → contact ${newContact.id}`);
      } catch (error) {
        console.error(`   ❌ Error migrating customer ${customer.id}:`, error);
        stats.errors++;
      }
    }

    console.log(`\n   📊 Customers migrated: ${stats.customersInserted}\n`);

    // Step 3: Get all leads
    console.log('📊 Step 3: Fetching leads...');
    const allLeads = await db.select().from(leads);
    console.log(`   Found ${allLeads.length} leads\n`);

    // Step 4: Insert leads into contacts table (skip if email matches existing customer)
    console.log('📝 Step 4: Migrating leads to contacts table...');
    for (const lead of allLeads) {
      try {
        // Check if email matches an existing contact (customer)
        const existing = lead.email 
          ? await db.select().from(contacts).where(sql`${contacts.email} = ${lead.email}`).limit(1)
          : [];

        if (existing.length > 0) {
          // This lead was already converted to a customer - create mapping but skip insert
          console.log(`   ⏭️  Skipping lead ${lead.id} - email matches existing contact ${existing[0].id}`);
          mappings.push({
            oldLeadId: lead.id,
            oldCustomerId: null,
            newContactId: existing[0].id,
            email: lead.email,
            name: lead.name,
            source: 'both'
          });
          stats.duplicatesSkipped++;
          continue;
        }

        // Split name into first/last name
        const nameParts = lead.name.split(' ');
        const firstName = nameParts[0] || lead.name;
        const lastName = nameParts.slice(1).join(' ') || null;

        // Map lead fields to unified contact fields
        const [newContact] = await db.insert(contacts).values({
          firstName: firstName,
          lastName: lastName,
          email: lead.email || null,
          phone: lead.phone || null,
          company: lead.company || null,
          jobTitle: lead.jobTitle || null,
          industry: lead.industry as any || null,
          contactSource: lead.leadSource as any || null,
          lifecycleStage: 'lead',
          status: 'active',
          country: lead.location || null,
          score: lead.score || 0,
          engagementLevel: lead.engagementLevel || 0,
          conversionProbability: lead.conversionProbability || 0,
          leadStatus: lead.leadStatus || 'new',
          lastContactDate: lead.lastContactDate || null,
          nextFollowUpDate: lead.nextFollowUpDate || null,
          customFields: lead.customFields || null,
          tags: lead.tags || [],
          properties: {},
          createdAt: lead.createdAt,
        }).returning();

        mappings.push({
          oldLeadId: lead.id,
          oldCustomerId: null,
          newContactId: newContact.id,
          email: lead.email,
          name: lead.name,
          source: 'lead'
        });

        stats.leadsInserted++;
        console.log(`   ✅ Migrated lead ${lead.id} → contact ${newContact.id}`);
      } catch (error) {
        console.error(`   ❌ Error migrating lead ${lead.id}:`, error);
        stats.errors++;
      }
    }

    console.log(`\n   📊 Leads migrated: ${stats.leadsInserted}`);
    console.log(`   📊 Duplicates skipped: ${stats.duplicatesSkipped}\n`);

    // Step 5: Summary
    console.log('✨ Migration Summary:');
    console.log(`   Total customers migrated: ${stats.customersInserted}`);
    console.log(`   Total leads migrated: ${stats.leadsInserted}`);
    console.log(`   Duplicates skipped: ${stats.duplicatesSkipped}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Total unified contacts: ${stats.customersInserted + stats.leadsInserted}\n`);

    // Step 6: Save mappings to a table for reference
    console.log('💾 Saving ID mappings for reference...');
    await saveMappings(mappings);

    // Step 7: Verify counts
    const finalContactCount = await db.select({ count: sql<number>`count(*)` }).from(contacts);
    console.log(`\n✅ Final contact count in database: ${finalContactCount[0].count}`);

    console.log('\n🎉 Migration completed successfully!');
    return { success: true, stats, mappings };

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    return { success: false, error, stats };
  }
}

async function saveMappings(mappings: MigrationMapping[]) {
  // Create a simple mapping table to track old IDs to new UUIDs
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contact_id_mappings (
        old_lead_id INTEGER,
        old_customer_id INTEGER,
        new_contact_id UUID NOT NULL,
        email TEXT,
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        migrated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert all mappings
    for (const mapping of mappings) {
      await db.execute(sql`
        INSERT INTO contact_id_mappings 
          (old_lead_id, old_customer_id, new_contact_id, email, name, source)
        VALUES 
          (${mapping.oldLeadId}, ${mapping.oldCustomerId}, ${mapping.newContactId}, ${mapping.email}, ${mapping.name}, ${mapping.source})
      `);
    }

    console.log(`   ✅ Saved ${mappings.length} ID mappings`);
  } catch (error) {
    console.error('   ⚠️  Error saving mappings:', error);
  }
}

// Run migration immediately
migrateToUnifiedContacts()
  .then((result) => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
