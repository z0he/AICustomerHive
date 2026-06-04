import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import type { IStorage } from '../storage';
import { createOrganizationScopedStorage } from '../storage/scoped-storage';
import { checkAuth } from '../middleware/auth';
import { z } from 'zod';
import { journeyIntegration } from '../services/journey-integration-simple.js';
import {
  insertMarketingFormSchema,
  insertFormSubmissionSchema,
  contacts,
  type MarketingForm,
  type InsertMarketingForm,
  type FormSubmission,
  type InsertFormSubmission,
  type WebVisitor,
  type InsertWebVisitor,
  type PageView,
  type InsertPageView,
  type TrackingInstallation
} from '@shared/schema';
import { db } from '../db';
import { and, eq, ne } from 'drizzle-orm';
import { getAppBaseUrl } from '../lib/app-url';

const router = Router();

// Helper function to get organization-scoped storage
function getScopedStorage(req: Request): IStorage {
  if (req.organization?.organizationId) {
    return createOrganizationScopedStorage(storage, req.organization.organizationId);
  }
  throw new Error("Organization context required but not found");
}

// ===== MARKETING FORMS ROUTES =====

// Get all forms
router.get('/forms', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const scopedStorage = getScopedStorage(req);
    const forms = await scopedStorage.getMarketingForms();
    return res.json(forms);
  } catch (error) {
    console.error('Error fetching marketing forms:', error);
    return res.status(500).json({ message: 'Failed to fetch marketing forms' });
  }
});

// Get form analytics - MUST be before /forms/:id to avoid "analytics" being parsed as an ID
router.get('/forms/analytics', checkAuth, (req: Request, res: Response) => {
  const analyticsData = {
    timeData: [
      { date: 'Apr 1', views: 120, submissions: 18, conversionRate: 15 },
      { date: 'Apr 8', views: 140, submissions: 24, conversionRate: 17.1 },
      { date: 'Apr 15', views: 135, submissions: 27, conversionRate: 20 },
      { date: 'Apr 22', views: 180, submissions: 36, conversionRate: 20 },
      { date: 'Apr 29', views: 210, submissions: 48, conversionRate: 22.9 },
      { date: 'May 1', views: 160, submissions: 35, conversionRate: 21.9 },
    ],
    deviceData: [
      { name: 'Desktop', value: 55 },
      { name: 'Mobile', value: 40 },
      { name: 'Tablet', value: 5 },
    ],
    sourceData: [
      { name: 'Direct Traffic', value: 30 },
      { name: 'Organic Search', value: 25 },
      { name: 'Social Media', value: 20 },
      { name: 'Email Campaigns', value: 15 },
      { name: 'Referrals', value: 10 },
    ],
  };
  
  return res.json(analyticsData);
});

// Get a single form
router.get('/forms/:id', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const scopedStorage = getScopedStorage(req);
    const id = parseInt(req.params.id);
    const form = await scopedStorage.getMarketingForm(id);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    return res.json(form);
  } catch (error) {
    console.error('Error fetching marketing form:', error);
    return res.status(500).json({ message: 'Failed to fetch marketing form' });
  }
});

// Create a new form
router.post('/forms', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const scopedStorage = getScopedStorage(req);
    // Validate basic form data
    const formData = insertMarketingFormSchema.parse({
      name: req.body.name,
      title: req.body.title,
      description: req.body.description,
      submitButtonText: req.body.submitButtonText,
      successMessage: req.body.successMessage,
      redirectUrl: req.body.redirectUrl,
      formFields: req.body.formFields,
      formType: req.body.formType,
      status: req.body.status,
      folder: req.body.folder,
      trackingEnabled: req.body.trackingEnabled,
      captchaEnabled: req.body.captchaEnabled,
      formStyle: req.body.formStyle,
      customCss: req.body.customCss,
      customJs: req.body.customJs,
      createdBy: req.user?.id,
    });
    
    // Create the form
    const form = await scopedStorage.createMarketingForm({
      ...formData,
      formFields: req.body.formFields, // Pass form fields as JSON
    });
    
    // Generate embed code after form is created
    const embedCode = await scopedStorage.generateFormEmbedCode(form.id);
    
    return res.status(201).json({ ...form, embedCode });
  } catch (error) {
    console.error('Error creating marketing form:', error);
    return res.status(400).json({ 
      message: 'Failed to create marketing form',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update a form
router.patch('/forms/:id', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const id = parseInt(req.params.id);
    const formData = req.body;
    
    // Check if form exists
    const existingForm = await scopedStorage.getMarketingForm(id);
    if (!existingForm) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Update the form
    const updatedForm = await scopedStorage.updateMarketingForm(id, formData);

    // Regenerate the embed code so it always reflects the current app URL.
    // Without this, a form created before an embed-host change keeps its stale
    // (and possibly unreachable) <script src>. generateFormEmbedCode also
    // persists the embedCode column, so the next fetch is fresh too.
    const embedCode = await scopedStorage.generateFormEmbedCode(id);
    return res.json({ ...updatedForm, embedCode });
  } catch (error) {
    console.error('Error updating marketing form:', error);
    return res.status(500).json({ message: 'Failed to update marketing form' });
  }
});

// Delete a form
router.delete('/forms/:id', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const id = parseInt(req.params.id);
    
    // Check if form exists
    const existingForm = await scopedStorage.getMarketingForm(id);
    if (!existingForm) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Delete the form
    const result = await scopedStorage.deleteMarketingForm(id);
    return res.json({ success: result });
  } catch (error) {
    console.error('Error deleting marketing form:', error);
    return res.status(500).json({ message: 'Failed to delete marketing form' });
  }
});


