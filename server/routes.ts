import express, { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { interpretVoiceCommand, generateCampaignSuggestions } from "./lib/openai";
import { z } from "zod";
import { insertCampaignSchema, insertCustomerSchema, insertLeadSchema, insertTaskSchema } from "@shared/schema";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
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
  app.get("/api/leads/top", async (req: Request, res: Response) => {
    try {
      const leads = await storage.getTopLeads();
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

  const httpServer = createServer(app);
  return httpServer;
}
