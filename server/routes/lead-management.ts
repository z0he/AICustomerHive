import { Request, Response } from "express";
import { storage } from "../storage.js";

// ===== ADVANCED LEAD SCORING ROUTES =====

export const updateLeadScoringConfig = async (req: Request, res: Response) => {
  try {
    const { weights, rules } = req.body;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // In a real implementation, store the scoring configuration in database
    // For now, return success response
    console.log("Updating lead scoring config:", { weights, rules });
    
    return res.json({ 
      success: true, 
      message: "Lead scoring configuration updated successfully" 
    });
  } catch (error) {
    console.error("Update lead scoring config error:", error);
    return res.status(500).json({ message: "Failed to update scoring configuration" });
  }
};

export const recalculateLeadScores = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get all leads and recalculate their scores
    const leads = await storage.getLeads();
    
    // Mock recalculation - in real implementation, apply the actual algorithm
    const updatedLeads = leads.map(lead => ({
      ...lead,
      score: Math.min(100, Math.max(0, (lead.score || 0) + Math.floor(Math.random() * 20 - 10)))
    }));

    // Update leads with new scores (mock implementation)
    console.log("Recalculating scores for", updatedLeads.length, "leads");
    
    return res.json({ 
      success: true, 
      message: `Recalculated scores for ${updatedLeads.length} leads`,
      updatedCount: updatedLeads.length
    });
  } catch (error) {
    console.error("Recalculate lead scores error:", error);
    return res.status(500).json({ message: "Failed to recalculate lead scores" });
  }
};

// ===== CUSTOMER SEGMENTATION ROUTES =====

export const getCustomerSegments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Mock customer segments - in real implementation, fetch from database
    const segments = [
      {
        id: 1,
        name: "High-Value Prospects (Demo)",
        description: "Demo segment: Leads with scores above 80 points",
        criteria: {
          name: "High-Value Prospects",
          description: "Leads with scores above 80 points",
          conditions: [
            { field: "score", operator: "gte", value: 80 }
          ]
        },
        leadCount: 12,
        customerCount: 5,
        conversionRate: 0.65,
        avgScore: 87,
        createdAt: "2024-01-15T10:00:00Z"
      },
      {
        id: 2,
        name: "Technology Industry (Demo)",
        description: "Demo segment: All leads from technology companies",
        criteria: {
          name: "Technology Industry",
          description: "All leads from technology companies",
          conditions: [
            { field: "industry", operator: "eq", value: "Technology" }
          ]
        },
        leadCount: 25,
        customerCount: 8,
        conversionRate: 0.32,
        avgScore: 72,
        createdAt: "2024-01-10T14:30:00Z"
      },
      {
        id: 3,
        name: "Engaged but Unqualified (Demo)",
        description: "Demo segment: High engagement but low qualification status",
        criteria: {
          name: "Engaged but Unqualified",
          description: "High engagement but low qualification status",
          conditions: [
            { field: "engagementLevel", operator: "gte", value: 60 },
            { field: "leadStatus", operator: "eq", value: "new" }
          ]
        },
        leadCount: 18,
        customerCount: 2,
        conversionRate: 0.11,
        avgScore: 55,
        createdAt: "2024-01-20T09:15:00Z"
      }
    ];

    return res.json(segments);
  } catch (error) {
    console.error("Get customer segments error:", error);
    return res.status(500).json({ message: "Failed to fetch customer segments" });
  }
};

export const createCustomerSegment = async (req: Request, res: Response) => {
  try {
    const { name, description, criteria } = req.body;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!name || !criteria) {
      return res.status(400).json({ message: "Name and criteria are required" });
    }

    // Mock segment creation - in real implementation, save to database
    const newSegment = {
      id: Date.now(),
      name,
      description: description || "",
      criteria,
      leadCount: 0,
      customerCount: 0,
      conversionRate: 0,
      avgScore: 0,
      createdAt: new Date().toISOString()
    };

    console.log("Creating customer segment:", newSegment);

    return res.status(201).json(newSegment);
  } catch (error) {
    console.error("Create customer segment error:", error);
    return res.status(500).json({ message: "Failed to create customer segment" });
  }
};