// Get form submissions
router.get('/forms/:id/submissions', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const formId = parseInt(req.params.id);
    const submissions = await scopedStorage.getFormSubmissions(formId);
    return res.json(submissions);
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    return res.status(500).json({ message: 'Failed to fetch form submissions' });
  }
});

// ===== PUBLIC FORM EMBED & SUBMISSION ENDPOINTS =====

// Serve a form's JavaScript embed code
router.get('/forms/embed/:id.js', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const id = parseInt(req.params.id);
    const form = await scopedStorage.getMarketingForm(id);
    
    if (!form) {
      return res.status(404).send('Form not found');
    }
    
    // Track form view
    await scopedStorage.incrementFormViews(id);
    
    // Set CORS headers to allow embedding on external websites
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/javascript');
    
    // Generate JavaScript embed code that will render the form. Pass the
    // canonical app URL so the embed's submit call targets this app directly,
    // rather than guessing its own origin at runtime (which breaks for async
    // scripts, where document.currentScript is null).
    const embedJs = generateEmbedJs(form, getAppBaseUrl());
    
    return res.send(embedJs);
  } catch (error) {
    console.error('Error serving form embed code:', error);
    return res.status(500).send('// Error loading form embed code');
  }
});

// Pull standard contact fields out of an arbitrary form submission. A form's
// field `name`s are author-defined, so we classify each field by its input
// type and by name/label keywords rather than assuming fixed keys. Returns
// only the fields we could confidently identify.
function extractContactFields(
  formFields: unknown,
  data: Record<string, any>,
): { email?: string; firstName?: string; lastName?: string; phone?: string; company?: string } {
  const result: { email?: string; firstName?: string; lastName?: string; phone?: string; company?: string } = {};
  let fullName: string | undefined;

  const fields = Array.isArray(formFields) ? formFields : [];
  for (const field of fields) {
    const value = data?.[field?.name];
    if (value == null || String(value).trim() === '') continue;
    const v = String(value).trim();
    const key = `${field?.name ?? ''} ${field?.label ?? ''}`.toLowerCase();
    const type = String(field?.type ?? '').toLowerCase();

    if (!result.email && (type === 'email' || /e-?mail/.test(key))) result.email = v;
    else if (!result.firstName && /(first.?name|fname|given)/.test(key)) result.firstName = v;
    else if (!result.lastName && /(last.?name|lname|surname|family)/.test(key)) result.lastName = v;
    else if (!result.phone && (type === 'tel' || /(phone|mobile|\btel\b)/.test(key))) result.phone = v;
    else if (!result.company && /(company|organi[sz]ation|business|employer)/.test(key)) result.company = v;
    else if (!fullName && /(full.?name|\bname\b)/.test(key)) fullName = v;
  }

  // Split a single combined "name" field into first/last when we have nothing better.
  if (fullName && !result.firstName) {
    const parts = fullName.split(/\s+/);
    result.firstName = parts.shift();
    if (parts.length && !result.lastName) result.lastName = parts.join(' ');
  }
  return result;
}

