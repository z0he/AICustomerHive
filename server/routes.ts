import express, { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { interpretVoiceCommand, generateCampaignSuggestions, analyzeCustomerData, hasValidApiKey, getCrmAssistantResponse } from "./lib/openai";
import { sendEmail, sendTemplateEmail, isMailgunConfigured, reinitializeMailgunClient } from "./lib/mailgun";
import { z } from "zod";
import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';
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
  insertChatMessageSchema
} from "@shared/schema";
import { setupAuth } from "./auth";
import marketingRoutes from "./routes/marketing";
import notificationRoutes from "./routes/notifications";
import feedbackRoutes from "./routes/feedback";
import directFeedbackRoutes from "./routes/direct-feedback";

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
  
  // Legacy compatibility redirect for user current route
  app.get("/api/user/current", (req, res) => {
    return res.redirect("/api/auth/user");
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
  
  // API Configuration endpoint - would be secured in production
  app.post("/api/config/openai", async (req: Request, res: Response) => {
    try {
      // In a real implementation, this would securely store the API key
      // using environment variables or a secure vault service
      // And would be properly authenticated
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      // For this example, we'll just return a success message
      // In production, would set process.env.OPENAI_API_KEY = apiKey
      // and restart the OpenAI client
      
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
      const validatedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validatedData);
      return res.status(201).json(lead);
    } catch (error) {
      console.error("Create lead error:", error);
      return res.status(400).json({ message: "Invalid lead data" });
    }
  });
  
  app.patch("/api/leads/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }
      
      const lead = await storage.updateLead(id, req.body);
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
  
  // Conversion funnel data endpoint
  app.get("/api/customers/funnel", async (req: Request, res: Response) => {
    try {
      const customers = await storage.getCustomers();
      const leads = await storage.getLeads();
      
      // Create data for a typical sales funnel based on customer/lead status
      const funnelData = [
        {
          name: 'Leads',
          value: leads.length
        },
        {
          name: 'Qualified',
          value: Math.floor(leads.length * 0.75) // 75% of leads get qualified
        },
        {
          name: 'Opportunities',
          value: Math.floor(leads.length * 0.5) // 50% of leads become opportunities
        },
        {
          name: 'Proposals',
          value: Math.floor(leads.length * 0.3) // 30% of leads receive proposals
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
      let conversationHistory = [];
      
      if (conversationId) {
        // Get existing conversation
        conversation = await storage.getChatConversationById(conversationId);
        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }
        
        // Get conversation history
        const messages = await storage.getChatMessagesByConversationId(conversationId);
        conversationHistory = messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
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
  
  app.post("/api/customers/import", async (req: Request, res: Response) => {
    try {
      const contentType = req.headers['content-type'] || '';
      let data;
      
      if (contentType.includes('multipart/form-data')) {
        // Handle file upload for CSV
        if (!req.files || !req.files.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        const file = req.files.file as any;
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
  
  app.post("/api/leads/import", async (req: Request, res: Response) => {
    try {
      const contentType = req.headers['content-type'] || '';
      let data;
      
      if (contentType.includes('multipart/form-data')) {
        // Handle file upload for CSV
        if (!req.files || !req.files.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        const file = req.files.file as any;
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
  
  // ===== EMAIL SENDING & LOGS ROUTES =====
  
  app.get("/api/email/logs", async (req: Request, res: Response) => {
    try {
      const entityType = req.query.entityType as string;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
      
      const logs = await storage.getEmailLogs(entityType, entityId);
      return res.json(logs);
    } catch (error) {
      console.error("Get email logs error:", error);
      return res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });
  
  app.post("/api/email/send", async (req: Request, res: Response) => {
    console.log("🚀 EMAIL ROUTE: Starting email send process");
    
    try {
      const { from, to, subject, body, options } = req.body;
      console.log("📧 EMAIL DATA:", { to, subject: subject?.substring(0, 30) + "..." });
      
      // Validate required fields
      if (!from || !to || !subject || !body) {
        console.log("❌ VALIDATION: Missing required fields");
        return res.status(400).json({ 
          message: "Missing required email fields. Please provide from, to, subject, and body."
        });
      }
      
      console.log("✅ VALIDATION: All fields present");
      
      // =================== PERSONALIZATION ENGINE ===================
      console.log("🔧 PERSONALIZATION: Starting engine...");
      
      let finalSubject = subject;
      let finalBody = body;
      
      // Check if we need personalization
      const needsPersonalization = subject.includes('{{') || body.includes('{{');
      console.log("🔍 PERSONALIZATION: Needs personalization?", needsPersonalization);
      
      if (needsPersonalization) {
        console.log("🎯 PERSONALIZATION: Looking up lead data for:", to);
        
        try {
          // Direct database connection
          const { db } = require('./db');
          const { leads } = require('../shared/schema');
          const { eq } = require('drizzle-orm');
          
          console.log("📊 DATABASE: Querying leads table...");
          const leadResults = await db.select().from(leads).where(eq(leads.email, to)).limit(1);
          
          if (leadResults.length > 0) {
            const lead = leadResults[0];
            console.log("🎉 PERSONALIZATION: Found lead!", {
              name: lead.name,
              leadOwner: lead.leadOwner,
              jobTitle: lead.jobTitle
            });
            
            // Extract names
            const firstName = lead.name?.split(' ')[0] || 'Friend';
            const lastName = lead.name?.split(' ').slice(1).join(' ') || '';
            
            // Prepare replacement data
            const replacements = {
              '{{firstName}}': firstName,
              '{{lastName}}': lastName,
              '{{company}}': lead.company || 'Your Company',
              '{{industry}}': lead.industry || 'your industry',
              '{{jobTitle}}': lead.jobTitle || 'your role',
              '{{leadOwner}}': lead.leadOwner || 'The Team'
            };
            
            console.log("🔄 PERSONALIZATION: Applying replacements...");
            
            // Apply replacements to subject
            Object.entries(replacements).forEach(([placeholder, value]) => {
              finalSubject = finalSubject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
              finalBody = finalBody.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
            });
            
            console.log("✨ PERSONALIZATION: SUCCESS!");
            console.log("📝 NEW SUBJECT:", finalSubject);
            console.log("📄 NEW BODY PREVIEW:", finalBody.substring(0, 80) + "...");
            
          } else {
            console.log("⚠️ PERSONALIZATION: No lead found for email:", to);
          }
          
        } catch (dbError) {
          console.error("💥 PERSONALIZATION: Database error:", dbError);
        }
      }
      
      // =================== SEND EMAIL ===================
      console.log("📤 EMAIL: Sending with final content...");
      
      // Size check
      const contentSize = Buffer.byteLength(finalBody, 'utf8');
      if (contentSize > 5 * 1024 * 1024) {
        return res.status(400).json({ 
          message: "Email content is too large. Please reduce the content size or remove embedded images."
        });
      }
      
      const emailLog = await storage.sendEmail(from, to, finalSubject, finalBody, options || {});
      
      console.log("🎯 EMAIL: Send complete!");
      return res.json(emailLog);
      
    } catch (error) {
      console.error("💥 EMAIL ERROR:", error);
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
      
      const emailLog = await storage.sendEmailWithTemplate(templateIdNumber, to, data, options || {});
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
  
  // ===== CAMPAIGN EMAIL ROUTES =====
  
  app.post("/api/email/send-campaign", async (req: Request, res: Response) => {
    try {
      const { campaignId, subject, emailContent, testEmail } = req.body;
      
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
        if (campaign.targetAudience && campaign.targetAudience !== "All leads") {
          const targeting = JSON.parse(campaign.targetAudience);
          if (targeting.type === "Leads" && targeting.filters) {
            // Filter leads based on campaign criteria
            const allLeads = await storage.getLeads();
            targetLeads = allLeads.filter(lead => {
              if (targeting.filters.source && targeting.filters.source !== "all_sources") {
                if (lead.source !== targeting.filters.source) return false;
              }
              if (targeting.filters.status && targeting.filters.status !== "all_statuses") {
                if (lead.status !== targeting.filters.status) return false;
              }
              return true;
            });
          } else {
            targetLeads = await storage.getLeads();
          }
        } else {
          targetLeads = await storage.getLeads();
        }
      } catch (e) {
        // If targeting parsing fails, get all leads
        targetLeads = await storage.getLeads();
      }
      
      // Send emails to all target leads
      const emailResults = [];
      for (const lead of targetLeads) {
        try {
          // Personalize the email content
          let personalizedContent = emailContent;
          personalizedContent = personalizedContent.replace(/\{\{firstName\}\}/g, lead.name?.split(' ')[0] || 'Valued Customer');
          personalizedContent = personalizedContent.replace(/\{\{lastName\}\}/g, lead.name?.split(' ').slice(1).join(' ') || '');
          personalizedContent = personalizedContent.replace(/\{\{company\}\}/g, lead.company || 'Your Company');
          personalizedContent = personalizedContent.replace(/\{\{email\}\}/g, lead.email || '');
          
          const emailLog = await storage.sendEmail(
            'noreply@mail.aicrm.co.uk',
            lead.email,
            subject,
            personalizedContent,
            {
              campaignId: campaignId,
              relatedEntityType: 'lead',
              relatedEntityId: lead.id
            }
          );
          
          emailResults.push({
            leadId: lead.id,
            email: lead.email,
            status: 'sent',
            emailLogId: emailLog.id
          });
        } catch (error) {
          console.error(`Failed to send email to ${lead.email}:`, error);
          emailResults.push({
            leadId: lead.id,
            email: lead.email,
            status: 'failed',
            error: error.message
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
      // In a real implementation, this would securely store the API key
      // using environment variables or a secure vault service
      // And would be properly authenticated
      const { apiKey, domain } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "Mailgun API key is required" });
      }
      
      if (!domain) {
        return res.status(400).json({ message: "Mailgun domain is required" });
      }
      
      // In a real implementation, we would store these values
      // Here we'll just check environment variables are set
      process.env.MAILGUN_API_KEY = apiKey;
      process.env.MAILGUN_DOMAIN = domain;
      
      // Reinitialize the Mailgun client with the new API key
      reinitializeMailgunClient();
      
      // Verify that the configuration is successful
      const isConfigured = isMailgunConfigured();
      
      if (!isConfigured) {
        return res.status(500).json({ 
          success: false, 
          message: "Failed to initialize Mailgun client. Please check your API key and domain."
        });
      }
      
      return res.json({ success: true, message: "Mailgun API key and domain have been configured" });
    } catch (error) {
      console.error("Mailgun configuration error:", error);
      return res.status(500).json({ message: "Failed to configure Mailgun API key and domain" });
    }
  });
  
  app.get("/api/config/mailgun/status", async (req: Request, res: Response) => {
    try {
      const isConfigured = isMailgunConfigured();
      return res.json({ configured: isConfigured });
    } catch (error) {
      console.error("Mailgun status check error:", error);
      return res.status(500).json({ message: "Failed to check Mailgun configuration status" });
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


  const httpServer = createServer(app);
  return httpServer;
}
