import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage.js";
import { z } from "zod";
import { insertCustomerSchema, insertLeadSchema, industryEnum, contactSourceEnum } from "../../shared/schema.js";

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
    
    // Handle contact source with backward compatibility
    const contactSource = validatedData.contactSource || validatedData.source || '';
    
    // Prepare UTM tracking data for customFields
    const trackingData: any = {};
    if (validatedData.utmSource) trackingData.utmSource = validatedData.utmSource;
    if (validatedData.utmMedium) trackingData.utmMedium = validatedData.utmMedium;
    if (validatedData.utmCampaign) trackingData.utmCampaign = validatedData.utmCampaign;
    if (validatedData.utmTerm) trackingData.utmTerm = validatedData.utmTerm;
    if (validatedData.utmContent) trackingData.utmContent = validatedData.utmContent;
    if (validatedData.trackingCode) trackingData.trackingCode = validatedData.trackingCode;
    if (validatedData.referrerUrl) trackingData.referrerUrl = validatedData.referrerUrl;
    if (validatedData.landingPageUrl) trackingData.landingPageUrl = validatedData.landingPageUrl;
    
    // Determine if this should be a lead or customer based on lifecycleStage
    if (validatedData.lifecycleStage === 'customer' || validatedData.lifecycleStage === 'evangelist') {
      // Create as customer
      const customerData = {
        email: validatedData.email,
        firstName: firstName,
        lastName: lastName,
        name: fullName,
        initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
        company: validatedData.company || '',
        jobTitle: validatedData.jobTitle || '',
        industry: validatedData.industry || '',
        country: validatedData.country || '',
        phone: validatedData.phone || '',
        lifecycleStage: validatedData.lifecycleStage,
        status: validatedData.status || 'active', // Fixed: use 'status' not 'customerStatus'
        contactOwner: validatedData.owner || '',
        contactSource: contactSource,
        customFields: Object.keys(trackingData).length > 0 ? trackingData : undefined,
      };
      
      const customer = await storage.createCustomer(customerData);
      
      res.status(201).json({
        id: `customer_${customer.id}`, // Use prefixed ID format
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        email: customer.email,
        jobTitle: customer.jobTitle,
        company: customer.company,
        industry: customer.industry,
        country: customer.country,
        lifecycleStage: customer.lifecycleStage,
        owner: customer.contactOwner,
        source: customer.contactSource,
        phone: customer.phone,
        lastActivity: customer.createdAt,
      });
    } else {
      // Create as lead
      const leadData = {
        name: fullName,
        initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
        email: validatedData.email,
        company: validatedData.company || '',
        jobTitle: validatedData.jobTitle || '',
        industry: validatedData.industry || '',
        location: validatedData.country || '', // Store country in location field for leads
        phone: validatedData.phone || '',
        leadStatus: validatedData.status || 'new',
        leadOwner: validatedData.owner || '',
        leadSource: contactSource,
        score: 0,
        customFields: Object.keys(trackingData).length > 0 ? trackingData : undefined,
      };
      
      const lead = await storage.createLead(leadData);
      
      res.status(201).json({
        id: `lead_${lead.id}`, // Use prefixed ID format
        name: lead.name,
        email: lead.email,
        jobTitle: lead.jobTitle,
        company: lead.company,
        industry: lead.industry,
        country: lead.location,
        lifecycleStage: validatedData.lifecycleStage || 'lead', // Use the provided lifecycle stage
        owner: lead.leadOwner,
        source: lead.leadSource,
        phone: lead.phone,
        lastActivity: lead.createdAt,
      });
    }

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
 * Update an existing contact
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const contactIdStr = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validatedData = updateContactSchema.parse(req.body);

    // Parse the prefixed contact ID to determine type and actual ID
    let contactType: 'lead' | 'customer';
    let actualId: number;
    
    if (contactIdStr.startsWith('lead_')) {
      contactType = 'lead';
      actualId = parseInt(contactIdStr.replace('lead_', ''));
    } else if (contactIdStr.startsWith('customer_')) {
      contactType = 'customer';
      actualId = parseInt(contactIdStr.replace('customer_', ''));
    } else {
      // Fallback for old numeric IDs
      const numericId = parseInt(contactIdStr);
      if (numericId > 10000) {
        contactType = 'lead';
        actualId = numericId - 10000;
      } else {
        contactType = 'customer';
        actualId = numericId;
      }
    }

    let updatedContact;
    
    if (contactType === 'lead') {
      // This is a lead
      const leadData: any = {};
      
      if (validatedData.name) leadData.name = validatedData.name;
      if (validatedData.email) leadData.email = validatedData.email;
      if (validatedData.company) leadData.company = validatedData.company;
      if (validatedData.jobTitle) leadData.jobTitle = validatedData.jobTitle;
      if (validatedData.industry) leadData.industry = validatedData.industry;
      if (validatedData.country) leadData.location = validatedData.country;
      if (validatedData.phone) leadData.phone = validatedData.phone;
      if (validatedData.status) leadData.leadStatus = validatedData.status;
      if (validatedData.owner) leadData.leadOwner = validatedData.owner;
      if (validatedData.source) leadData.leadSource = validatedData.source;
      
      updatedContact = await storage.updateLead(actualId, leadData);
      
      // Transform back to unified format
      updatedContact = {
        id: `lead_${updatedContact.id}`,
        name: updatedContact.name,
        email: updatedContact.email,
        jobTitle: updatedContact.jobTitle,
        company: updatedContact.company,
        industry: updatedContact.industry,
        country: updatedContact.location,
        lifecycleStage: 'lead',
        owner: updatedContact.leadOwner,
        source: updatedContact.leadSource,
        phone: updatedContact.phone,
        lastActivity: updatedContact.createdAt,
      };
    } else {
      // This is a customer
      const customerData: any = {};
      
      if (validatedData.name) {
        const nameParts = validatedData.name.split(' ');
        customerData.firstName = nameParts[0] || '';
        customerData.lastName = nameParts.slice(1).join(' ') || '';
      }
      if (validatedData.email) customerData.email = validatedData.email;
      if (validatedData.company) customerData.company = validatedData.company;
      if (validatedData.jobTitle) customerData.jobTitle = validatedData.jobTitle;
      if (validatedData.industry) customerData.industry = validatedData.industry;
      if (validatedData.country) customerData.country = validatedData.country;
      if (validatedData.phone) customerData.phone = validatedData.phone;
      if (validatedData.lifecycleStage) customerData.lifecycleStage = validatedData.lifecycleStage;
      if (validatedData.status) customerData.customerStatus = validatedData.status;
      if (validatedData.owner) customerData.contactOwner = validatedData.owner;
      if (validatedData.source) customerData.contactSource = validatedData.source;
      
      updatedContact = await storage.updateCustomer(actualId, customerData);
      
      // Transform back to unified format
      updatedContact = {
        id: `customer_${updatedContact.id}`,
        name: `${updatedContact.firstName} ${updatedContact.lastName}`.trim(),
        email: updatedContact.email,
        jobTitle: updatedContact.jobTitle,
        company: updatedContact.company,
        industry: updatedContact.industry,
        country: updatedContact.country,
        lifecycleStage: updatedContact.lifecycleStage,
        owner: updatedContact.contactOwner,
        source: updatedContact.contactSource,
        phone: updatedContact.phone,
        lastActivity: updatedContact.createdAt,
      };
    }

    res.json(updatedContact);

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
    const contactId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if this is a lead (ID > 10000) or customer (ID <= 10000)
    if (contactId > 10000) {
      // This is a lead - soft delete by updating status
      const leadId = contactId - 10000;
      await storage.updateLead(leadId, { leadStatus: 'deleted' });
    } else {
      // This is a customer - soft delete by updating status
      await storage.updateCustomer(contactId, { status: 'deleted' });
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
    const contactId = parseInt(req.params.id);
    
    // For now, return mock notes - in real implementation, fetch from database
    const mockNotes = [
      {
        id: 1,
        content: "Initial contact made via website form",
        createdAt: new Date().toISOString(),
        createdBy: "System"
      },
      {
        id: 2,
        content: "Follow-up call scheduled for next week",
        createdAt: new Date().toISOString(),
        createdBy: "John Doe"
      }
    ];

    res.json(mockNotes);
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
    const contactId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = (req as any).user?.id;
    
    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    // For now, return mock response - in real implementation, save to database
    const newNote = {
      id: Date.now(),
      content,
      createdAt: new Date().toISOString(),
      createdBy: "Current User"
    };

    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating contact note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

export default router;