// Embedded forms post cross-origin (from the customer's website to this app),
// and the JSON content-type makes it a non-simple request, so the browser sends
// a CORS preflight OPTIONS first. router.post() never matches OPTIONS, so the
// preflight needs its own handler or the browser blocks the actual submit.
function setFormSubmitCorsHeaders(res: Response): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// CORS preflight for the public submit endpoint.
router.options('/forms/:id/submit', (_req: Request, res: Response) => {
  setFormSubmitCorsHeaders(res);
  return res.status(204).end();
});

// Submit a form (public endpoint - no auth required)
router.post('/forms/:id/submit', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    // The actual POST response also needs the CORS header so the browser lets
    // the page read it.
    setFormSubmitCorsHeaders(res);

    const formId = parseInt(req.params.id);
    const form = await scopedStorage.getMarketingForm(formId);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    if (form.status !== 'active') {
      return res.status(403).json({ message: 'This form is no longer accepting submissions' });
    }
    
    // Extract submission data from request
    const submissionData = {
      formId,
      data: req.body.data,
      submittedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      pageUrl: req.headers.referer,
      referrer: req.body.referrer,
      formSource: req.body.formSource || 'website',
      originalSource: req.body.originalSource,
      originalSourceDetail: req.body.originalSourceDetail,
      deviceType: req.body.deviceType,
      geoLocation: req.body.geoLocation,
      conversionPath: req.body.conversionPath,
      utmSource: req.body.utmSource,
      utmMedium: req.body.utmMedium,
      utmCampaign: req.body.utmCampaign,
      utmTerm: req.body.utmTerm,
      utmContent: req.body.utmContent,
    };
    
    // Create the submission
    const submission = await scopedStorage.createFormSubmission(submissionData);

    // Increment form submissions counter
    await scopedStorage.incrementFormSubmissions(formId);

    // Add the submitter to the CRM as a contact (HubSpot-style form behaviour).
    // Create-if-new, keyed on email within the org; enriching an existing
    // contact is a deliberate follow-up. Wrapped so a contact write can never
    // break the visitor-facing submission that already succeeded above.
    try {
      const orgId = req.organization?.organizationId;
      const fields = extractContactFields(form.formFields, req.body.data || {});
      if (orgId && fields.email) {
        const [existing] = await db
          .select({ id: contacts.id })
          .from(contacts)
          .where(and(
            eq(contacts.organizationId, orgId),
            ne(contacts.status, 'deleted'),
            eq(contacts.email, fields.email),
          ))
          .limit(1);

        if (!existing) {
          await db.insert(contacts).values({
            organizationId: orgId,
            firstName: fields.firstName ?? null,
            lastName: fields.lastName ?? null,
            email: fields.email,
            phone: fields.phone ?? null,
            company: fields.company ?? null,
            contactSource: 'Website',
            referrerUrl: submissionData.referrer ?? null,
            landingPageUrl: submissionData.pageUrl ?? null,
            utmSource: submissionData.utmSource ?? null,
            utmMedium: submissionData.utmMedium ?? null,
            utmCampaign: submissionData.utmCampaign ?? null,
            utmTerm: submissionData.utmTerm ?? null,
            utmContent: submissionData.utmContent ?? null,
          });
        }
      }
    } catch (contactErr) {
      console.error('Form submission stored, but contact creation failed:', contactErr);
    }

    // Return success response
    return res.status(201).json({
      success: true,
      message: form.successMessage || 'Thank you for your submission!',
      redirectUrl: form.redirectUrl || null,
    });
  } catch (error) {
    console.error('Error processing form submission:', error);
    return res.status(400).json({ 
      success: false,
      message: 'Failed to process form submission',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===== VISITOR TRACKING ROUTES =====

// Track page view
router.post('/track/pageview', async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const { visitorId, pageUrl, pageTitle, referrer, utmParams } = req.body;
    
    // Look up visitor or create new one
    let visitor = await scopedStorage.getWebVisitorByVisitorId(visitorId);
    
    if (!visitor) {
      // Create new visitor with required schema fields
      visitor = await scopedStorage.createWebVisitor({
        visitorId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
        deviceType: req.body.deviceType,
        browser: req.body.browser,
        operatingSystem: req.body.operatingSystem,
        country: req.body.country,
        region: req.body.region,
        city: req.body.city,
        firstReferrer: referrer,
        latestReferrer: referrer,
        originalSource: req.body.originalSource,
        originalSourceDetail: req.body.originalSourceDetail,
        firstPageSeen: pageUrl,
        lastPageSeen: pageUrl,
        conversionSource: null,
      });
    } else {
      // Update existing visitor
      await scopedStorage.updateWebVisitor(visitorId, {
        totalVisits: (visitor.totalVisits || 0) + 1,
        totalPageviews: (visitor.totalPageviews || 0) + 1,
        latestReferrer: referrer,
        lastPageSeen: pageUrl,
      });
    }
    
    // Record page view with required schema fields
    const pageView = await scopedStorage.createPageView({
      visitorId,
      pageUrl,
      pageTitle,
      referrer,
      utmSource: utmParams?.source,
      utmMedium: utmParams?.medium,
      utmCampaign: utmParams?.campaign,
      utmTerm: utmParams?.term,
      utmContent: utmParams?.content,
      deviceType: req.body.deviceType,
      browser: req.body.browser,
      operatingSystem: req.body.operatingSystem,
      ipAddress: req.ip,
      country: req.body.country,
      region: req.body.region,
      city: req.body.city,
      entryPage: req.body.isEntryPage,
      exitPage: false, // Will be updated on next pageview or session end
    });
    
    // Try to find tracking installation to create journey touchpoint
    try {
      const trackingInstallationId = req.body.trackingInstallationId;
      if (trackingInstallationId) {
        // Create journey touchpoint for website visit
        await journeyIntegration.createWebsiteVisitTouchpoint(
          trackingInstallationId,
          {
            visitorId,
            pageUrl,
            referrer,
            userAgent: req.headers['user-agent'] as string,
            ipAddress: req.ip
          },
          1 // Default user ID for system-created touchpoints
        );
      }
    } catch (journeyError) {
      console.error('Failed to create journey touchpoint for page view:', journeyError);
      // Don't fail the page view tracking if journey integration fails
    }
    
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error tracking page view:', error);
    return res.status(500).json({ message: 'Failed to track page view' });
  }
});

// Get tracking code (GET method for existing installs)
router.get('/tracking/code', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const websiteUrl = req.query.websiteUrl as string;
    
    if (!websiteUrl) {
      return res.status(400).json({ message: 'Website URL is required' });
    }
    
    // Generate or retrieve tracking code with owner ID
    // If req.user.id is undefined, we'll provide a default value of 1
    const ownerId = req.user?.id || 1;
    
    // Generate or retrieve tracking code
    const trackingCode = await scopedStorage.generateTrackingCode(websiteUrl, {
      owner: ownerId
    });
    
    return res.json({ trackingCode });
  } catch (error) {
    console.error('Error generating tracking code:', error);
    return res.status(500).json({ message: 'Failed to generate tracking code' });
  }
});