export const exportSegmentData = async (req: Request, res: Response) => {
  try {
    const segmentId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (isNaN(segmentId)) {
      return res.status(400).json({ message: "Invalid segment ID" });
    }

    // Mock CSV export - in real implementation, generate actual CSV from segment data
    const csvHeader = "Name,Email,Company,Industry,Score,Status,Created\n";
    const csvData = [
      "John Doe (Demo),john.demo@example.com,Demo Corp,Technology,85,Qualified,2024-01-15",
      "Jane Smith (Demo),jane.demo@example.com,Demo TechStart,Technology,90,Proposal,2024-01-10",
      "Bob Johnson (Demo),bob.demo@example.com,Demo Innovation Ltd,Technology,78,Contacted,2024-01-20"
    ].join("\n");

    const fullCsv = csvHeader + csvData;

    return res.json({
      success: true,
      csvData: fullCsv
    });
  } catch (error) {
    console.error("Export segment data error:", error);
    return res.status(500).json({ message: "Failed to export segment data" });
  }
};

// ===== WORKFLOW AUTOMATION ROUTES =====

export const getWorkflows = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Mock workflows - in real implementation, fetch from database
    const workflows = [
      {
        id: 1,
        name: "High Score Lead Follow-up (Demo)",
        description: "Demo workflow: Automatically follow up with leads when their score exceeds 80",
        isActive: true,
        trigger: {
          id: "high_score_trigger",
          type: "lead_score_change",
          name: "High Score Trigger",
          conditions: [
            { field: "score", operator: "gte", value: 80 }
          ]
        },
        actions: [
          {
            id: "email_high_score",
            type: "send_email",
            name: "Send High Priority Email",
            parameters: {
              template: "high_priority_lead",
              subject: "Priority Lead Alert - High Score Achieved"
            },
            delay: 0
          },
          {
            id: "assign_senior_rep",
            type: "assign_owner",
            name: "Assign to Senior Rep",
            parameters: {
              owner: "Senior Sales Rep"
            },
            delay: 5
          }
        ],
        lastRun: "2024-01-20T14:30:00Z",
        totalExecutions: 47,
        successRate: 0.94,
        createdAt: "2024-01-01T10:00:00Z"
      },
      {
        id: 2,
        name: "New Lead Nurture Sequence (Demo)",
        description: "Demo workflow: Automated nurture sequence for new leads",
        isActive: true,
        trigger: {
          id: "new_lead_trigger",
          type: "status_change",
          name: "New Lead Status",
          conditions: [
            { field: "leadStatus", operator: "eq", value: "new" }
          ]
        },
        actions: [
          {
            id: "welcome_email",
            type: "send_email",
            name: "Send Welcome Email",
            parameters: {
              template: "welcome_sequence",
              subject: "Welcome - Let's get started!"
            },
            delay: 0
          },
          {
            id: "followup_task",
            type: "create_task",
            name: "Create Follow-up Task",
            parameters: {
              title: "Initial follow-up call",
              dueDate: "3 days",
              priority: "medium"
            },
            delay: 1440
          }
        ],
        lastRun: "2024-01-21T09:15:00Z",
        totalExecutions: 23,
        successRate: 0.87,
        createdAt: "2024-01-05T15:20:00Z"
      }
    ];

    return res.json(workflows);
  } catch (error) {
    console.error("Get workflows error:", error);
    return res.status(500).json({ message: "Failed to fetch workflows" });
  }
};

export const createWorkflow = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive, trigger, actions } = req.body;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!name || !trigger || !actions || actions.length === 0) {
      return res.status(400).json({ 
        message: "Name, trigger, and at least one action are required" 
      });
    }

    // Mock workflow creation - in real implementation, save to database
    const newWorkflow = {
      id: Date.now(),
      name,
      description: description || "",
      isActive: isActive !== false,
      trigger,
      actions,
      lastRun: null,
      totalExecutions: 0,
      successRate: 0,
      createdAt: new Date().toISOString()
    };

    console.log("Creating workflow:", newWorkflow);

    return res.status(201).json(newWorkflow);
  } catch (error) {
    console.error("Create workflow error:", error);
    return res.status(500).json({ message: "Failed to create workflow" });
  }
};

