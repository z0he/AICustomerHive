/**
 * Script to populate the database with sample lead data
 */
import { db } from "../server/lib/db";
import { leads } from "../shared/schema";

async function populateSampleLeads() {
  console.log("Starting to populate sample leads...");
  
  try {
    // Check if any leads exist first
    const existingLeads = await db.select().from(leads);
    
    if (existingLeads.length > 0) {
      console.log(`${existingLeads.length} leads already exist in the database. Skipping seeding.`);
      return;
    }

    // Sample lead data
    const sampleLeads = [
      { 
        name: "David Miller", 
        initials: "DM", 
        industry: "Technology", 
        location: "Boston", 
        score: 85, 
        createdAt: new Date("2023-08-15"),
        email: "david@technovation.com", 
        phone: "+1-555-234-5678", 
        company: "Technovation Inc", 
        jobTitle: "CTO", 
        leadSource: "website", 
        leadStatus: "qualified", 
        leadOwner: "Jane Smith", 
        notes: "[2023-08-15 10:30 AM]\nInitial contact through website form. Expressed interest in enterprise solutions.\n\n[2023-08-20 2:15 PM]\nFollowed up via email. Scheduled demo for next week."
      },
      { 
        name: "Sarah Johnson", 
        initials: "SJ", 
        industry: "Retail", 
        location: "Chicago", 
        score: 65, 
        email: "sarah.j@globalretail.com", 
        phone: "+1-555-876-5432", 
        company: "Global Retail Solutions", 
        jobTitle: "Procurement Manager", 
        leadSource: "referral", 
        leadStatus: "contacted", 
        engagement_level: 65, 
        leadOwner: "John Doe",
        nextFollowUpDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 2), // 2 days from now
        notes: "[2023-09-01 11:45 AM]\nReferred by Bob Smith at Tech Solutions. Interested in inventory management system."
      },
      { 
        name: "Michael Chen", 
        initials: "MC", 
        industry: "Healthcare", 
        location: "San Francisco", 
        score: 40, 
        email: "michael@healthinnovate.org", 
        phone: "+1-555-345-6789", 
        company: "Health Innovate", 
        jobTitle: "Director of Technology", 
        leadSource: "conference", 
        leadStatus: "new", 
        engagement_level: 30,
        notes: "[2023-09-05 3:30 PM]\nMet at HealthTech Conference. Requested information about patient management solutions."
      },
      { 
        name: "Emily Rodriguez", 
        initials: "ER", 
        industry: "Education", 
        location: "Austin", 
        score: 78, 
        email: "emily@edutech.edu", 
        phone: "+1-555-456-7890", 
        company: "EduTech Systems", 
        jobTitle: "Dean of Technology", 
        leadSource: "email_campaign", 
        leadStatus: "qualified", 
        engagement_level: 80, 
        leadOwner: "Robert Johnson",
        nextFollowUpDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24), // 1 day from now
        notes: "[2023-08-25 9:15 AM]\nResponded to email campaign. Very interested in student management platform.\n\n[2023-09-02 1:30 PM]\nCompleted product demo. Requesting proposal for 5,000-student system."
      },
      { 
        name: "James Wilson", 
        initials: "JW", 
        industry: "Construction", 
        location: "Denver", 
        score: 90, 
        email: "james@constructco.com", 
        phone: "+1-555-567-8901", 
        company: "ConstructCo Builders", 
        jobTitle: "Operations Director", 
        leadSource: "advertisement", 
        leadStatus: "proposal", 
        engagement_level: 90, 
        leadOwner: "Emily Williams",
        nextFollowUpDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 12), // 12 hours from now
        notes: "[2023-08-10 2:45 PM]\nClicked through LinkedIn ad. Requesting information on project management tools.\n\n[2023-08-17 10:00 AM]\nDemo completed. Very impressed with scheduling features.\n\n[2023-09-01 3:30 PM]\nSent proposal for enterprise plan with 50 user licenses."
      },
      { 
        name: "Olivia Thompson", 
        initials: "OT", 
        industry: "Finance", 
        location: "New York", 
        score: 95, 
        email: "olivia@financepro.com", 
        phone: "+1-555-678-9012", 
        company: "Finance Professionals LLC", 
        jobTitle: "Managing Partner", 
        leadSource: "partner", 
        leadStatus: "negotiation", 
        engagement_level: 95, 
        leadOwner: "John Doe",
        nextFollowUpDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 6), // 6 hours from now
        notes: "[2023-07-28 11:30 AM]\nIntroduced by banking partner. Needs client management solution with compliance features.\n\n[2023-08-05 1:15 PM]\nDetailed requirements call completed. Sent product specifications.\n\n[2023-08-20 9:45 AM]\nProposal presented. Negotiating contract terms and implementation timeline."
      },
      { 
        name: "Daniel Garcia", 
        initials: "DG", 
        industry: "Legal", 
        location: "Miami", 
        score: 20, 
        email: "daniel@legalexperts.com", 
        phone: "+1-555-789-0123", 
        company: "Legal Experts Associates", 
        jobTitle: "IT Manager", 
        leadSource: "website", 
        leadStatus: "lost", 
        engagement_level: 20,
        notes: "[2023-07-10 10:15 AM]\nRequested information through website contact form. Interested in document management system.\n\n[2023-07-16 3:30 PM]\nDemo scheduled but canceled last minute.\n\n[2023-08-01 11:00 AM]\nFollowed up multiple times. Informed us they selected a competitor's solution."
      },
      { 
        name: "Sophia Lee", 
        initials: "SL", 
        industry: "Marketing", 
        location: "Portland", 
        score: 100, 
        email: "sophia@creativedesigns.com", 
        phone: "+1-555-890-1234", 
        company: "Creative Designs Agency", 
        jobTitle: "Founder & CEO", 
        leadSource: "social_media", 
        leadStatus: "won", 
        engagement_level: 100, 
        leadOwner: "Jane Smith",
        tags: ["VIP", "Quick Close", "Referral Source"],
        notes: "[2023-06-15 9:30 AM]\nEngaged with our Instagram post about design collaboration tools.\n\n[2023-06-22 2:00 PM]\nDemo completed with entire creative team. Enthusiastic response.\n\n[2023-07-05 11:45 AM]\nSigned annual contract for premium plan. Setting up implementation schedule."
      }
    ];

    console.log(`Inserting ${sampleLeads.length} sample leads...`);
    
    // Add missing createdAt field to all leads
    const processedLeads = sampleLeads.map(lead => {
      if (!lead.createdAt) {
        // If createdAt is not provided, set to a random date in the last 3 months
        const randomDaysAgo = Math.floor(Math.random() * 90);
        lead.createdAt = new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * randomDaysAgo);
      }
      return lead;
    });

    // Insert leads one by one
    for (const lead of processedLeads) {
      await db.insert(leads).values(lead);
    }
    
    console.log("Sample leads inserted successfully!");
  } catch (error) {
    console.error("Error populating sample leads:", error);
  } finally {
    process.exit(0);
  }
}

// Run the function
populateSampleLeads();