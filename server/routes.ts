import express, { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { interpretVoiceCommand, generateCampaignSuggestions, analyzeCustomerData, hasValidApiKey, getCrmAssistantResponse } from "./lib/openai";
import { usageService } from "./lib/usage-service";
import { sendEmail, sendTemplateEmail, isMailgunConfigured, reinitializeMailgunClient } from "./lib/mailgun";
import { z } from "zod";
import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';
import { UploadedFile } from 'express-fileupload';

// Extend Request type for file uploads
interface RequestWithFiles extends Request {
  files?: {
    [fieldname: string]: UploadedFile | UploadedFile[];
  } | UploadedFile | UploadedFile[];
}
import { 
  insertCampaignSchema, 
  insertCustomerSchema, 
  insertLeadSchema, 
  insertTaskSchema,
  insertMessageVariantSchema,
  insertCalendarEventSchema,
  insertEmailTemplateSchema,
  insertEmailLogSchema,
  insertChatConversationSchema,
  insertChatMessageSchema,
  insertCustomerTouchpointSchema,
  insertJourneyStageSchema
} from "@shared/schema";
import { setupAuth } from "./auth";
import marketingRoutes from "./routes/marketing";
import notificationRoutes from "./routes/notifications";
import feedbackRoutes from "./routes/feedback";
import directFeedbackRoutes from "./routes/direct-feedback";
import * as leadManagement from "./routes/lead-management.js";
import { journeyIntegration } from "./services/journey-integration-simple.js";
import unifiedJourneyRoutes from "./routes/unified-journey.js";
import dataConsistencyRoutes from "./routes/data-consistency.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Mount marketing routes
  app.use("/api/marketing", marketingRoutes);
  
  // Mount notification routes
  app.use(notificationRoutes);
  
  // Mount feedback routes
  app.use(feedbackRoutes);
  
  // Mount direct feedback routes
  app.use(directFeedbackRoutes);
  
  // Mount unified journey routes
  app.use("/api", unifiedJourneyRoutes);
  
  // Mount data consistency routes
  app.use("/api", dataConsistencyRoutes);
  
  // Legacy compatibility redirect for user current route
  app.get("/api/user/current", (req, res) => {
    return res.redirect("/api/auth/user");
  });
  
  // ===== PERSONALIZATION ROUTES =====
  
  // Get available personalization tokens
  app.get("/api/personalization/tokens", async (req: Request, res: Response) => {
    try {
      const { personalizationEngine } = await import('./lib/personalization');
      const tokens = personalizationEngine.getAvailableTokens();
      return res.json(tokens);
    } catch (error) {
      console.error("Error fetching personalization tokens:", error);
      return res.status(500).json({ message: "Failed to fetch personalization tokens" });
    }
  });
  
  // Preview personalized content
  app.post("/api/personalization/preview", async (req: Request, res: Response) => {
    try {
      const { content, sampleEmail } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }
      
      const { personalizationEngine } = await import('./lib/personalization');
      const preview = await personalizationEngine.previewContent(content, sampleEmail);
      
      return res.json(preview);
    } catch (error) {
      console.error("Error previewing personalized content:", error);
      return res.status(500).json({ message: "Failed to preview personalized content" });
    }
  });

  // Send personalized test email
  app.post("/api/email/send-personalized-test", async (req: Request, res: Response) => {
    try {
      const { to, subject, content } = req.body;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!to || !subject || !content) {
        return res.status(400).json({ message: "Missing required fields: to, subject, content" });
      }
      
      const { personalizationEngine } = await import('./lib/personalization');
      const { sendEmail, reinitializeMailgunClient } = await import('./lib/mailgun');
      
      // Force reinitialize Mailgun client to ensure it uses current domain credentials
      reinitializeMailgunClient();
      
      // Debug: Log the domain being used
      console.log('Mailgun domain being used:', process.env.MAILGUN_DOMAIN);
      
      // Process personalization tokens
      const personalizedSubject = await personalizationEngine.processContent(subject, to);
      const personalizedContent = await personalizationEngine.processContent(content, to);
      
      // Send the email
      const success = await sendEmail({
        from: process.env.DEFAULT_FROM_EMAIL || 'noreply@mail.aicrm.co.uk',
        to,
        subject: `[TEST] ${personalizedSubject}`,
        html: personalizedContent,
        text: personalizedContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
      });
      
      if (!success) {
        throw new Error('Failed to send email through Mailgun');
      }
      
      // Log the email
      const fromEmail = process.env.DEFAULT_FROM_EMAIL || 'noreply@mail.aicrm.co.uk';
      const emailLog = await storage.createEmailLog({
        userId,
        from: fromEmail,
        to,
        subject: `[TEST] ${personalizedSubject}`,
        body: personalizedContent,
        status: 'sent',
        metadata: { 
          testEmail: true,
          originalSubject: subject,
          originalContent: content,
          personalizationApplied: true
        }
      });
      
      return res.json({ 
        success: true, 
        message: "Personalized test email sent successfully",
        personalizedSubject,
        emailLogId: emailLog.id
      });
    } catch (error) {
      console.error("Error sending personalized test email:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to send personalized test email" 
      });
    }
  });
  
  // Voice command routes
  app.post("/api/voice/interpret", async (req: Request, res: Response) => {
    try {
      const { transcript } = req.body;
      
      if (!transcript) {
        return res.status(400).json({ message: "Transcript is required" });
      }
      
      const interpretation = await interpretVoiceCommand(transcript);
      return res.json(interpretation);
    } catch (error) {
      console.error("Voice interpret error:", error);
      return res.status(500).json({ message: "Failed to interpret voice command" });
    }
  });
  
  // Personal OpenAI API Configuration endpoint
  app.post("/api/config/openai", async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.body;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      // Store personal API key in database
      await storage.updateUserPersonalKeys(userId, { openaiKey: apiKey });
      
      console.log("OpenAI API key configuration requested");
      return res.json({ success: true, message: "OpenAI API key has been configured" });
    } catch (error) {
      console.error("API configuration error:", error);
      return res.status(500).json({ message: "Failed to configure API key" });
    }
  });
  
  // Check OpenAI API key status
  app.get("/api/config/openai/status", async (req: Request, res: Response) => {
    try {
      // Use the hasValidApiKey function from our openai.ts
      const isConfigured = hasValidApiKey();
      return res.json({ configured: isConfigured });
    } catch (error) {
      console.error("API key status check error:", error);
      return res.status(500).json({ message: "Failed to check API key status" });
    }
  });
  
  // Campaign routes
  app.get("/api/campaigns", async (req: Request, res: Response) => {
    try {
      const period = req.query.period as string || '30d';
      const campaigns = await storage.getCampaigns(period);
      return res.json(campaigns);
    } catch (error) {
      console.error("Get campaigns error:", error);
      return res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });
  
  app.post("/api/campaigns", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      return res.status(201).json(campaign);
    } catch (error) {
      console.error("Create campaign error:", error);
      return res.status(400).json({ message: "Invalid campaign data" });
    }
  });
  
  app.get("/api/campaigns/recent", async (req: Request, res: Response) => {
    try {
      const recentCampaigns = await storage.getRecentCampaigns();
      return res.json(recentCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        path: `/campaigns/${c.id}`
      })));
    } catch (error) {
      console.error("Get recent campaigns error:", error);
      return res.status(500).json({ message: "Failed to fetch recent campaigns" });
    }
  });
  
  app.get("/api/campaigns/emails", async (req: Request, res: Response) => {
    try {
      // Get email logs from the database
      const emailLogs = await storage.getEmailLogs();
      
      // If no email logs exist, return empty array instead of error
      if (!emailLogs || emailLogs.length === 0) {
        return res.json([]);
      }
      
      // For debugging purpose
      console.log('Email logs found:', emailLogs.length);
      
      // Get campaigns and templates for supplementary info
      const campaigns = await storage.getCampaigns();
      const templates = await storage.getEmailTemplates();
      
      // Transform email logs into campaign emails format with added error handling
      const campaignEmails = emailLogs.map(log => {
        try {
          // Find related campaign if exists (but don't error if not found)
          const campaign = log.campaignId 
            ? campaigns.find(c => c.id === log.campaignId) 
            : null;
          
          // Find related template if exists (but don't error if not found)
          const template = log.templateId 
            ? templates.find(t => t.id === log.templateId) 
            : null;
          
          return {
            id: log.id,
            campaignId: log.campaignId || 0,
            campaignName: campaign ? campaign.name : "Direct Email",
            templateId: log.templateId || 0,
            templateName: template ? template.name : "Custom Template",
            subject: log.subject || "Email Campaign",
            segmentId: null, // No segment data in the logs yet
            segmentName: null,
            status: log.status || "scheduled",
            scheduledFor: log.sentAt, // Using sentAt as scheduledFor for now
            sentAt: log.status === 'sent' ? log.sentAt : null
          };
        } catch (error) {
          console.error("Error processing email log:", error, log);
          // Return a default object if there's an error
          return {
            id: log.id || 0,
            campaignId: 0,
            campaignName: "Direct Email",
            templateId: 0,
            templateName: "Custom Template",
            subject: "Email Campaign",
            segmentId: null,
            segmentName: null,
            status: "scheduled",
            scheduledFor: new Date(),
            sentAt: null
          };
        }
      });
      
      return res.json(campaignEmails);
    } catch (error) {
      console.error("Get campaign emails error:", error);
      return res.status(500).json({ message: "Failed to fetch campaign emails" });
    }
  });
  
  app.get("/api/campaigns/:id", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      return res.json(campaign);
    } catch (error) {
      console.error("Get campaign error:", error);
      return res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });
  
  // Message Variant routes (for A/B testing)
  app.get("/api/campaigns/:id/variants", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      const variants = await storage.getMessageVariants(campaignId);
      return res.json(variants);
    } catch (error) {
      console.error("Get message variants error:", error);
      return res.status(500).json({ message: "Failed to fetch message variants" });
    }
  });
  
  app.post("/api/campaigns/:id/variants", async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: "Invalid campaign ID" });
      }
      
      // Create a Zod validator that includes the campaign ID
      const variantWithCampaignId = insertMessageVariantSchema.extend({
        campaignId: z.number()
      });
      
      const validatedData = variantWithCampaignId.parse({
        ...req.body,
        campaignId
      });
      
      const variant = await storage.createMessageVariant(validatedData);
      return res.status(201).json(variant);
    } catch (error) {
      console.error("Create message variant error:", error);
      return res.status(400).json({ message: "Invalid message variant data" });
    }
  });
  
  app.post("/api/variants/:id/stats", async (req: Request, res: Response) => {
    try {
      const variantId = parseInt(req.params.id);
      if (isNaN(variantId)) {
        return res.status(400).json({ message: "Invalid variant ID" });
      }
      
      const { impressions, conversions } = req.body;
      
      // Both can be optional, but at least one should be provided
      if (impressions === undefined && conversions === undefined) {
        return res.status(400).json({ message: "At least one of impressions or conversions must be provided" });
      }
      
      const variant = await storage.updateMessageVariantStats(variantId, impressions, conversions);
      return res.json(variant);
    } catch (error) {
      console.error("Update variant stats error:", error);
      return res.status(500).json({ message: "Failed to update variant statistics" });
    }
  });
  
  // Customer routes
  app.get("/api/customers", async (req: Request, res: Response) => {
    try {
      const customers = await storage.getCustomers();
      return res.json(customers);
    } catch (error) {
      console.error("Get customers error:", error);
      return res.status(500).json({ message: "Failed to fetch customers" });
    }
  });
  
  // Customer trend data endpoint
  app.get("/api/customers/trend", async (req: Request, res: Response) => {
    try {
      const customers = await storage.getCustomers();
      
      // Get the creation dates and sort them
      const dates = customers.map(c => new Date(c.createdAt).getTime()).sort();
      
      // Group by month to create trend data
      const monthlyData: {[key: string]: {newCustomers: number, activeCustomers: number}} = {};
      
      // Create records for the last 6 months
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = month.toLocaleString('default', { month: 'short' });
        monthlyData[monthKey] = { newCustomers: 0, activeCustomers: 0 };
      }
      
      // Process customer data
      customers.forEach(customer => {
        const creationDate = new Date(customer.createdAt);
        const monthKey = creationDate.toLocaleString('default', { month: 'short' });
        
        // Only count if it's in our 6-month window
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].newCustomers += 1;
        }
        
        // For active customers, we'll count all customers created up to this month
        Object.keys(monthlyData).forEach(month => {
          const monthDate = new Date(now.getFullYear(), Object.keys(monthlyData).indexOf(month), 1);
          if (creationDate <= monthDate) {
            monthlyData[month].activeCustomers += 1;
          }
        });
      });
      
      // Convert to array format for chart
      const trendData = Object.keys(monthlyData).map(month => ({
        month,
        newCustomers: monthlyData[month].newCustomers,
        activeCustomers: monthlyData[month].activeCustomers
      }));
      
      return res.json(trendData);
    } catch (error) {
      console.error("Get customer trend error:", error);
      return res.status(500).json({ message: "Failed to fetch customer trend data" });
    }
  });
  
  app.post("/api/customers", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      return res.status(201).json(customer);
    } catch (error) {
      console.error("Create customer error:", error);
      return res.status(400).json({ message: "Invalid customer data" });
    }
  });
  
  app.get("/api/customers/activity", async (req: Request, res: Response) => {
    try {
      const activities = await storage.getCustomerActivities();
      const customers = await storage.getCustomers();
      
      // Map customer data to activities
      const activitiesWithCustomers = activities.map(activity => {
        const customer = customers.find(c => c.id === activity.customerId);
        return {
          ...activity,
          customer: customer ? {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            initials: customer.initials
          } : undefined
        };
      });
      
      return res.json(activitiesWithCustomers);
    } catch (error) {
      console.error("Get customer activities error:", error);
      return res.status(500).json({ message: "Failed to fetch customer activities" });
    }
  });
  
  // Lead routes
  app.get("/api/leads", async (req: Request, res: Response) => {
    try {
      // Handle filtering options
      const source = req.query.source as string;
      const status = req.query.status as string;
      const minScore = req.query.minScore ? parseInt(req.query.minScore as string) : undefined;
      const maxScore = req.query.maxScore ? parseInt(req.query.maxScore as string) : undefined;
      const requiresFollowUp = req.query.requiresFollowUp === 'true';
      
      // Apply filters based on query parameters
      if (source) {
        const leads = await storage.getLeadsBySource(source);
        return res.json(leads);
      } else if (status) {
        const leads = await storage.getLeadsByStatus(status);
        return res.json(leads);
      } else if (minScore !== undefined && maxScore !== undefined) {
        const leads = await storage.getLeadsByScoreRange(minScore, maxScore);
        return res.json(leads);
      } else if (requiresFollowUp) {
        const leads = await storage.getLeadsRequiringFollowUp();
        return res.json(leads);
      } else {
        // Default: return all leads
        const leads = await storage.getLeads();
        return res.json(leads);
      }
    } catch (error) {
      console.error("Get leads error:", error);
      return res.status(500).json({ message: "Failed to fetch leads" });
    }
  });
  
  app.get("/api/leads/top", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const leads = await storage.getTopLeads(limit);
      return res.json(leads);
    } catch (error) {
      console.error("Get top leads error:", error);
      return res.status(500).json({ message: "Failed to fetch top leads" });
    }
  });
  
  app.post("/api/leads", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id || 1;
      const validatedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validatedData);
      
      // Create journey touchpoint for lead creation
      await journeyIntegration.createLeadCreationTouchpoint(lead, userId);
      
      return res.status(201).json(lead);
    } catch (error) {
      console.error("Create lead error:", error);
      return res.status(400).json({ message: "Invalid lead data" });
    }
  });
  
  app.get("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }
      
      const lead = await storage.getLead(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      return res.json(lead);
    } catch (error) {
      console.error("Get lead error:", error);
      return res.status(500).json({ message: "Failed to fetch lead" });
    }
  });
  
  app.patch("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }
      
      const userId = (req as any).user?.id || 1;
      
      // Get the current lead to track status changes
      const currentLead = await storage.getLead(id);
      const oldStatus = currentLead?.leadStatus || 'new';
      
      const lead = await storage.updateLead(id, req.body);
      
      // Create journey touchpoint if status changed
      if (req.body.leadStatus && req.body.leadStatus !== oldStatus) {
        await journeyIntegration.createLeadStatusChangeTouchpoint(
          id, 
          oldStatus, 
          req.body.leadStatus, 
          userId
        );
      }
      
      return res.json(lead);
    } catch (error) {
      console.error("Update lead error:", error);
      return res.status(500).json({ message: "Failed to update lead" });
    }
  });
  
  app.post("/api/leads/:id/score", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }
      
      const scoringData = req.body;
      const lead = await storage.updateLeadScore(id, scoringData);
      return res.json(lead);
    } catch (error) {
      console.error("Update lead score error:", error);
      return res.status(500).json({ message: "Failed to update lead score" });
    }
  });
  
  app.post("/api/leads/:id/owner", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }
      
      const { ownerName } = req.body;
      if (!ownerName) {
        return res.status(400).json({ message: "Owner name is required" });
      }
      
      const lead = await storage.assignLeadOwner(id, ownerName);
      return res.json(lead);
    } catch (error) {
      console.error("Assign lead owner error:", error);
      return res.status(500).json({ message: "Failed to assign lead owner" });
    }
  });
  
  app.post("/api/leads/:id/tags", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }
      
      const { tags } = req.body;
      if (!tags || !Array.isArray(tags)) {
        return res.status(400).json({ message: "Tags array is required" });
      }
      
      const lead = await storage.addLeadTags(id, tags);
      return res.json(lead);
    } catch (error) {
      console.error("Add lead tags error:", error);
      return res.status(500).json({ message: "Failed to add lead tags" });
    }
  });
  
  app.post("/api/leads/:id/notes", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }
      
      const { note } = req.body;
      if (!note) {
        return res.status(400).json({ message: "Note content is required" });
      }
      
      const lead = await storage.addLeadNote(id, note);
      return res.json(lead);
    } catch (error) {
      console.error("Add lead note error:", error);
      return res.status(500).json({ message: "Failed to add lead note" });
    }
  });
  
  // Task routes
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getTasks();
      return res.json(tasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      return res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  
  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      return res.status(201).json(task);
    } catch (error) {
      console.error("Create task error:", error);
      return res.status(400).json({ message: "Invalid task data" });
    }
  });
  
  app.patch("/api/tasks/:id/toggle", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      const task = await storage.toggleTaskCompletion(id);
      return res.json(task);
    } catch (error) {
      console.error("Toggle task error:", error);
      return res.status(500).json({ message: "Failed to toggle task" });
    }
  });
  
  // Conversion funnel data endpoint - now uses actual Customer Journey data
  app.get("/api/customers/funnel", async (req: Request, res: Response) => {
    try {
      const customers = await storage.getCustomers();
      const leads = await storage.getLeads();
      const touchpoints = await storage.getCustomerTouchpoints();
      const journeyStages = await storage.getJourneyStages();
      
      // Get actual journey stage progression from touchpoints
      const stageProgression = {
        awareness: 0,
        consideration: 0,
        decision: 0,
        retention: 0,
        advocacy: 0
      };
      
      // Count customers in each stage based on their latest touchpoint
      const customerStages = new Map<number, string>();
      
      // Group touchpoints by customer and find their current stage
      const customerTouchpoints = touchpoints.reduce((acc, touchpoint) => {
        if (!acc[touchpoint.customerId]) {
          acc[touchpoint.customerId] = [];
        }
        acc[touchpoint.customerId].push(touchpoint);
        return acc;
      }, {} as Record<number, typeof touchpoints>);
      
      // Determine current stage for each customer based on latest touchpoint
      Object.entries(customerTouchpoints).forEach(([customerIdStr, customerTPs]) => {
        const customerId = parseInt(customerIdStr);
        const sortedTouchpoints = customerTPs.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latestStage = sortedTouchpoints[0]?.touchpointStage || 'awareness';
        customerStages.set(customerId, latestStage);
        
        // Count customers in each stage
        if (stageProgression.hasOwnProperty(latestStage)) {
          stageProgression[latestStage as keyof typeof stageProgression]++;
        }
      });
      
      // Create funnel data based on actual customer journey progression
      const funnelData = [
        {
          name: 'Leads',
          value: leads.length
        },
        {
          name: 'Qualified',
          value: stageProgression.consideration + stageProgression.decision + stageProgression.retention + stageProgression.advocacy
        },
        {
          name: 'Opportunities', 
          value: stageProgression.decision + stageProgression.retention + stageProgression.advocacy
        },
        {
          name: 'Proposals',
          value: stageProgression.retention + stageProgression.advocacy
        },
        {
          name: 'Customers',
          value: customers.length
        }
      ];
      
      return res.json(funnelData);
    } catch (error) {
      console.error("Get funnel data error:", error);
      return res.status(500).json({ message: "Failed to fetch conversion funnel data" });
    }
  });

  // Metrics route
  app.get("/api/metrics", async (req: Request, res: Response) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      return res.json(metrics);
    } catch (error) {
      console.error("Get metrics error:", error);
      return res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });
  
  // Notifications route
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      // In a real app, fetch user-specific notifications
      // For demo, return mock notifications
      return res.json([
        { id: 1, message: "New lead from website", date: "Today, 10:45 AM", read: false },
        { id: 2, message: "Campaign 'Summer Sale' is performing well", date: "Today, 9:30 AM", read: false },
        { id: 3, message: "5 tasks due today", date: "Today, 8:15 AM", read: false }
      ]);
    } catch (error) {
      console.error("Get notifications error:", error);
      return res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });
  
  // AI insights endpoint
  app.get("/api/ai/insights", async (req: Request, res: Response) => {
    try {
      const period = req.query.period as string || '30d';
      
      // Get customer data to analyze
      const customers = await storage.getCustomers();
      
      // Call the OpenAI function to analyze customer data
      const insights = await analyzeCustomerData(customers);
      
      // Log the response for debugging
      console.log("AI Insights response:", JSON.stringify(insights));
      
      return res.json(insights);
    } catch (error) {
      console.error("Get AI insights error:", error);
      return res.status(500).json({ message: "Failed to generate AI insights" });
    }
  });

  // AI Campaign suggestions
  app.post("/api/ai/campaign-suggestions", async (req: Request, res: Response) => {
    try {
      const { campaignGoal, targetAudience } = req.body;
      
      if (!campaignGoal || !targetAudience) {
        return res.status(400).json({ message: "Campaign goal and target audience are required" });
      }
      
      const suggestions = await generateCampaignSuggestions(campaignGoal, targetAudience);
      return res.json({ suggestions });
    } catch (error) {
      console.error("Generate campaign suggestions error:", error);
      return res.status(500).json({ message: "Failed to generate campaign suggestions" });
    }
  });
  
  // CRM AI Assistant endpoints
  app.post("/api/ai/assistant/chat", async (req: Request, res: Response) => {
    try {
      const { message, conversationId, crmContext } = req.body;
      const userId = req.user?.id;
      
      if (!message || !userId) {
        return res.status(400).json({ message: "Message and user authentication are required" });
      }
      
      // Get existing conversation or create a new one
      let conversation;
      let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
      
      if (conversationId) {
        // Get existing conversation
        conversation = await storage.getChatConversationById(conversationId);
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        
        // Get conversation history
        const messages = await storage.getChatMessagesByConversationId(conversationId);
        conversationHistory = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));
      } else {
        // Create a new conversation
        const title = `Conversation ${new Date().toLocaleDateString()}`;
        const newConversation = {
          userId,
          title,
          context: crmContext || {},
          createdAt: new Date(),
        };
        
        conversation = await storage.createChatConversation(newConversation);
      }
      
      // Save user message
      const userMessage = {
        conversationId: conversation.id,
        content: message,
        role: "user",
        createdAt: new Date()
      };
      await storage.createChatMessage(userMessage);
      
      // Add the current message to the history for the AI
      conversationHistory.push({
        role: "user" as const,
        content: message
      });
      
      // Get AI response
      const assistantResponse = await getCrmAssistantResponse(message, conversationHistory, crmContext || {});
      
      // Save assistant message
      const assistantMessage = {
        conversationId: conversation.id,
        content: assistantResponse.response,
        role: "assistant",
        createdAt: new Date(),
        metadata: { suggestedActions: assistantResponse.suggestedActions }
      };
      await storage.createChatMessage(assistantMessage);
      
      return res.json({
        ...assistantResponse,
        conversationId: conversation.id
      });
    } catch (error) {
      console.error("CRM Assistant chat error:", error);
      return res.status(500).json({ message: "Failed to process chat message" });
    }
  });
  
  app.get("/api/ai/assistant/conversations", async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const conversations = await storage.getChatConversationsByUserId(userId);
      return res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      return res.status(500).json({ message: "Failed to get conversations" });
    }
  });
  
  app.get("/api/ai/assistant/conversations/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const conversation = await storage.getChatConversationById(parseInt(id));
      
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const messages = await storage.getChatMessagesByConversationId(parseInt(id));
      
      return res.json({
        conversation,
        messages
      });
    } catch (error) {
      console.error("Get conversation messages error:", error);
      return res.status(500).json({ message: "Failed to get conversation messages" });
    }
  });
  
  // Performance metrics for interactive charts
  app.get("/api/metrics/performance", async (req: Request, res: Response) => {
    try {
      const period = req.query.period as string || '30d';
      
      // Get all campaigns for conversion data
      const campaigns = await storage.getCampaigns(period);
      // Get leads data
      const leads = await storage.getLeads();
      // Get customers data for sales metrics
      const customers = await storage.getCustomers();
      
      // Generate daily data points for the last 30 days (or based on period)
      const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
      const performanceData = [];
      
      const now = new Date();
      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Calculate metrics for this date
        // For a real app, we would query actual date-specific data from the database
        // For now, we'll spread conversions and sales across dates
        
        // Calculate total conversions for this date (simulate some distribution)
        const totalConversions = campaigns.reduce((sum, campaign) => {
          const conversions = typeof campaign.conversions === 'number' ? campaign.conversions : 0;
          return sum + conversions;
        }, 0);
        const dateConversions = Math.floor(totalConversions / days * (Math.random() * 0.5 + 0.75));
        
        // Calculate sales as a function of conversions with some variance
        const dateSales = Math.floor(dateConversions * (Math.random() * 100 + 200));
        
        // Calculate lead count with some randomization
        const totalLeads = leads.length;
        const dateLeads = Math.floor(totalLeads / days * (Math.random() * 0.5 + 0.75));
        
        performanceData.push({
          date: dateStr,
          conversions: dateConversions,
          sales: dateSales,
          leads: dateLeads
        });
      }
      
      return res.json(performanceData);
    } catch (error) {
      console.error("Get performance metrics error:", error);
      return res.status(500).json({ message: "Failed to fetch performance metrics data" });
    }
  });

  // ===== CUSTOMER EXPORT/IMPORT ROUTES =====
  
  app.get("/api/customers/export", async (req: Request, res: Response) => {
    try {
      const format = (req.query.format || 'json') as string;
      const exportData = await storage.exportCustomers();
      
      if (format.toLowerCase() === 'csv') {
        // Convert to CSV
        const header = exportData.metadata.fields;
        const rows = exportData.data.map((customer: any) => {
          return header.map((field: string) => customer[field] !== undefined ? customer[field] : '');
        });
        
        // Add header row
        rows.unshift(header);
        
        // Generate CSV
        const csvOutput = csvStringify(rows);
        
        // Send as file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="customer-export.csv"');
        return res.send(csvOutput);
      } else {
        // Default JSON format
        return res.json(exportData);
      }
    } catch (error) {
      console.error("Export customers error:", error);
      return res.status(500).json({ message: "Failed to export customer data" });
    }
  });
  
  app.post("/api/customers/import", async (req: RequestWithFiles, res: Response) => {
    try {
      const contentType = req.headers['content-type'] || '';
      let data;
      
      if (contentType.includes('multipart/form-data')) {
        // Handle file upload for CSV
        if (!req.files || !req.files.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        const file = req.files.file as UploadedFile;
        const csvData = file.data.toString('utf8');
        
        // Parse CSV to JSON
        try {
          data = csvParse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true
          });
        } catch (csvError) {
          console.error("CSV parse error:", csvError);
          return res.status(400).json({ message: "Invalid CSV format" });
        }
      } else {
        // Handle JSON data
        const { data: jsonData } = req.body;
        
        if (!jsonData || !Array.isArray(jsonData)) {
          return res.status(400).json({ message: "Invalid import data. Expected array of customer records." });
        }
        
        data = jsonData;
      }
      
      const result = await storage.importCustomers(data);
      return res.json(result);
    } catch (error) {
      console.error("Import customers error:", error);
      return res.status(500).json({ message: "Failed to import customer data" });
    }
  });
  
  app.post("/api/leads/import", async (req: RequestWithFiles, res: Response) => {
    try {
      const contentType = req.headers['content-type'] || '';
      let data;
      
      if (contentType.includes('multipart/form-data')) {
        // Handle file upload for CSV
        if (!req.files || !req.files.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        const file = req.files.file as UploadedFile;
        const csvData = file.data.toString('utf8');
        
        // Parse CSV to JSON
        try {
          data = csvParse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true
          });
        } catch (csvError) {
          console.error("CSV parse error:", csvError);
          return res.status(400).json({ message: "Invalid CSV format" });
        }
      } else {
        // Handle JSON data
        const { data: jsonData } = req.body;
        
        if (!jsonData || !Array.isArray(jsonData)) {
          return res.status(400).json({ message: "Invalid import data. Expected array of lead records." });
        }
        
        data = jsonData;
      }
      
      // Process lead records:
      // 1. Ensure they have required fields
      // 2. Set default values for lead-specific fields if needed
      const validRecords = [];
      const errors = [];
      const requiredFields = ['email', 'firstName', 'lastName'];
      
      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        const missingFields = requiredFields.filter(field => !record[field]);
        
        if (missingFields.length > 0) {
          errors.push({
            record,
            error: `Record at index ${i} is missing required fields: ${missingFields.join(', ')}`
          });
          continue;
        }
        
        // Set default lead status and source if not provided
        const leadData = {
          ...record,
          leadStatus: record.leadStatus || 'new',
          leadSource: record.leadSource || 'import'
        };
        
        validRecords.push(leadData);
      }
      
      // Import valid records
      let importedCount = 0;
      
      for (const record of validRecords) {
        try {
          await storage.insertLead(record);
          importedCount++;
        } catch (error) {
          errors.push({
            record,
            error: error instanceof Error ? error.message : 'Unknown error during import'
          });
        }
      }
      
      res.status(200).json({ 
        imported: importedCount,
        errors: errors
      });
      
    } catch (error) {
      console.error("Import leads error:", error);
      return res.status(500).json({ 
        message: "Failed to import lead data",
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // ===== CALENDAR/SCHEDULING ROUTES =====
  
  app.get("/api/calendar/events", async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const events = await storage.getCalendarEvents(startDate, endDate);
      return res.json(events);
    } catch (error) {
      console.error("Get calendar events error:", error);
      return res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });
  
  app.get("/api/calendar/events/owner/:ownerId", async (req: Request, res: Response) => {
    try {
      const ownerId = parseInt(req.params.ownerId);
      if (isNaN(ownerId)) {
        return res.status(400).json({ message: "Invalid owner ID" });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const events = await storage.getCalendarEventsByOwner(ownerId, startDate, endDate);
      return res.json(events);
    } catch (error) {
      console.error("Get calendar events by owner error:", error);
      return res.status(500).json({ message: "Failed to fetch calendar events for owner" });
    }
  });
  
  app.get("/api/calendar/events/entity/:type/:id", async (req: Request, res: Response) => {
    try {
      const entityType = req.params.type;
      const entityId = parseInt(req.params.id);
      
      if (!entityType || isNaN(entityId)) {
        return res.status(400).json({ message: "Invalid entity type or ID" });
      }
      
      const events = await storage.getCalendarEventsByEntity(entityType, entityId);
      return res.json(events);
    } catch (error) {
      console.error("Get calendar events by entity error:", error);
      return res.status(500).json({ message: "Failed to fetch calendar events for entity" });
    }
  });
  
  app.get("/api/calendar/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.getCalendarEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Calendar event not found" });
      }
      
      return res.json(event);
    } catch (error) {
      console.error("Get calendar event error:", error);
      return res.status(500).json({ message: "Failed to fetch calendar event" });
    }
  });
  
  app.post("/api/calendar/events", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent(validatedData);
      return res.status(201).json(event);
    } catch (error) {
      console.error("Create calendar event error:", error);
      return res.status(400).json({ message: "Invalid calendar event data" });
    }
  });
  
  app.patch("/api/calendar/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.updateCalendarEvent(id, req.body);
      return res.json(event);
    } catch (error) {
      console.error("Update calendar event error:", error);
      return res.status(500).json({ message: "Failed to update calendar event" });
    }
  });
  
  app.delete("/api/calendar/events/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const success = await storage.deleteCalendarEvent(id);
      return res.json({ success });
    } catch (error) {
      console.error("Delete calendar event error:", error);
      return res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });
  
  // ===== EMAIL TEMPLATES ROUTES =====
  
  app.get("/api/email/templates", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string;
      const templates = await storage.getEmailTemplates(category);
      return res.json(templates);
    } catch (error) {
      console.error("Get email templates error:", error);
      return res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });
  
  app.get("/api/email/templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getEmailTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      return res.json(template);
    } catch (error) {
      console.error("Get email template error:", error);
      return res.status(500).json({ message: "Failed to fetch email template" });
    }
  });
  
  app.post("/api/email/templates", async (req: Request, res: Response) => {
    try {
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(validatedData);
      return res.status(201).json(template);
    } catch (error) {
      console.error("Create email template error:", error);
      return res.status(400).json({ message: "Invalid email template data" });
    }
  });
  
  app.patch("/api/email/templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.updateEmailTemplate(id, req.body);
      return res.json(template);
    } catch (error) {
      console.error("Update email template error:", error);
      return res.status(500).json({ message: "Failed to update email template" });
    }
  });
  
  app.delete("/api/email/templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const success = await storage.deleteEmailTemplate(id);
      return res.json({ success });
    } catch (error) {
      console.error("Delete email template error:", error);
      return res.status(500).json({ message: "Failed to delete email template" });
    }
  });
  
  // ===== SCHEDULED EMAILS ROUTES =====
  
  app.get("/api/email/scheduled", async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const scheduledEmails = await storage.getScheduledEmails(status);
      return res.json(scheduledEmails);
    } catch (error) {
      console.error("Get scheduled emails error:", error);
      return res.status(500).json({ message: "Failed to fetch scheduled emails" });
    }
  });
  
  app.get("/api/email/scheduled/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scheduled email ID" });
      }
      
      const scheduledEmail = await storage.getScheduledEmail(id);
      if (!scheduledEmail) {
        return res.status(404).json({ message: "Scheduled email not found" });
      }
      
      return res.json(scheduledEmail);
    } catch (error) {
      console.error("Get scheduled email error:", error);
      return res.status(500).json({ message: "Failed to fetch scheduled email" });
    }
  });
  
  app.post("/api/email/schedule", async (req: Request, res: Response) => {
    try {
      const { templateId, campaignId, scheduledFor, targetAudience, subject, htmlContent, textContent, fromAddress } = req.body;
      
      if (!scheduledFor || !targetAudience || !subject || !htmlContent || !fromAddress) {
        return res.status(400).json({ 
          message: "Missing required fields: scheduledFor, targetAudience, subject, htmlContent, fromAddress" 
        });
      }
      
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }
      
      const scheduledEmail = await storage.createScheduledEmail({
        templateId,
        campaignId,
        scheduledFor: scheduledDate,
        targetAudience,
        subject,
        htmlContent,
        textContent,
        fromAddress,
        status: 'pending',
        createdAt: new Date(),
        metadata: {
          createdBy: 'user', // In a real app, this would be the authenticated user ID
          createdAt: new Date().toISOString()
        }
      });
      
      return res.status(201).json(scheduledEmail);
    } catch (error) {
      console.error("Schedule email error:", error);
      return res.status(500).json({ message: "Failed to schedule email" });
    }
  });
  
  app.patch("/api/email/scheduled/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scheduled email ID" });
      }
      
      const updatedEmail = await storage.updateScheduledEmail(id, req.body);
      return res.json(updatedEmail);
    } catch (error) {
      console.error("Update scheduled email error:", error);
      return res.status(500).json({ message: "Failed to update scheduled email" });
    }
  });
  
  app.delete("/api/email/scheduled/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scheduled email ID" });
      }
      
      // Update status to cancelled instead of deleting
      await storage.updateScheduledEmail(id, { status: 'cancelled' });
      return res.json({ success: true });
    } catch (error) {
      console.error("Cancel scheduled email error:", error);
      return res.status(500).json({ message: "Failed to cancel scheduled email" });
    }
  });
  
  app.post("/api/email/scheduled/:id/send-now", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scheduled email ID" });
      }
      
      // Update the scheduled time to now and let the scheduler pick it up
      await storage.updateScheduledEmail(id, { 
        scheduledFor: new Date(),
        status: 'pending'
      });
      
      return res.json({ success: true, message: "Email will be sent shortly" });
    } catch (error) {
      console.error("Send now error:", error);
      return res.status(500).json({ message: "Failed to trigger immediate send" });
    }
  });

  // ===== EMAIL SENDING & LOGS ROUTES =====
  
  app.get("/api/email/logs", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const isAdmin = (req as any).user?.isAdmin;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const entityType = req.query.entityType as string;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
      
      // Get all logs first
      let logs = await storage.getEmailLogs(entityType, entityId);
      
      // Filter logs based on user permissions
      if (!isAdmin) {
        // Non-admin users should only see their own emails
        logs = logs.filter(log => log.userId === userId);
      }
      
      return res.json(logs);
    } catch (error) {
      console.error("Get email logs error:", error);
      return res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });
  
  app.post("/api/email/send", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { from, to, subject, body, options } = req.body;
      
      if (!from || !to || !subject || !body) {
        return res.status(400).json({ 
          message: "Missing required email fields. Please provide from, to, subject, and body."
        });
      }
      
      // Check email content size (Mailgun has a 25MB limit, but we'll be more conservative)
      const contentSize = Buffer.byteLength(body, 'utf8');
      if (contentSize > 5 * 1024 * 1024) { // 5MB limit
        return res.status(400).json({ 
          message: "Email content is too large. Please reduce the content size or remove embedded images."
        });
      }
      
      // Add userId to options for tracking
      const emailOptions = { ...options, userId };
      const emailLog = await storage.sendEmail(from, to, subject, body, emailOptions);
      
      // Track email usage for the user
      await usageService.incrementEmailUsage(userId);
      
      return res.json(emailLog);
    } catch (error) {
      console.error("Send email error:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to send email";
      
      // Handle specific Mailgun errors
      if (errorMessage.includes('Request Entity Too Large') || errorMessage.includes('entity too large')) {
        return res.status(400).json({ 
          message: "Email content is too large. Please reduce the content size or remove embedded images.",
          details: "Try removing images or reducing the amount of formatting in your email."
        });
      }
      
      return res.status(500).json({ 
        message: errorMessage,
        details: error instanceof Error && error.message.includes('Mailgun')
          ? "This may be due to Mailgun sandbox domain restrictions. Please activate your Mailgun account or verify recipient emails in your Mailgun dashboard."
          : undefined
      });
    }
  });
  
  app.post("/api/email/send-template", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { templateId, to, data, options } = req.body;
      
      if (!templateId || !to || !data) {
        return res.status(400).json({ 
          message: "Missing required fields. Please provide templateId, to, and data."
        });
      }
      
      const templateIdNumber = parseInt(templateId);
      if (isNaN(templateIdNumber)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      // Add userId to options for tracking
      const emailOptions = { ...options, userId };
      const emailLog = await storage.sendEmailWithTemplate(templateIdNumber, to, data, emailOptions);
      
      // Track email usage for the user
      await usageService.incrementEmailUsage(userId);
      
      return res.json(emailLog);
    } catch (error) {
      console.error("Send templated email error:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to send templated email";
      
      return res.status(500).json({ 
        message: errorMessage,
        details: error instanceof Error && error.message.includes('Mailgun')
          ? "This may be due to Mailgun sandbox domain restrictions. Please activate your Mailgun account or verify recipient emails in your Mailgun dashboard."
          : undefined
      });
    }
  });
  
  // Mailgun configuration status endpoint
  app.get("/api/email/mailgun-config", async (req: Request, res: Response) => {
    try {
      const { isMailgunConfigured } = await import('./lib/mailgun');
      const configured = isMailgunConfigured();
      
      const domain = process.env.MAILGUN_DOMAIN;
      const isSandbox = domain?.includes('sandbox');
      
      return res.json({
        configured,
        domain: domain || null,
        isSandbox: isSandbox || false
      });
    } catch (error) {
      console.error("Mailgun config check error:", error);
      return res.status(500).json({ 
        configured: false,
        domain: null,
        isSandbox: false,
        error: "Failed to check Mailgun configuration"
      });
    }
  });

  // ===== CAMPAIGN EMAIL ROUTES =====
  
  app.post("/api/email/send-campaign", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { campaignId, subject, emailContent, testEmail, mailgunConfig } = req.body;
      
      console.log('Campaign email request received:', {
        campaignId,
        subject,
        hasEmailContent: !!emailContent,
        hasMailgunConfig: !!mailgunConfig,
        mailgunConfigKeys: mailgunConfig ? Object.keys(mailgunConfig) : [],
        mailgunConfigData: mailgunConfig
      });
      
      if (!campaignId || !subject || !emailContent) {
        return res.status(400).json({ 
          message: "Missing required fields. Please provide campaignId, subject, and emailContent."
        });
      }
      
      // Get campaign details
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Get leads based on campaign targeting
      let targetLeads = [];
      try {
        console.log('Campaign targeting check:', {
          hasTargetAudience: !!campaign.targetAudience,
          targetAudience: campaign.targetAudience
        });
        
        if (campaign.targetAudience && campaign.targetAudience !== "All leads") {
          const targeting = JSON.parse(campaign.targetAudience);
          console.log('Parsed targeting:', targeting);
          
          if (targeting.type === "Leads" && targeting.filters) {
            // Filter leads based on campaign criteria
            const allLeads = await storage.getLeads();
            console.log('Total leads in database:', allLeads.length);
            if (allLeads.length > 0) {
              console.log('Sample lead properties:', Object.keys(allLeads[0]));
              console.log('First lead data:', {
                id: allLeads[0].id,
                email: allLeads[0].email,
                leadSource: allLeads[0].leadSource,
                leadStatus: allLeads[0].leadStatus,
                // source: allLeads[0].source, // Using leadSource instead
                // status: allLeads[0].status  // Using leadStatus instead
              });
            }
            
            targetLeads = allLeads.filter(lead => {
              if (targeting.filters.source && targeting.filters.source !== "all_sources") {
                if (lead.leadSource !== targeting.filters.source) return false;
              }
              if (targeting.filters.status && targeting.filters.status !== "all_statuses") {
                if (lead.leadStatus !== targeting.filters.status) return false;
              }
              return true;
            });
          } else {
            targetLeads = await storage.getLeads();
          }
        } else {
          targetLeads = await storage.getLeads();
        }
      } catch (e: unknown) {
        // If targeting parsing fails, get all leads
        console.log('Targeting parsing failed, getting all leads:', e instanceof Error ? e.message : 'Unknown error');
        targetLeads = await storage.getLeads();
      }
      
      console.log('Final target leads count:', targetLeads.length);
      console.log('Target leads emails:', targetLeads.map(l => l.email));
      
      // Send emails to all target leads
      const emailResults = [];
      for (const lead of targetLeads) {
        try {
          console.log('Lead data for personalization:', {
            name: lead.name,
            email: lead.email,
            company: lead.company,
            firstName: lead.name?.split(' ')[0],
            lastName: lead.name?.split(' ').slice(1).join(' ')
          });
          console.log('Original email content:', emailContent.substring(0, 200) + '...');
          
          // Personalize the email content using the same system as test emails
          let personalizedContent = emailContent;
          
          // Contact tokens
          personalizedContent = personalizedContent.replace(/\{\{contact\.firstName\}\}/g, lead.name?.split(' ')[0] || 'Valued Customer');
          personalizedContent = personalizedContent.replace(/\{\{contact\.lastName\}\}/g, lead.name?.split(' ').slice(1).join(' ') || '');
          personalizedContent = personalizedContent.replace(/\{\{contact\.email\}\}/g, lead.email || '');
          personalizedContent = personalizedContent.replace(/\{\{contact\.company\}\}/g, lead.company || 'Your Company');
          personalizedContent = personalizedContent.replace(/\{\{contact\.phone\}\}/g, lead.phone || '');
          personalizedContent = personalizedContent.replace(/\{\{contact\.jobTitle\}\}/g, lead.jobTitle || '');
          personalizedContent = personalizedContent.replace(/\{\{contact\.industry\}\}/g, lead.industry || '');
          personalizedContent = personalizedContent.replace(/\{\{contact\.createdAt\}\}/g, lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '');
          
          // Lead tokens
          personalizedContent = personalizedContent.replace(/\{\{lead\.status\}\}/g, lead.leadStatus || '');
          personalizedContent = personalizedContent.replace(/\{\{lead\.score\}\}/g, lead.score?.toString() || '');
          personalizedContent = personalizedContent.replace(/\{\{lead\.source\}\}/g, lead.leadSource || '');
          personalizedContent = personalizedContent.replace(/\{\{lead\.value\}\}/g, lead.estimatedValue?.toString() || '');
          personalizedContent = personalizedContent.replace(/\{\{lead\.priority\}\}/g, lead.priority || '');
          personalizedContent = personalizedContent.replace(/\{\{lead\.assignedTo\}\}/g, lead.leadOwner || '');
          
          // Legacy simple tokens for backward compatibility
          personalizedContent = personalizedContent.replace(/\{\{firstName\}\}/g, lead.name?.split(' ')[0] || 'Valued Customer');
          personalizedContent = personalizedContent.replace(/\{\{lastName\}\}/g, lead.name?.split(' ').slice(1).join(' ') || '');
          personalizedContent = personalizedContent.replace(/\{\{company\}\}/g, lead.company || 'Your Company');
          personalizedContent = personalizedContent.replace(/\{\{email\}\}/g, lead.email || '');
          
          console.log('Personalized content sample:', personalizedContent.substring(0, 200) + '...');
          
          console.log('Sending campaign email to', lead.email, 'with Mailgun config:', !!mailgunConfig);
          
          const emailLog = await storage.sendEmail(
            'noreply@mail.aicrm.co.uk',
            lead.email || '',
            subject,
            personalizedContent,
            {
              userId: userId, // Track which user sent this email
              campaignId: campaignId,
              relatedEntityType: 'lead',
              relatedEntityId: lead.id,
              customMailgun: mailgunConfig
            }
          );

          // Track email usage for the user
          await usageService.incrementEmailUsage(userId);
          
          // Create journey touchpoint for campaign email sent
          await journeyIntegration.createCampaignEmailSentTouchpoint(
            campaignId,
            lead.email || '',
            userId
          );
          
          emailResults.push({
            leadId: lead.id,
            email: lead.email,
            status: 'sent',
            emailLogId: emailLog.id
          });
        } catch (error: unknown) {
          console.error(`Failed to send email to ${lead.email}:`, error);
          emailResults.push({
            leadId: lead.id,
            email: lead.email,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return res.json({
        success: true,
        message: `Campaign email scheduled for ${targetLeads.length} recipients`,
        campaignId,
        targetCount: targetLeads.length,
        results: emailResults
      });
    } catch (error) {
      console.error("Send campaign email error:", error);
      return res.status(500).json({ message: "Failed to schedule campaign email" });
    }
  });
  
  // ===== MAILGUN CONFIGURATION ROUTE =====
  
  app.post("/api/config/mailgun", async (req: Request, res: Response) => {
    try {
      const { apiKey, domain } = req.body;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!apiKey) {
        return res.status(400).json({ message: "Mailgun API key is required" });
      }
      
      if (!domain) {
        return res.status(400).json({ message: "Mailgun domain is required" });
      }
      
      // Store personal API key in database
      await storage.updateUserPersonalKeys(userId, { mailgunKey: apiKey, mailgunDomain: domain });
      
      // Set environment variables for immediate use (for backward compatibility)
      process.env.MAILGUN_API_KEY = apiKey;
      process.env.MAILGUN_DOMAIN = domain;
      
      // Reinitialize the Mailgun client with the new API key
      reinitializeMailgunClient();
      
      console.log("Mailgun client reinitialized with new API key");
      return res.json({ success: true, message: "Mailgun API key and domain have been configured" });
    } catch (error) {
      console.error("Mailgun configuration error:", error);
      return res.status(500).json({ message: "Failed to configure Mailgun API key and domain" });
    }
  });
  
  app.get("/api/config/mailgun/status", async (req: Request, res: Response) => {
    try {
      const isConfigured = isMailgunConfigured();
      const currentDomain = process.env.MAILGUN_DOMAIN;
      
      return res.json({ 
        configured: isConfigured,
        domain: currentDomain,
        isProduction: !currentDomain?.includes('sandbox')
      });
    } catch (error) {
      console.error("Mailgun status check error:", error);
      return res.status(500).json({ message: "Failed to check Mailgun configuration status" });
    }
  });

  // Enhanced Mailgun configuration with domain validation
  app.post("/api/config/mailgun", async (req: Request, res: Response) => {
    try {
      const { apiKey, domain } = req.body;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!apiKey) {
        return res.status(400).json({ message: "Mailgun API key is required" });
      }
      
      if (!domain) {
        return res.status(400).json({ message: "Mailgun domain is required" });
      }

      // Validate the API key and domain
      const { validateMailgunKey } = await import('./lib/api-key-validator');
      const validation = await validateMailgunKey(apiKey, domain);
      
      if (!validation.isValid) {
        return res.status(400).json({ 
          message: validation.error || "Invalid Mailgun configuration"
        });
      }

      // Store personal Mailgun credentials in database
      await storage.updateUserPersonalKeys(userId, { 
        mailgunKey: apiKey, 
        mailgunDomain: domain 
      });

      return res.json({ 
        success: true, 
        message: "Mailgun API key and domain have been configured",
        domain: domain
      });
    } catch (error) {
      console.error("Mailgun configuration error:", error);
      return res.status(500).json({ message: "Failed to configure Mailgun API key and domain" });
    }
  });

  // ===== EMAIL SEQUENCES ROUTES =====
  
  app.get("/api/email/sequences", async (req: Request, res: Response) => {
    try {
      // In a real implementation, this would fetch from the database
      const sequences = [
        {
          id: 1,
          name: "Welcome Sequence",
          description: "Onboarding sequence for new customers",
          triggerType: "event",
          targetType: "customers",
          active: true,
          stepCount: 3,
          createdAt: "2025-04-01T10:00:00.000Z"
        },
        {
          id: 2,
          name: "Lead Nurturing",
          description: "Nurture sequence for potential customers",
          triggerType: "manual",
          targetType: "leads",
          active: false,
          stepCount: 5,
          createdAt: "2025-04-05T14:30:00.000Z"
        },
        {
          id: 3,
          name: "Customer Retention",
          description: "Re-engagement sequence for inactive users",
          triggerType: "scheduled",
          targetType: "segment",
          targetId: 1,
          active: true,
          stepCount: 4,
          createdAt: "2025-04-10T09:15:00.000Z"
        }
      ];
      
      return res.json(sequences);
    } catch (error) {
      console.error("Get email sequences error:", error);
      return res.status(500).json({ message: "Failed to fetch email sequences" });
    }
  });

  app.get("/api/email/sequences/steps/:sequenceId", async (req: Request, res: Response) => {
    try {
      const sequenceId = parseInt(req.params.sequenceId);
      
      if (isNaN(sequenceId)) {
        return res.status(400).json({ message: "Invalid sequence ID" });
      }

      // In a real implementation, this would fetch from the database
      const steps = [
        {
          id: 1,
          sequenceId,
          name: "Introduction Email",
          subject: "Welcome to our platform",
          bodyHtml: "<p>Welcome to our platform! We're excited to have you on board.</p>",
          bodyText: "Welcome to our platform! We're excited to have you on board.",
          delayDays: 0,
          delayHours: 0,
          condition: "",
          createdAt: "2025-04-15T10:00:00.000Z"
        },
        {
          id: 2,
          sequenceId,
          name: "Follow-up",
          subject: "How are you finding our platform?",
          bodyHtml: "<p>It's been a few days since you joined. How are you finding our platform?</p>",
          bodyText: "It's been a few days since you joined. How are you finding our platform?",
          delayDays: 3,
          delayHours: 0,
          condition: "opened_previous_email",
          createdAt: "2025-04-15T10:05:00.000Z"
        },
        {
          id: 3,
          sequenceId,
          name: "Feature Highlight",
          subject: "Discover these powerful features",
          bodyHtml: "<p>Have you discovered these powerful features yet?</p>",
          bodyText: "Have you discovered these powerful features yet?",
          delayDays: 7,
          delayHours: 0,
          condition: "",
          createdAt: "2025-04-15T10:10:00.000Z"
        }
      ];
      
      return res.json(steps);
    } catch (error) {
      console.error("Get sequence steps error:", error);
      return res.status(500).json({ message: "Failed to fetch sequence steps" });
    }
  });
  
  // For getting all steps (used in the sequence step creation form)
  app.get("/api/email/sequences/steps", async (req: Request, res: Response) => {
    try {
      // Return an empty array as this is just for initializing the form
      return res.json([]);
    } catch (error) {
      console.error("Get all sequence steps error:", error);
      return res.status(500).json({ message: "Failed to fetch sequence steps" });
    }
  });
  
  // Route for handling sequence status toggling
  app.patch("/api/email/sequences/:id/status", async (req: Request, res: Response) => {
    try {
      const sequenceId = parseInt(req.params.id);
      
      if (isNaN(sequenceId)) {
        return res.status(400).json({ message: "Invalid sequence ID" });
      }
      
      // In a real implementation, this would update the database
      // Here we just return success
      return res.json({ success: true });
    } catch (error) {
      console.error("Update sequence status error:", error);
      return res.status(500).json({ message: "Failed to update sequence status" });
    }
  });
  
  // Route for creating/updating sequence steps
  app.post("/api/email/sequences/steps", async (req: Request, res: Response) => {
    try {
      const { sequenceId, name, subject, bodyHtml, bodyText, delayDays, delayHours, condition } = req.body;
      
      if (!sequenceId || !name || !subject || !bodyHtml) {
        return res.status(400).json({ 
          message: "Missing required fields. Please provide sequenceId, name, subject, and bodyHtml."
        });
      }
      
      // In a real implementation, this would create a new step in the database
      // For now, return a mock response
      const newStep = {
        id: Date.now(), // Using timestamp as a simple unique ID
        sequenceId,
        name,
        subject,
        bodyHtml,
        bodyText: bodyText || "",
        delayDays: delayDays || 0,
        delayHours: delayHours || 0,
        condition: condition || "",
        createdAt: new Date().toISOString()
      };
      
      return res.status(201).json(newStep);
    } catch (error) {
      console.error("Create sequence step error:", error);
      return res.status(500).json({ message: "Failed to create sequence step" });
    }
  });
  
  // Route for updating sequence steps
  app.put("/api/email/sequences/steps/:id", async (req: Request, res: Response) => {
    try {
      const stepId = parseInt(req.params.id);
      
      if (isNaN(stepId)) {
        return res.status(400).json({ message: "Invalid step ID" });
      }
      
      const { name, subject, bodyHtml, bodyText, delayDays, delayHours, condition } = req.body;
      
      if (!name || !subject || !bodyHtml) {
        return res.status(400).json({ 
          message: "Missing required fields. Please provide name, subject, and bodyHtml."
        });
      }
      
      // In a real implementation, this would update the step in the database
      // For now, return success
      return res.json({ success: true });
    } catch (error) {
      console.error("Update sequence step error:", error);
      return res.status(500).json({ message: "Failed to update sequence step" });
    }
  });

  // ===== LEAD MANAGEMENT ROUTES =====
  
  // Lead scoring configuration
  app.post("/api/lead-scoring/config", leadManagement.updateLeadScoringConfig);
  app.post("/api/lead-scoring/recalculate", leadManagement.recalculateLeadScores);
  
  // Customer segmentation
  app.get("/api/segments", leadManagement.getCustomerSegments);
  
  // Unified Contact Segmentation Routes
  app.get("/api/contact-segments", leadManagement.getUnifiedContactSegments);
  app.post("/api/contact-segments", leadManagement.createUnifiedContactSegment);
  app.get("/api/contact-segments/:id", leadManagement.getUnifiedContactSegment);
  app.put("/api/contact-segments/:id", leadManagement.updateUnifiedContactSegment);
  app.delete("/api/contact-segments/:id", leadManagement.deleteUnifiedContactSegment);
  app.get("/api/contact-segments/:id/contacts", leadManagement.getContactsForSegment);
  app.get("/api/unified-contacts", leadManagement.getUnifiedContacts);
  app.post("/api/segments", leadManagement.createCustomerSegment);
  app.get("/api/segments/:id/export", leadManagement.exportSegmentData);
  
  // Workflow automation
  app.get("/api/workflows", leadManagement.getWorkflows);
  app.post("/api/workflows", leadManagement.createWorkflow);
  app.patch("/api/workflows/:id/toggle", leadManagement.toggleWorkflow);
  app.post("/api/workflows/:id/test", leadManagement.testWorkflow);
  app.get("/api/workflows/logs", leadManagement.getWorkflowLogs);
  
  // Enhanced lead management
  app.post("/api/leads/:id/score", leadManagement.updateLeadScore);
  app.post("/api/leads/:id/note", leadManagement.addLeadNote);
  app.post("/api/leads/:id/owner", leadManagement.assignLeadOwner);

  // ===== EMAIL ANALYTICS ROUTES =====
  
  app.get("/api/email/analytics", async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange || 'last30';

      // In a real implementation, this would calculate analytics from real data
      const analyticsData = {
        overview: {
          totalSent: 1247,
          openRate: 0.42,
          clickRate: 0.18,
          bounceRate: 0.03,
          unsubscribeRate: 0.01
        },
        campaigns: [
          {
            id: 1,
            name: "Product Update - April",
            date: "2025-04-10",
            openRate: 0.48,
            clickRate: 0.22,
            conversionRate: 0.05,
            type: "Newsletter"
          },
          {
            id: 2,
            name: "Spring Promotion",
            date: "2025-04-15",
            openRate: 0.52,
            clickRate: 0.31,
            conversionRate: 0.08,
            type: "Promotion"
          },
          {
            id: 3,
            name: "Customer Survey",
            date: "2025-04-20",
            openRate: 0.38,
            clickRate: 0.12,
            conversionRate: 0.02,
            type: "Survey"
          },
          {
            id: 4,
            name: "Feature Announcement",
            date: "2025-04-25",
            openRate: 0.45,
            clickRate: 0.19,
            conversionRate: 0.04,
            type: "Announcement"
          }
        ],
        trends: [
          { date: "Apr 01", openRate: 0.41, clickRate: 0.16, bounceRate: 0.03, unsubscribeRate: 0.01 },
          { date: "Apr 05", openRate: 0.43, clickRate: 0.18, bounceRate: 0.025, unsubscribeRate: 0.01 },
          { date: "Apr 10", openRate: 0.44, clickRate: 0.19, bounceRate: 0.02, unsubscribeRate: 0.009 },
          { date: "Apr 15", openRate: 0.47, clickRate: 0.21, bounceRate: 0.018, unsubscribeRate: 0.008 },
          { date: "Apr 20", openRate: 0.45, clickRate: 0.20, bounceRate: 0.022, unsubscribeRate: 0.01 },
          { date: "Apr 25", openRate: 0.42, clickRate: 0.17, bounceRate: 0.03, unsubscribeRate: 0.012 }
        ],
        devices: [
          { name: "Mobile", value: 0.53 },
          { name: "Desktop", value: 0.38 },
          { name: "Tablet", value: 0.07 },
          { name: "Other", value: 0.02 }
        ],
        timeDistribution: [
          { time: "6AM-9AM", opens: 320 },
          { time: "9AM-12PM", opens: 580 },
          { time: "12PM-3PM", opens: 430 },
          { time: "3PM-6PM", opens: 390 },
          { time: "6PM-9PM", opens: 520 },
          { time: "9PM-12AM", opens: 280 },
          { time: "12AM-6AM", opens: 140 }
        ]
      };
      
      return res.json(analyticsData);
    } catch (error) {
      console.error("Get email analytics error:", error);
      return res.status(500).json({ message: "Failed to fetch email analytics" });
    }
  });

  app.get("/api/customers/segments", async (req: Request, res: Response) => {
    try {
      // In a real implementation, this would fetch from the database
      const segments = [
        {
          id: 1,
          name: "Active Users",
          description: "Users who have logged in within the last 30 days",
          count: 524,
          createdAt: "2025-03-15T10:00:00.000Z"
        },
        {
          id: 2,
          name: "High-Value Customers",
          description: "Customers who have spent over $1000",
          count: 128,
          createdAt: "2025-03-20T14:30:00.000Z"
        },
        {
          id: 3,
          name: "Recently Inactive",
          description: "Users who haven't logged in for 30-60 days",
          count: 215,
          createdAt: "2025-03-25T09:15:00.000Z"
        }
      ];
      
      return res.json(segments);
    } catch (error) {
      console.error("Get customer segments error:", error);
      return res.status(500).json({ message: "Failed to fetch customer segments" });
    }
  });

  // ===== USAGE TRACKING AND API KEY MANAGEMENT ROUTES =====
  
  // Get user's current usage statistics
  app.get("/api/usage", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const usage = await usageService.getUserUsage(userId);
      return res.json(usage);
    } catch (error) {
      console.error("Get usage error:", error);
      return res.status(500).json({ message: "Failed to fetch usage data" });
    }
  });

  // Store user's personal API keys
  app.post("/api/settings/api-keys", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { openaiKey, mailgunKey, mailgunDomain } = req.body;
      
      if (!openaiKey && !mailgunKey) {
        return res.status(400).json({ message: "At least one API key is required" });
      }

      // Validate Mailgun domain if provided
      if (mailgunKey && mailgunDomain) {
        const { isValidEmailDomain, PRIMARY_EMAIL_DOMAIN } = await import('./lib/email-domain-service');
        
        if (!isValidEmailDomain(mailgunDomain)) {
          return res.status(400).json({ 
            message: `Invalid Mailgun domain. Only ${PRIMARY_EMAIL_DOMAIN} is allowed. Please ensure your Mailgun API key is associated with ${PRIMARY_EMAIL_DOMAIN}.` 
          });
        }
      }

      await usageService.storePersonalAPIKeys(userId, {
        openaiKey,
        mailgunKey,
        mailgunDomain
      });

      return res.json({ message: "API keys saved successfully" });
    } catch (error) {
      console.error("Save API keys error:", error);
      return res.status(500).json({ message: "Failed to save API keys" });
    }
  });

  // Get user's personal API key status (without revealing the keys)
  app.get("/api/settings/api-keys/status", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const keys = await usageService.getPersonalAPIKeys(userId);
      
      return res.json({
        hasOpenAIKey: !!keys.openaiKey,
        hasMailgunKey: !!keys.mailgunKey,
        hasMailgunDomain: !!keys.mailgunDomain
      });
    } catch (error) {
      console.error("Get API key status error:", error);
      return res.status(500).json({ message: "Failed to get API key status" });
    }
  });

  // Validate API keys before saving
  app.post("/api/settings/api-keys/validate", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { openaiKey, mailgunKey, mailgunDomain } = req.body;
      
      if (!openaiKey && !mailgunKey) {
        return res.status(400).json({ message: "At least one API key is required for validation" });
      }

      // Validate Mailgun domain first if provided
      if (mailgunKey && mailgunDomain) {
        const { isValidEmailDomain, PRIMARY_EMAIL_DOMAIN } = await import('./lib/email-domain-service');
        
        if (!isValidEmailDomain(mailgunDomain)) {
          return res.json({
            openai: { isValid: false },
            mailgun: { 
              isValid: false, 
              error: `Invalid domain. Only ${PRIMARY_EMAIL_DOMAIN} is allowed. Please ensure your Mailgun API key is associated with ${PRIMARY_EMAIL_DOMAIN}.`
            }
          });
        }
      }

      const { performAPIHealthCheck } = await import('./lib/api-key-validator');
      const validation = await performAPIHealthCheck(userId, {
        openaiKey,
        mailgunKey,
        mailgunDomain
      });

      return res.json(validation);
    } catch (error) {
      console.error("API key validation error:", error);
      return res.status(500).json({ message: "Failed to validate API keys" });
    }
  });

  // Health check for user's stored API keys
  app.get("/api/settings/api-keys/health", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const keys = await usageService.getPersonalAPIKeys(userId);
      
      if (!keys.openaiKey && !keys.mailgunKey) {
        return res.json({
          openai: { isValid: false, error: "No API key configured" },
          mailgun: { isValid: false, error: "No API key configured" }
        });
      }

      const { performAPIHealthCheck } = await import('./lib/api-key-validator');
      const health = await performAPIHealthCheck(userId, keys);

      return res.json(health);
    } catch (error) {
      console.error("API key health check error:", error);
      return res.status(500).json({ message: "Failed to perform health check" });
    }
  });

  // Update voice command to pass userId for usage tracking
  app.post("/api/voice-command", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      const userId = (req as any).user?.id;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const result = await interpretVoiceCommand(text, userId);
      
      if (result.limitReached) {
        return res.status(429).json({ 
          message: result.action,
          limitReached: true 
        });
      }

      return res.json(result);
    } catch (error) {
      console.error("Voice command error:", error);
      return res.status(500).json({ message: "Failed to process voice command" });
    }
  });

  // ===== CUSTOMER JOURNEY MAPPING ROUTES =====

  // Get all customer touchpoints
  app.get("/api/customer-touchpoints", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const touchpoints = await storage.getCustomerTouchpoints();
      return res.json(touchpoints);
    } catch (error) {
      console.error("Get customer touchpoints error:", error);
      return res.status(500).json({ message: "Failed to fetch customer touchpoints" });
    }
  });

  // Create a new customer touchpoint
  app.post("/api/customer-touchpoints", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const touchpointData = insertCustomerTouchpointSchema.parse(req.body);
      const touchpoint = await storage.createCustomerTouchpoint(touchpointData);
      return res.status(201).json(touchpoint);
    } catch (error) {
      console.error("Create customer touchpoint error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid touchpoint data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create customer touchpoint" });
    }
  });

  // Update customer touchpoint
  app.patch("/api/customer-touchpoints/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid touchpoint ID" });
      }

      const updateData = req.body;
      const touchpoint = await storage.updateCustomerTouchpoint(id, updateData);
      return res.json(touchpoint);
    } catch (error) {
      console.error("Update customer touchpoint error:", error);
      return res.status(500).json({ message: "Failed to update customer touchpoint" });
    }
  });

  // Delete customer touchpoint
  app.delete("/api/customer-touchpoints/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid touchpoint ID" });
      }

      await storage.deleteCustomerTouchpoint(id);
      return res.json({ message: "Customer touchpoint deleted successfully" });
    } catch (error) {
      console.error("Delete customer touchpoint error:", error);
      return res.status(500).json({ message: "Failed to delete customer touchpoint" });
    }
  });

  // Get all journey stages
  app.get("/api/journey-stages", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const stages = await storage.getJourneyStages();
      return res.json(stages);
    } catch (error) {
      console.error("Get journey stages error:", error);
      return res.status(500).json({ message: "Failed to fetch journey stages" });
    }
  });

  // Create a new journey stage
  app.post("/api/journey-stages", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const stageData = insertJourneyStageSchema.parse(req.body);
      const stage = await storage.createJourneyStage(stageData);
      return res.status(201).json(stage);
    } catch (error) {
      console.error("Create journey stage error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid stage data", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create journey stage" });
    }
  });

  // Update journey stage
  app.patch("/api/journey-stages/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid stage ID" });
      }

      const updateData = req.body;
      const stage = await storage.updateJourneyStage(id, updateData);
      return res.json(stage);
    } catch (error) {
      console.error("Update journey stage error:", error);
      return res.status(500).json({ message: "Failed to update journey stage" });
    }
  });

  // Delete journey stage
  app.delete("/api/journey-stages/:id", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid stage ID" });
      }

      await storage.deleteJourneyStage(id);
      return res.json({ message: "Journey stage deleted successfully" });
    } catch (error) {
      console.error("Delete journey stage error:", error);
      return res.status(500).json({ message: "Failed to delete journey stage" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
