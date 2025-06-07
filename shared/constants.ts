/**
 * Centralized constants for lead sources, statuses, and other dropdown options
 * to ensure consistency across all components
 */

export const LEAD_SOURCES = [
  { id: "website", name: "Website" },
  { id: "referral", name: "Referral" },
  { id: "advertisement", name: "Advertisement" },
  { id: "social_media", name: "Social Media" },
  { id: "email", name: "Email" },
  { id: "event", name: "Event" },
  { id: "partner", name: "Partner" },
  { id: "import", name: "Import" },
  { id: "other", name: "Other" },
] as const;

export const LEAD_STATUSES = [
  { id: "new", name: "New" },
  { id: "contacted", name: "Contacted" },
  { id: "qualified", name: "Qualified" },
  { id: "proposal", name: "Proposal" },
  { id: "negotiation", name: "Negotiation" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
] as const;

export const CONTACT_TYPES = [
  { id: "business", name: "Business" },
  { id: "individual", name: "Individual" },
] as const;

export const LIFECYCLE_STAGES = [
  { id: "lead", name: "Lead" },
  { id: "customer", name: "Customer" },
  { id: "opportunity", name: "Opportunity" },
  { id: "subscriber", name: "Subscriber" },
] as const;

export const LEGAL_BASES = [
  { id: "consent", name: "Consent" },
  { id: "contract", name: "Contract" },
  { id: "legitimate_interest", name: "Legitimate Interest" },
  { id: "legal_obligation", name: "Legal Obligation" },
] as const;

export const COUNTRIES = [
  { id: "us", name: "United States" },
  { id: "ca", name: "Canada" },
  { id: "uk", name: "United Kingdom" },
  { id: "au", name: "Australia" },
  { id: "fr", name: "France" },
  { id: "de", name: "Germany" },
  { id: "jp", name: "Japan" },
  { id: "other", name: "Other" },
] as const;

export const INDUSTRY_SUGGESTIONS = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Entertainment",
  "Real Estate",
  "Transportation",
  "Agriculture",
  "Energy",
  "Hospitality",
  "Government",
  "Non-profit",
  "Marketing and Advertising",
  "Computer Software",
  "Hospital & Health Care",
] as const;

// Type exports for TypeScript
export type LeadSource = typeof LEAD_SOURCES[number]['id'];
export type LeadStatus = typeof LEAD_STATUSES[number]['id'];
export type ContactType = typeof CONTACT_TYPES[number]['id'];
export type LifecycleStage = typeof LIFECYCLE_STAGES[number]['id'];
export type LegalBasis = typeof LEGAL_BASES[number]['id'];
export type Country = typeof COUNTRIES[number]['id'];