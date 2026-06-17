import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage.js";
import type { IStorage } from '../storage';
import { createOrganizationScopedStorage } from '../storage/scoped-storage';
import { db } from "../db.js";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { insertCustomerSchema, insertLeadSchema, industryEnum, contactSourceEnum, contacts, type SelectContact } from "../../shared/schema.js";
import {
  analyzeContactSourceFromTouchpoints,
  extractUTMFromRequest,
  mapUTMToContactSource,
  stitchAnonymousTouchpointsToContact,
} from "../services/contact-tracking-integration.js";

const router = Router();

// Helper function to get organization-scoped storage
function getScopedStorage(req: Request): IStorage {
  if (req.organization?.organizationId) {
    return createOrganizationScopedStorage(storage, req.organization.organizationId);
  }
  throw new Error("Organization context required but not found");
}

// Matches a v4-style UUID (the unified `contacts` table primary key).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a route :id to the unified `contacts` table UUID.
 * Accepts a unified UUID directly, or a legacy `lead_<n>`/`customer_<n>`/numeric id
 * (kept as a fallback during the contact-unification transition).
 * Returns null when the contact can't be found / the id can't be parsed.
 */
async function resolveContactUuid(scopedStorage: IStorage, rawContactId: string): Promise<string | null> {
  if (UUID_RE.test(rawContactId)) {
    const contact = await scopedStorage.getContact(rawContactId);
    return contact ? contact.id : null;
  }

  // Legacy numeric / prefixed id scheme
  let actualId: number;
  let contactType: 'lead' | 'customer';
  if (rawContactId.startsWith('lead_')) {
    actualId = parseInt(rawContactId.replace('lead_', ''));
    contactType = 'lead';
  } else if (rawContactId.startsWith('customer_')) {
    actualId = parseInt(rawContactId.replace('customer_', ''));
    contactType = 'customer';
  } else {
    const numericId = parseInt(rawContactId);
    if (numericId > 10000) {
      actualId = numericId - 10000;
      contactType = 'lead';
    } else {
      actualId = numericId;
      contactType = 'customer';
    }
  }

  if (isNaN(actualId)) return null;
  return scopedStorage.getUnifiedContactByLegacyId(actualId, contactType);
}

// Industry values for validation
const INDUSTRY_VALUES = [
  "Accounting","Airlines/Aviation","Alternative Dispute Resolution","Alternative Medicine","Animation",
  "Apparel & Fashion","Architecture & Planning","Arts and Crafts","Automotive","Aviation & Aerospace",
  "Banking","Biotechnology","Broadcast Media","Building Materials","Business Supplies and Equipment",
  "Capital Markets","Chemicals","Civic & Social Organization","Civil Engineering","Commercial Real Estate",
  "Computer & Network Security","Computer Games","Computer Hardware","Computer Networking","Computer Software",
  "Internet","Construction","Consumer Electronics","Consumer Goods","Consumer Services","Cosmetics","Dairy",
  "Defense & Space","Design","Education Management","E-Learning","Electrical/Electronic Manufacturing",
  "Entertainment","Environmental Services","Events Services","Executive Office","Facilities Services",
  "Farming","Financial Services","Fine Art","Fishery","Food & Beverages","Food Production","Fund-Raising",
  "Furniture","Gambling & Casinos","Glass, Ceramics & Concrete","Government Administration","Government Relations",
  "Graphic Design","Health, Wellness and Fitness","Higher Education","Hospital & Health Care","Hospitality",
  "Human Resources","Import and Export","Individual & Family Services","Industrial Automation","Information Services",
  "Information Technology and Services","Insurance","International Affairs","International Trade and Development",
  "Investment Banking","Investment Management","Judiciary","Law Enforcement","Law Practice","Legal Services",
  "Legislative Office","Leisure, Travel & Tourism","Libraries","Logistics and Supply Chain","Luxury Goods & Jewelry",
  "Machinery","Management Consulting","Maritime","Market Research","Marketing and Advertising",
  "Mechanical or Industrial Engineering","Media Production","Medical Devices","Medical Practice","Mental Health Care",
  "Military","Mining & Metals","Motion Pictures and Film","Museums and Institutions","Music","Nanotechnology",
  "Newspapers","Non-Profit Organization Management","Oil & Energy","Online Media","Outsourcing/Offshoring",
  "Package/Freight Delivery","Packaging and Containers","Paper & Forest Products","Performing Arts","Pharmaceuticals",
  "Philanthropy","Photography","Plastics","Political Organization","Primary/Secondary Education","Printing",
  "Professional Training & Coaching","Program Development","Public Policy","Public Relations and Communications",
  "Public Safety","Publishing","Railroad Manufacture","Ranching","Real Estate","Recreational Facilities and Services",
  "Religious Institutions","Renewables & Environment","Research","Restaurants","Retail","Security and Investigations",
  "Semiconductors","Shipbuilding","Sporting Goods","Sports","Staffing and Recruiting","Supermarkets",
  "Telecommunications","Textiles","Think Tanks","Tobacco","Translation and Localization","Transportation/Trucking/Railroad",
  "Utilities","Venture Capital & Private Equity","Veterinary","Warehousing","Wholesale","Wine and Spirits","Wireless","Writing and Editing"
] as const;