export const toggleWorkflow = async (req: Request, res: Response) => {
  try {
    const workflowId = parseInt(req.params.id);
    const { isActive } = req.body;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (isNaN(workflowId)) {
      return res.status(400).json({ message: "Invalid workflow ID" });
    }

    // Mock workflow toggle - in real implementation, update database
    console.log(`Toggling workflow ${workflowId} to ${isActive ? 'active' : 'inactive'}`);

    return res.json({ 
      success: true,
      message: `Workflow ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Toggle workflow error:", error);
    return res.status(500).json({ message: "Failed to toggle workflow" });
  }
};

export const testWorkflow = async (req: Request, res: Response) => {
  try {
    const workflowId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (isNaN(workflowId)) {
      return res.status(400).json({ message: "Invalid workflow ID" });
    }

    // Mock workflow test - in real implementation, evaluate trigger conditions
    const leads = await storage.getLeads();
    const mockMatchedLeads = Math.floor(Math.random() * leads.length / 2);

    console.log(`Testing workflow ${workflowId}, would affect ${mockMatchedLeads} leads`);

    return res.json({ 
      success: true,
      message: "Workflow test completed successfully",
      matchedLeads: mockMatchedLeads,
      totalLeads: leads.length
    });
  } catch (error) {
    console.error("Test workflow error:", error);
    return res.status(500).json({ message: "Failed to test workflow" });
  }
};

export const getWorkflowLogs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Mock execution logs - in real implementation, fetch from database
    const logs = [
      {
        id: 1,
        workflowId: 1,
        workflowName: "High Score Lead Follow-up (Demo)",
        leadId: 6,
        leadName: "David Miller (Demo Lead)",
        action: "Send High Priority Email",
        status: "success",
        timestamp: "2024-01-21T10:30:00Z",
        details: "Demo: Email sent successfully to david@technovation.com"
      },
      {
        id: 2,
        workflowId: 2,
        workflowName: "New Lead Nurture Sequence (Demo)",
        leadId: 8,
        leadName: "Michael Chen (Demo Lead)",
        action: "Send Welcome Email",
        status: "success",
        timestamp: "2024-01-21T09:15:00Z",
        details: "Demo: Welcome email sent to michael@healthinnovate.org"
      },
      {
        id: 3,
        workflowId: 1,
        workflowName: "High Score Lead Follow-up (Demo)",
        leadId: 10,
        leadName: "James Wilson (Demo Lead)",
        action: "Assign to Senior Rep",
        status: "error",
        timestamp: "2024-01-21T08:45:00Z",
        details: "Demo: Senior rep assignment failed - no available representatives"
      }
    ];

    return res.json(logs);
  } catch (error) {
    console.error("Get workflow logs error:", error);
    return res.status(500).json({ message: "Failed to fetch workflow logs" });
  }
};

// ===== ENHANCED LEAD MANAGEMENT ROUTES =====

export const updateLeadScore = async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    const { scoringData } = req.body;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (isNaN(leadId)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    // Calculate new score based on scoring data
    const newScore = Object.values(scoringData).reduce((sum: number, value: any) => {
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);

    // Mock lead score update - in real implementation, update database
    console.log(`Updating lead ${leadId} score to ${newScore}`, scoringData);

    return res.json({ 
      success: true,
      newScore: Math.min(100, Math.max(0, newScore)),
      message: "Lead score updated successfully"
    });
  } catch (error) {
    console.error("Update lead score error:", error);
    return res.status(500).json({ message: "Failed to update lead score" });
  }
};

export const addLeadNote = async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    const { note } = req.body;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (isNaN(leadId) || !note?.trim()) {
      return res.status(400).json({ message: "Invalid lead ID or note" });
    }

    // Mock note addition - in real implementation, append to lead notes
    const timestamp = new Date().toISOString().split('T')[0];
    const formattedNote = `[${timestamp}]\n${note.trim()}`;
    
    console.log(`Adding note to lead ${leadId}:`, formattedNote);

    return res.json({ 
      success: true,
      message: "Note added successfully"
    });
  } catch (error) {
    console.error("Add lead note error:", error);
    return res.status(500).json({ message: "Failed to add note" });
  }
};

export const assignLeadOwner = async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    const { ownerName } = req.body;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (isNaN(leadId) || !ownerName?.trim()) {
      return res.status(400).json({ message: "Invalid lead ID or owner name" });
    }

    // Mock owner assignment - in real implementation, update database
    console.log(`Assigning lead ${leadId} to owner: ${ownerName}`);

    return res.json({ 
      success: true,
      message: `Lead assigned to ${ownerName} successfully`
    });
  } catch (error) {
    console.error("Assign lead owner error:", error);
    return res.status(500).json({ message: "Failed to assign lead owner" });
  }
};