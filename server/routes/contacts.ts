import { Router } from "express";
import { Request, Response } from "express";
import { storage } from "../storage.js";
import { z } from "zod";
import { insertCustomerSchema, insertLeadSchema } from "../../shared/schema.js";

const router = Router();

// Validation schemas
const createContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  lifecycleStage: z.enum(['lead', 'opportunity', 'customer', 'evangelist', 'churned']).default('lead'),
  status: z.string().optional(),
  owner: z.string().optional(),
  source: z.string().optional(),
});

const updateContactSchema = createContactSchema.partial();

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

    const { stage, q, owner, page = '1', limit = '50' } = req.query;

    // Map frontend stage names to backend values
    let mappedStage = stage as string;
    if (stage === 'opportunities') mappedStage = 'opportunity';
    
    // Get all contacts from the unified service
    const allContacts = await storage.getUnifiedContacts(userId);
    
    let filteredContacts = allContacts;

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
          !contact.owner || contact.owner === 'Unassigned'
        );
      } else {
        filteredContacts = filteredContacts.filter(contact => 
          contact.owner === owner
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
    
    // Determine if this should be a lead or customer based on lifecycleStage
    if (validatedData.lifecycleStage === 'customer' || validatedData.lifecycleStage === 'evangelist') {
      // Create as customer
      const customerData = {
        email: validatedData.email,
        firstName: validatedData.name.split(' ')[0] || '',
        lastName: validatedData.name.split(' ').slice(1).join(' ') || '',
        company: validatedData.company || '',
        jobTitle: validatedData.jobTitle || '',
        industry: validatedData.industry || '',
        location: validatedData.country || '',
        phone: validatedData.phone || '',
        lifecycleStage: validatedData.lifecycleStage,
        customerStatus: validatedData.status || 'active',
        customerOwner: validatedData.owner || '',
        customerSource: validatedData.source || '',
      };
      
      const customer = await storage.createCustomer(customerData);
      
      res.status(201).json({
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        email: customer.email,
        jobTitle: customer.jobTitle,
        company: customer.company,
        industry: customer.industry,
        country: customer.location,
        lifecycleStage: customer.lifecycleStage,
        owner: customer.customerOwner,
        source: customer.customerSource,
        phone: customer.phone,
        lastActivity: customer.lastContactDate,
      });
    } else {
      // Create as lead
      const leadData = {
        name: validatedData.name,
        email: validatedData.email,
        company: validatedData.company || '',
        jobTitle: validatedData.jobTitle || '',
        industry: validatedData.industry || '',
        location: validatedData.country || '',
        phone: validatedData.phone || '',
        lifecycleStage: validatedData.lifecycleStage,
        leadStatus: validatedData.status || 'new',
        leadOwner: validatedData.owner || '',
        leadSource: validatedData.source || '',
        score: 0,
      };
      
      const lead = await storage.createLead(leadData);
      
      res.status(201).json({
        id: lead.id + 10000, // Offset to match frontend transformation
        name: lead.name,
        email: lead.email,
        jobTitle: lead.jobTitle,
        company: lead.company,
        industry: lead.industry,
        country: lead.location,
        lifecycleStage: lead.lifecycleStage,
        owner: lead.leadOwner,
        source: lead.leadSource,
        phone: lead.phone,
        lastActivity: lead.lastContactDate,
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
    const contactId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validatedData = updateContactSchema.parse(req.body);

    // Check if this is a lead (ID > 10000) or customer (ID <= 10000)
    let updatedContact;
    
    if (contactId > 10000) {
      // This is a lead
      const leadId = contactId - 10000;
      const leadData: any = {};
      
      if (validatedData.name) leadData.name = validatedData.name;
      if (validatedData.email) leadData.email = validatedData.email;
      if (validatedData.company) leadData.company = validatedData.company;
      if (validatedData.jobTitle) leadData.jobTitle = validatedData.jobTitle;
      if (validatedData.industry) leadData.industry = validatedData.industry;
      if (validatedData.country) leadData.location = validatedData.country;
      if (validatedData.phone) leadData.phone = validatedData.phone;
      if (validatedData.lifecycleStage) leadData.lifecycleStage = validatedData.lifecycleStage;
      if (validatedData.status) leadData.leadStatus = validatedData.status;
      if (validatedData.owner) leadData.leadOwner = validatedData.owner;
      if (validatedData.source) leadData.leadSource = validatedData.source;
      
      updatedContact = await storage.updateLead(leadId, leadData);
      
      // Transform back to unified format
      updatedContact = {
        id: updatedContact.id + 10000,
        name: updatedContact.name,
        email: updatedContact.email,
        jobTitle: updatedContact.jobTitle,
        company: updatedContact.company,
        industry: updatedContact.industry,
        country: updatedContact.location,
        lifecycleStage: updatedContact.lifecycleStage,
        owner: updatedContact.leadOwner,
        source: updatedContact.leadSource,
        phone: updatedContact.phone,
        lastActivity: updatedContact.lastContactDate,
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
      if (validatedData.country) customerData.location = validatedData.country;
      if (validatedData.phone) customerData.phone = validatedData.phone;
      if (validatedData.lifecycleStage) customerData.lifecycleStage = validatedData.lifecycleStage;
      if (validatedData.status) customerData.customerStatus = validatedData.status;
      if (validatedData.owner) customerData.customerOwner = validatedData.owner;
      if (validatedData.source) customerData.customerSource = validatedData.source;
      
      updatedContact = await storage.updateCustomer(contactId, customerData);
      
      // Transform back to unified format
      updatedContact = {
        id: updatedContact.id,
        name: `${updatedContact.firstName} ${updatedContact.lastName}`.trim(),
        email: updatedContact.email,
        jobTitle: updatedContact.jobTitle,
        company: updatedContact.company,
        industry: updatedContact.industry,
        country: updatedContact.location,
        lifecycleStage: updatedContact.lifecycleStage,
        owner: updatedContact.customerOwner,
        source: updatedContact.customerSource,
        phone: updatedContact.phone,
        lastActivity: updatedContact.lastContactDate,
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
      await storage.updateCustomer(contactId, { customerStatus: 'deleted' });
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