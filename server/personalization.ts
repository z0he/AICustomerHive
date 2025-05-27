import { db } from './db';
import { leads } from '../shared/schema';
import { eq } from 'drizzle-orm';

export async function personalizeEmailContent(to: string, subject: string, body: string) {
  console.log("🎯 PERSONALIZATION ENGINE: Starting for", to);
  
  // Check if personalization is needed
  const needsPersonalization = subject.includes('{{') || body.includes('{{');
  
  if (!needsPersonalization) {
    console.log("✅ PERSONALIZATION: No variables found, returning original content");
    return { subject, body };
  }
  
  console.log("🔍 PERSONALIZATION: Variables detected, looking up lead data...");
  
  try {
    // Query the database for lead information
    const leadResults = await db.select().from(leads).where(eq(leads.email, to)).limit(1);
    
    if (leadResults.length === 0) {
      console.log("⚠️ PERSONALIZATION: No lead found for email:", to);
      return { subject, body };
    }
    
    const lead = leadResults[0];
    console.log("🎉 PERSONALIZATION: Found lead data:", {
      name: lead.name,
      lead_owner: lead.lead_owner,
      job_title: lead.job_title,
      company: lead.company
    });
    
    // Extract personalization values
    const firstName = lead.name?.split(' ')[0] || 'Friend';
    const lastName = lead.name?.split(' ').slice(1).join(' ') || '';
    const company = lead.company || 'Your Company';
    const industry = lead.industry || 'your industry';
    const jobTitle = lead.job_title || 'your role';
    const leadOwner = lead.lead_owner || 'The Team';
    
    console.log("🔄 PERSONALIZATION: Extracted values:", {
      firstName,
      lastName,
      company,
      industry,
      jobTitle,
      leadOwner
    });
    
    // Perform replacements
    let personalizedSubject = subject
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{lastName\}\}/g, lastName)
      .replace(/\{\{company\}\}/g, company)
      .replace(/\{\{industry\}\}/g, industry)
      .replace(/\{\{jobTitle\}\}/g, jobTitle)
      .replace(/\{\{leadOwner\}\}/g, leadOwner);
      
    let personalizedBody = body
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{lastName\}\}/g, lastName)
      .replace(/\{\{company\}\}/g, company)
      .replace(/\{\{industry\}\}/g, industry)
      .replace(/\{\{jobTitle\}\}/g, jobTitle)
      .replace(/\{\{leadOwner\}\}/g, leadOwner);
    
    console.log("✨ PERSONALIZATION: SUCCESS!");
    console.log("📧 Original subject:", subject);
    console.log("📧 Personalized subject:", personalizedSubject);
    console.log("📄 Original body preview:", body.substring(0, 50) + "...");
    console.log("📄 Personalized body preview:", personalizedBody.substring(0, 50) + "...");
    
    return {
      subject: personalizedSubject,
      body: personalizedBody
    };
    
  } catch (error) {
    console.error("💥 PERSONALIZATION: Database error:", error);
    return { subject, body };
  }
}