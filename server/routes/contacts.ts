import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage.js";
import { z } from "zod";
import { insertCustomerSchema, insertLeadSchema, industryEnum, contactSourceEnum, type SelectContact } from "../../shared/schema.js";
import { 
  createContactWithTracking, 
  analyzeContactSourceFromTouchpoints,
  extractUTMFromRequest 
} from "../services/contact-tracking-integration.js";

const router = Router();

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
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { stage, q, owner, page = '1', limit = '50', advancedFilters } = req.query;

    // Map frontend stage names to backend values
    let mappedStage = stage as string;
    if (stage === 'opportunities') mappedStage = 'opportunity';
    
    // Get all contacts from the unified service
    const allContacts = await storage.getUnifiedContacts(userId);
    
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
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validatedData = createContactSchema.parse(req.body);
    
    // Handle firstName/lastName logic with backward compatibility
    let firstName = validatedData.firstName || '';
    let lastName = validatedData.lastName || '';
    let fullName = validatedData.name || '';
    
    if (validatedData.firstName && validatedData.lastName) {
      // Use provided firstName/lastName
      fullName = `${validatedData.firstName} ${validatedData.lastName}`.trim();
    } else if (validatedData.name) {
      // Split name for backward compatibility
      const nameParts = validatedData.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else if (validatedData.firstName) {
      // Only firstName provided
      fullName = validatedData.firstName;
      firstName = validatedData.firstName;
    }
    
    // Prepare contact data for enhanced tracking
    const contactData = {
      ...validatedData,
      firstName,
      lastName,
      name: fullName,
      initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    };
    
    // Use enhanced contact creation with tracking integration
    const result = await createContactWithTracking(contactData, req, userId);
    
    // Return enhanced response with tracking information
    const response: any = {
      ...result.contact,
      tracking: {
        utm: result.utm,
        sourceIntelligence: result.sourceIntelligence,
        stitchedTouchpoints: result.stitched || 0
      }
    };
    
    // Log the tracking integration for debugging
    console.log('Contact created with tracking integration:', {
      contactId: result.contact.id,
      email: result.contact.email,
      detectedSource: result.contact.contactSource || result.contact.source,
      utmData: result.utm,
      sourceConfidence: result.sourceIntelligence?.confidence,
      stitchedTouchpoints: result.stitched
    });
    
    res.status(201).json(response);

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
  try {
    const userId = (req as any).user?.id;
    const contactId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validatedData = updateContactSchema.parse(req.body);

    // Get the existing contact first
    const existingContact = await storage.getContact(contactId);
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
    const updatedContact = await storage.updateContact(contactId, updateData);

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
  try {
    const userId = (req as any).user?.id;
    const rawContactId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Handle prefixed IDs (customer_123, lead_456) and legacy numeric IDs
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
      await storage.updateLead(actualId, { leadStatus: 'deleted' });
    } else {
      // This is a customer - soft delete by updating status
      await storage.updateCustomer(actualId, { status: 'deleted' });
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
  try {
    const rawContactId = req.params.id;
    
    // Extract numeric ID and determine contact type
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
    
    if (isNaN(actualId)) {
      return res.status(400).json({ error: 'Invalid contact ID format' });
    }
    
    // Get unified contact ID
    const unifiedContactId = await storage.getUnifiedContactByLegacyId(actualId, contactType);
    
    if (!unifiedContactId) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Fetch real notes from database
    const notes = await storage.getContactNotes(unifiedContactId);
    
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
  try {
    const rawContactId = req.params.id;
    const { content } = req.body;
    const userId = (req as any).user?.id;
    
    // Extract numeric ID and determine contact type
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
    
    if (isNaN(actualId)) {
      return res.status(400).json({ error: 'Invalid contact ID format' });
    }
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }
    
    // Get unified contact ID
    const unifiedContactId = await storage.getUnifiedContactByLegacyId(actualId, contactType);
    
    if (!unifiedContactId) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Save real note to database
    const newNote = await storage.addContactNote({
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
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const filters = req.body;
    
    // Use storage layer to filter contacts
    const contacts = await storage.filterContacts(filters);
    
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