// Contact source values for validation
const CONTACT_SOURCE_VALUES = [
  "Website","Referral","Social Media","Email Campaign","Event","Paid Search","Organic Search",
  "Direct","Trade Show","Webinar","Cold Call","Partner","Advertisement","Content Marketing","Other"
] as const;

// Base schema for contact fields
const contactFieldsSchema = z.object({
  // Support both legacy name field and new firstName/lastName
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  industry: z.enum(INDUSTRY_VALUES).optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  lifecycleStage: z.enum(['lead', 'opportunity', 'customer', 'evangelist', 'churned']).default('lead'),
  status: z.string().optional(),
  owner: z.string().optional(),
  contactSource: z.enum(CONTACT_SOURCE_VALUES).optional(),
  source: z.string().optional(), // Legacy field for backward compatibility
  // UTM tracking fields
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  trackingCode: z.string().optional(),
  referrerUrl: z.string().optional(),
  landingPageUrl: z.string().optional(),
});

// Enhanced validation schema with firstName/lastName validation
const createContactSchema = contactFieldsSchema.refine((data) => {
  // Ensure either name OR firstName is provided
  return data.name || data.firstName;
}, {
  message: "Either 'name' or 'firstName' must be provided",
  path: ["name"]
});

// Update schema uses partial of the base schema (without the refine validation)
const updateContactSchema = contactFieldsSchema.partial();

// Advanced filter evaluation function
function evaluateAdvancedFilters(contact: any, filters: any[]): boolean {
  // For now, implement basic AND logic (all filters must match)
  return filters.every(filter => evaluateFilter(contact, filter));
}

function evaluateFilter(contact: any, filter: any): boolean {
  const { field, operator, value } = filter;
  
  // Get the field value from the contact
  let fieldValue = contact[field];
  
  // Handle special field mappings
  if (field === 'firstName') {
    // Extract firstName from name field
    fieldValue = contact.name ? contact.name.split(' ')[0] : '';
  } else if (field === 'lastName') {
    // Extract lastName from name field
    const nameParts = contact.name ? contact.name.split(' ') : [];
    fieldValue = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  } else if (field === 'contactSource') {
    // Check both contactSource and source fields for backward compatibility
    fieldValue = contact.contactSource || contact.source || '';
  } else if (field.includes('.')) {
    // Handle nested field access (e.g., for customFields)
    const keys = field.split('.');
    fieldValue = keys.reduce((obj: any, key: string) => obj?.[key], contact);
  }
  
  // Convert to string for text operations
  const fieldStr = String(fieldValue || '').toLowerCase();
  const valueStr = String(value || '').toLowerCase();
  
  switch (operator) {
    case 'equals':
      return fieldValue === value;
    case 'notEquals':
      return fieldValue !== value;
    case 'contains':
      return fieldStr.includes(valueStr);
    case 'startsWith':
      return fieldStr.startsWith(valueStr);
    case 'endsWith':
      return fieldStr.endsWith(valueStr);
    case 'greaterThan':
      return Number(fieldValue) > Number(value);
    case 'lessThan':
      return Number(fieldValue) < Number(value);
    case 'greaterThanOrEqual':
      return Number(fieldValue) >= Number(value);
    case 'lessThanOrEqual':
      return Number(fieldValue) <= Number(value);
    case 'isEmpty':
      return !fieldValue || fieldValue === '';
    case 'isNotEmpty':
      return fieldValue && fieldValue !== '';
    case 'in':
      if (Array.isArray(value)) {
        return value.includes(fieldValue);
      }
      return false;
    default:
      console.warn('Unknown filter operator:', operator);
      return true;
  }
}

/**
 * GET /api/contacts
 * Main unified contacts endpoint - replaces the frontend's need to call /api/unified-contacts
 */