// Generate tracking code (POST method for new installs)
router.post('/tracking/code', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const { websiteUrl } = req.body;
    
    if (!websiteUrl) {
      return res.status(400).json({ message: 'Website URL is required' });
    }
    
    // Generate or retrieve tracking code with owner ID
    // If req.user.id is undefined, we'll provide a default value of 1
    const ownerId = req.user?.id || 1;
    
    const trackingCode = await scopedStorage.generateTrackingCode(websiteUrl, {
      owner: ownerId
    });
    
    return res.json({ trackingCode, success: true });
  } catch (error) {
    console.error('Error generating tracking code:', error);
    return res.status(500).json({ message: 'Failed to generate tracking code' });
  }
});

// Get all tracking installations
router.get('/tracking/installations', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const installations = await scopedStorage.getTrackingInstallations();
    
    // If user.id is available, filter installations by owner
    if (req.user?.id) {
      const filteredInstallations = installations.filter(
        (install: TrackingInstallation) => install.owner === req.user?.id
      );
      return res.json(filteredInstallations);
    }
    
    return res.json(installations);
  } catch (error) {
    console.error('Error fetching tracking installations:', error);
    return res.status(500).json({ message: 'Failed to fetch tracking installations' });
  }
});

// Update tracking installation
router.patch('/tracking/installations/:id', checkAuth, async (req: Request, res: Response) => {
    const scopedStorage = getScopedStorage(req);
  try {
    const id = parseInt(req.params.id);
    const { status, settings, notes } = req.body;
    
    const updated = await scopedStorage.updateTrackingInstallation(id, {
      status,
      settings,
      notes
    });
    
    return res.json(updated);
  } catch (error) {
    console.error('Error updating tracking installation:', error);
    return res.status(500).json({ message: 'Failed to update tracking installation' });
  }
});