router.get('/', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { stage, q, owner, inactive, sort, page = '1', limit = '50', advancedFilters } = req.query;

    // Map frontend stage names to backend values
    let mappedStage = stage as string;
    if (stage === 'opportunities') mappedStage = 'opportunity';
    
    // Get all contacts from the unified service
    const allContacts = await scopedStorage.getUnifiedContacts(userId);
    
    let filteredContacts = allContacts;

    // Apply advanced filters if provided
    if (advancedFilters && typeof advancedFilters === 'string') {
      try {
        const filters = JSON.parse(advancedFilters);
        if (Array.isArray(filters) && filters.length > 0) {
          filteredContacts = filteredContacts.filter(contact => {
            return evaluateAdvancedFilters(contact, filters);
          });
        }
      } catch (error) {
        console.error('Error parsing advanced filters:', error);
      }
    }

    // Filter by lifecycle stage
    if (mappedStage && mappedStage !== 'all') {
      filteredContacts = filteredContacts.filter(contact => 
        contact.lifecycleStage === mappedStage
      );
    }

    // Filter by search query
    if (q) {
      const searchLower = (q as string).toLowerCase();
      filteredContacts = filteredContacts.filter(contact =>
        contact.name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.company?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by inactivity: contacts with no lastContactDate, or whose
    // lastContactDate is older than `inactive` days. Mirrors the
    // find_inactive_customers voice tool so deep-links match its results.
    if (inactive) {
      const days = parseInt(inactive as string, 10);
      if (Number.isFinite(days) && days >= 1 && days <= 3650) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        filteredContacts = filteredContacts.filter(contact => {
          const last = (contact as any).lastContactDate;
          if (!last) return true;
          return new Date(last) < cutoff;
        });
      }
    }

    // Filter by owner
    if (owner && owner !== 'all') {
      if (owner === 'unassigned') {
        filteredContacts = filteredContacts.filter(contact => 
          (!contact.leadOwner && !contact.contactOwner) || 
          contact.leadOwner === 'Unassigned' || 
          contact.contactOwner === 'Unassigned'
        );
      } else {
        filteredContacts = filteredContacts.filter(contact => 
          contact.leadOwner === owner || contact.contactOwner === owner
        );
      }
    }

    // Sort: explicit ?sort=score sorts highest score first (nulls last).
    // Default ordering (no sort param) preserves storage's createdAt-desc order.
    if (sort === 'score') {
      filteredContacts = [...filteredContacts].sort((a, b) => {
        const aScore = (a as any).score;
        const bScore = (b as any).score;
        if (aScore == null && bScore == null) return 0;
        if (aScore == null) return 1;
        if (bScore == null) return -1;
        return bScore - aScore;
      });
    }

    // Calculate stage counts for the pills
    const stageCounts = {
      all: allContacts.length,
      lead: allContacts.filter(c => c.lifecycleStage === 'lead').length,
      opportunity: allContacts.filter(c => c.lifecycleStage === 'opportunity').length,
      customer: allContacts.filter(c => c.lifecycleStage === 'customer').length,
      evangelist: allContacts.filter(c => c.lifecycleStage === 'evangelist').length,
      churned: allContacts.filter(c => c.lifecycleStage === 'churned').length,
    };

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedContacts = filteredContacts.slice(startIndex, startIndex + limitNum);

    res.json({
      contacts: paginatedContacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredContacts.length,
        totalPages: Math.ceil(filteredContacts.length / limitNum)
      },
      counts: stageCounts
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

/**
 * POST /api/contacts
 * Create a new contact
 */
router.post('/', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const organizationId = req.organization!.organizationId;
    const validatedData = createContactSchema.parse(req.body);

    // Handle firstName/lastName logic with backward compatibility
    let firstName = validatedData.firstName || '';
    let lastName = validatedData.lastName || '';

    if (validatedData.firstName && validatedData.lastName) {
      // Use provided firstName/lastName as-is
    } else if (validatedData.name) {
      // Split name for backward compatibility
      const nameParts = validatedData.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else if (validatedData.firstName) {
      firstName = validatedData.firstName;
    }

    // Email-dedupe within the org. There's no DB unique constraint under
    // multi-tenancy, so the dedupe lives here (same as the create_contact voice
    // tool): an existing match is returned instead of writing a duplicate.
    const [existing] = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.organizationId, organizationId),
        ne(contacts.status, 'deleted'),
        eq(contacts.email, validatedData.email),
      ))
      .limit(1);

    if (existing) {
      return res.status(200).json({
        ...existing,
        name: `${existing.firstName || ''} ${existing.lastName || ''}`.trim(),
        alreadyExists: true,
      });
    }

    // Source intelligence + UTM (preserve the tracking behaviour of the old path)
    const utm = extractUTMFromRequest(req);
    const anonymousId = req.body.anonymousId || (req.query as any).anonymousId || req.headers['x-anonymous-id'];
    let sourceIntelligence;
    if (anonymousId || validatedData.email) {
      sourceIntelligence = await analyzeContactSourceFromTouchpoints(validatedData.email, anonymousId);
    }
    const legacySource = validatedData.source && (CONTACT_SOURCE_VALUES as readonly string[]).includes(validatedData.source)
      ? validatedData.source
      : undefined;
    const resolvedSource = validatedData.contactSource
      || legacySource
      || (sourceIntelligence && sourceIntelligence.confidence > 70 ? sourceIntelligence.suggestedSource : mapUTMToContactSource(utm));

    // Insert into the unified contacts table — the same table the list and the
    // voice tools read/write. (Owner is intentionally not written here: it's a
    // free-text field today but ownerId is a UUID FK; see Phase 4 dropdown work.)
    const [inserted] = await db
      .insert(contacts)
      .values({
        organizationId,
        firstName,
        lastName: lastName || null,
        email: validatedData.email,
        phone: validatedData.phone ?? null,
        company: validatedData.company ?? null,
        jobTitle: validatedData.jobTitle ?? null,
        industry: (validatedData.industry as any) ?? null,
        country: validatedData.country ?? null,
        lifecycleStage: validatedData.lifecycleStage as any,
        contactSource: (resolvedSource as any) ?? null,
        leadStatus: validatedData.status || 'new',
        trackingCode: validatedData.trackingCode ?? null,
        referrerUrl: validatedData.referrerUrl ?? utm.referrerUrl ?? null,
        landingPageUrl: validatedData.landingPageUrl ?? utm.landingPageUrl ?? null,
        utmSource: validatedData.utmSource ?? utm.utmSource ?? null,
        utmMedium: validatedData.utmMedium ?? utm.utmMedium ?? null,
        utmCampaign: validatedData.utmCampaign ?? utm.utmCampaign ?? null,
        utmTerm: validatedData.utmTerm ?? utm.utmTerm ?? null,
        utmContent: validatedData.utmContent ?? utm.utmContent ?? null,
      })
      .returning();

    // Stitch anonymous web touchpoints onto the new contact (UUID-native)
    let stitched = 0;
    if (anonymousId) {
      const r = await stitchAnonymousTouchpointsToContact(inserted.id, inserted.email || '', anonymousId);
      stitched = r.stitched;
    }

    console.log('Contact created (unified contacts table):', {
      contactId: inserted.id,
      email: inserted.email,
      detectedSource: inserted.contactSource,
      sourceConfidence: sourceIntelligence?.confidence,
      stitchedTouchpoints: stitched,
    });

    res.status(201).json({
      ...inserted,
      name: `${inserted.firstName || ''} ${inserted.lastName || ''}`.trim(),
      tracking: {
        utm,
        sourceIntelligence,
        stitchedTouchpoints: stitched,
      },
    });

  } catch (error) {
    console.error('Error creating contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

/**
 * PATCH /api/contacts/:id
 * Update an existing contact in the unified contacts table
 */
router.patch('/:id', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const userId = (req as any).user?.id;
    const contactId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validatedData = updateContactSchema.parse(req.body);

    // Get the existing contact first
    const existingContact = await scopedStorage.getContact(contactId);
    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Map the update fields to unified contacts table structure
    const updateData: Partial<SelectContact> = {};
    
    if (validatedData.name !== undefined) {
      const nameParts = validatedData.name.split(' ');
      updateData.firstName = nameParts[0] || '';
      updateData.lastName = nameParts.slice(1).join(' ') || '';
    }
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.company !== undefined) updateData.company = validatedData.company;
    if (validatedData.jobTitle !== undefined) updateData.jobTitle = validatedData.jobTitle;
    if (validatedData.industry !== undefined) updateData.industry = validatedData.industry as any;
    if (validatedData.country !== undefined) updateData.country = validatedData.country;
    if (validatedData.lifecycleStage !== undefined) updateData.lifecycleStage = validatedData.lifecycleStage as any;
    if (validatedData.status !== undefined) updateData.status = validatedData.status as any;
    // Convert empty strings to null for UUID fields
    if (validatedData.owner !== undefined) updateData.ownerId = validatedData.owner || null;
    if (validatedData.contactSource !== undefined) updateData.contactSource = validatedData.contactSource as any;
    else if (validatedData.source !== undefined) updateData.contactSource = validatedData.source as any;

    // Update the contact in the unified contacts table
    const updatedContact = await scopedStorage.updateContact(contactId, updateData);

    // Return the unified contact format
    const response = {
      id: updatedContact.id,
      name: `${updatedContact.firstName || ''} ${updatedContact.lastName || ''}`.trim(),
      email: updatedContact.email,
      phone: updatedContact.phone,
      company: updatedContact.company,
      jobTitle: updatedContact.jobTitle,
      industry: updatedContact.industry,
      country: updatedContact.country,
      lifecycleStage: updatedContact.lifecycleStage,
      status: updatedContact.status,
      owner: updatedContact.ownerId,
      source: updatedContact.contactSource,
      lastActivity: updatedContact.createdAt,
    };

    res.json(response);

  } catch (error) {
    console.error('Error updating contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

/**
 * DELETE /api/contacts/:id
 * Soft delete a contact
 */
router.delete('/:id', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const userId = (req as any).user?.id;
    const rawContactId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Unified path: a UUID :id is a row in the contacts table. Soft-delete by
    // setting status='deleted' (mirrors the delete_contact voice tool and the
    // getUnifiedContacts status!='deleted' filter). NOT storage.deleteContact,
    // which hard-deletes the row.
    if (UUID_RE.test(rawContactId)) {
      const contact = await scopedStorage.getContact(rawContactId);
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      await scopedStorage.updateContact(rawContactId, { status: 'deleted' as any, updatedAt: new Date() });
      return res.json({ success: true, message: 'Contact deleted successfully' });
    }

    // Legacy path: handle prefixed IDs (customer_123, lead_456) and numeric IDs
    let actualId: number;
    let isLead = false;
    
    if (rawContactId.startsWith('customer_')) {
      const idStr = rawContactId.replace('customer_', '');
      actualId = parseInt(idStr);
      isLead = false;
    } else if (rawContactId.startsWith('lead_')) {
      const idStr = rawContactId.replace('lead_', '');
      actualId = parseInt(idStr);
      isLead = true;
    } else {
      // Legacy numeric ID
      actualId = parseInt(rawContactId);
      if (isNaN(actualId)) {
        return res.status(400).json({ error: 'Invalid contact ID format' });
      }
      // Check if this is a lead (ID > 10000) or customer (ID <= 10000)
      isLead = actualId > 10000;
      if (isLead) {
        actualId = actualId - 10000;
      }
    }

    if (isNaN(actualId)) {
      return res.status(400).json({ error: 'Invalid contact ID - could not parse' });
    }

    if (isLead) {
      // This is a lead - soft delete by updating status
      await scopedStorage.updateLead(actualId, { leadStatus: 'deleted' });
    } else {
      // This is a customer - soft delete by updating status
      await scopedStorage.updateCustomer(actualId, { status: 'deleted' });
    }

    res.json({ success: true, message: 'Contact deleted successfully' });

  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

/**
 * GET /api/contacts/:id/notes
 * Get notes for a contact
 */
router.get('/:id/notes', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    // Resolve the unified contacts UUID (handles UUID + legacy ids)
    const unifiedContactId = await resolveContactUuid(scopedStorage, req.params.id);

    if (!unifiedContactId) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Fetch real notes from database
    const notes = await scopedStorage.getContactNotes(unifiedContactId);
    
    // Format response to match expected structure
    const formattedNotes = notes.map(note => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      createdBy: note.createdBy || 'Unknown'
    }));

    res.json(formattedNotes);
  } catch (error) {
    console.error('Error fetching contact notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/**
 * POST /api/contacts/:id/notes
 * Add a note to a contact
 */
router.post('/:id/notes', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const { content } = req.body;
    const userId = (req as any).user?.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    // Resolve the unified contacts UUID (handles UUID + legacy ids)
    const unifiedContactId = await resolveContactUuid(scopedStorage, req.params.id);

    if (!unifiedContactId) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Save real note to database
    const newNote = await scopedStorage.addContactNote({
      contactId: unifiedContactId,
      content: content.trim(),
      createdBy: userId || null
    });
    
    // Format response to match expected structure
    const formattedNote = {
      id: newNote.id,
      content: newNote.content,
      createdAt: newNote.createdAt.toISOString(),
      createdBy: newNote.createdBy || 'Current User'
    };

    res.status(201).json(formattedNote);
  } catch (error) {
    console.error('Error creating contact note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * POST /api/contacts/filter
 * Filter contacts for campaign targeting
 */
router.post('/filter', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const filters = req.body;
    
    // Use storage layer to filter contacts
    const contacts = await scopedStorage.filterContacts(filters);
    
    res.json({
      contacts,
      count: contacts.length
    });

  } catch (error) {
    console.error('Error filtering contacts:', error);
    res.status(500).json({ error: 'Failed to filter contacts' });
  }
});

export default router;