// Helper function to generate JavaScript code for embedding forms
function generateEmbedJs(form: any, baseUrl: string): string {
  return `
// Form embed code for ${form.name} (ID: ${form.id})
(function() {
  // The CRM app URL is baked in at generation time so the submit call always
  // reaches the app, regardless of how the embed script is loaded.
  const baseUrl = ${JSON.stringify(baseUrl)};

  // Create form container
  const container = document.getElementById('crm-form-${form.id}');
  if (!container) {
    console.error('CRM Form container not found. Make sure you have <div id="crm-form-${form.id}"></div> on your page.');
    return;
  }
  
  // Form configuration
  const formConfig = ${JSON.stringify({
    id: form.id,
    title: form.title,
    description: form.description,
    submitButtonText: form.submitButtonText,
    formFields: form.formFields,
    formType: form.formType,
    trackingEnabled: form.trackingEnabled,
  })};
  
  // Styling for the form
  const style = document.createElement('style');
  style.textContent = \`
    .crm-form-container {
      font-family: system-ui, -apple-system, sans-serif;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
    }
    .crm-form-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .crm-form-description {
      margin-bottom: 1.5rem;
      color: #555;
    }
    .crm-form-field {
      margin-bottom: 1rem;
    }
    .crm-form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .crm-form-required {
      color: #e11d48;
      margin-left: 0.25rem;
    }
    .crm-form-input,
    .crm-form-textarea,
    .crm-form-select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
      font-size: 1rem;
    }
    .crm-form-submit {
      background-color: #2563eb;
      color: white;
      border: none;
      border-radius: 0.25rem;
      padding: 0.5rem 1rem;
      font-size: 1rem;
      cursor: pointer;
      width: 100%;
      margin-top: 1rem;
    }
    .crm-form-submit:hover {
      background-color: #1d4ed8;
    }
    .crm-form-error {
      color: #e11d48;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .crm-form-checkbox-label,
    .crm-form-radio-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    ${form.formStyle ? JSON.stringify(form.formStyle) : ''}
    ${form.customCss || ''}
  \`;
  document.head.appendChild(style);
  
  // Create form element
  const formEl = document.createElement('form');
  formEl.className = 'crm-form';
  formEl.addEventListener('submit', handleSubmit);
  
  // Add title and description
  if (formConfig.title) {
    const titleEl = document.createElement('h3');
    titleEl.className = 'crm-form-title';
    titleEl.textContent = formConfig.title;
    formEl.appendChild(titleEl);
  }
  
  if (formConfig.description) {
    const descEl = document.createElement('p');
    descEl.className = 'crm-form-description';
    descEl.textContent = formConfig.description;
    formEl.appendChild(descEl);
  }
  
  // Add form fields
  formConfig.formFields.forEach(field => {
    const fieldWrapper = document.createElement('div');
    fieldWrapper.className = 'crm-form-field';
    
    // Skip hidden fields from visible rendering
    if (field.type === 'hidden') {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = field.name;
      input.id = 'field-' + field.id;
      input.value = field.defaultValue || '';
      fieldWrapper.appendChild(input);
      formEl.appendChild(fieldWrapper);
      return;
    }
    
    // Create label for the field
    const label = document.createElement('label');
    label.className = 'crm-form-label';
    label.htmlFor = 'field-' + field.id;
    label.textContent = field.label;
    
    if (field.required) {
      const required = document.createElement('span');
      required.className = 'crm-form-required';
      required.textContent = '*';
      label.appendChild(required);
    }
    
    fieldWrapper.appendChild(label);
    
    // Create input based on field type
    let input;
    
    switch (field.type) {
      case 'textarea':
        input = document.createElement('textarea');
        input.className = 'crm-form-textarea';
        input.name = field.name;
        input.id = 'field-' + field.id;
        input.placeholder = field.placeholder || '';
        input.required = field.required;
        break;
        
      case 'select':
        input = document.createElement('select');
        input.className = 'crm-form-select';
        input.name = field.name;
        input.id = 'field-' + field.id;
        input.required = field.required;
        
        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = field.placeholder || 'Select an option';
        placeholderOption.selected = true;
        placeholderOption.disabled = true;
        input.appendChild(placeholderOption);
        
        // Add options
        if (field.options) {
          field.options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            input.appendChild(optionEl);
          });
        }
        break;
        
      case 'radio':
        input = document.createElement('div');
        input.className = 'crm-form-radio-group';
        
        if (field.options) {
          field.options.forEach((option, i) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'crm-form-radio-wrapper';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = field.name;
            radio.id = 'field-' + field.id + '-' + i;
            radio.value = option.value;
            radio.required = field.required;
            
            const radioLabel = document.createElement('label');
            radioLabel.className = 'crm-form-radio-label';
            radioLabel.htmlFor = 'field-' + field.id + '-' + i;
            radioLabel.textContent = option.label;
            
            wrapper.appendChild(radio);
            wrapper.appendChild(radioLabel);
            input.appendChild(wrapper);
          });
        }
        break;
        
      case 'checkbox':
        const wrapper = document.createElement('div');
        wrapper.className = 'crm-form-checkbox-wrapper';
        
        input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'crm-form-checkbox';
        input.name = field.name;
        input.id = 'field-' + field.id;
        input.required = field.required;
        input.value = 'true';
        
        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'crm-form-checkbox-label';
        checkboxLabel.htmlFor = 'field-' + field.id;
        checkboxLabel.textContent = field.label;
        
        wrapper.appendChild(input);
        wrapper.appendChild(checkboxLabel);
        
        // Replace the default label with the wrapper
        fieldWrapper.removeChild(label);
        fieldWrapper.appendChild(wrapper);
        break;
        
      default:
        input = document.createElement('input');
        input.className = 'crm-form-input';
        input.type = field.type;
        input.name = field.name;
        input.id = 'field-' + field.id;
        input.placeholder = field.placeholder || '';
        input.required = field.required;
        if (field.defaultValue) {
          input.value = field.defaultValue;
        }
    }
    
    if (input && field.type !== 'checkbox') {
      fieldWrapper.appendChild(input);
    }
    
    // Add help text if available
    if (field.helpText) {
      const helpText = document.createElement('div');
      helpText.className = 'crm-form-help';
      helpText.textContent = field.helpText;
      fieldWrapper.appendChild(helpText);
    }
    
    formEl.appendChild(fieldWrapper);
  });
  
  // Add submit button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'crm-form-submit';
  submitBtn.textContent = formConfig.submitButtonText || 'Submit';
  formEl.appendChild(submitBtn);
  
  // Append the form to the container
  container.appendChild(formEl);
  
  // Form submission handler
  async function handleSubmit(e) {
    e.preventDefault();
    
    // Collect form data
    const formData = new FormData(e.target);
    const data = {};
    for (const [name, value] of formData.entries()) {
      data[name] = value;
    }
    
    // Get tracking data
    const trackingData = {};
    if (formConfig.trackingEnabled) {
      // Add UTM parameters
      const url = new URL(window.location.href);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
        const value = url.searchParams.get(param);
        if (value) {
          trackingData[param.replace('utm_', '')] = value;
        }
      });
      
      // Add referrer
      trackingData.referrer = document.referrer;
      
      // Add device info
      trackingData.deviceType = /mobile|android|ios/i.test(navigator.userAgent) ? 'mobile' : 
                               /tablet|ipad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';
      
      // Add browser info
      trackingData.browser = getBrowser();
      
      // Add OS info
      trackingData.operatingSystem = getOS();
    }
    
    // Submit the form
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      
      const response = await fetch(baseUrl + '/api/marketing/forms/${form.id}/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data,
          ...trackingData,
          formSource: window.location.hostname,
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message or redirect
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        } else {
          // Replace form with success message
          container.innerHTML = '<div class="crm-form-success">' + 
                              (result.message || 'Thank you for your submission!') + 
                              '</div>';
        }
      } else {
        throw new Error(result.message || 'Form submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Show error message
      const errorEl = document.createElement('div');
      errorEl.className = 'crm-form-error';
      errorEl.textContent = error.message || 'There was an error submitting the form. Please try again.';
      
      // Remove any existing error messages
      const existingError = formEl.querySelector('.crm-form-error');
      if (existingError) {
        formEl.removeChild(existingError);
      }
      
      formEl.prepend(errorEl);
      
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = formConfig.submitButtonText || 'Submit';
    }
  }
  
  // Helper function to detect browser
  function getBrowser() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('SamsungBrowser')) return 'Samsung Browser';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    return 'Unknown';
  }
  
  // Helper function to detect OS
  function getOS() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'Mac OS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('like Mac')) return 'iOS';
    return 'Unknown';
  }
})();
  `;
}

export default router;