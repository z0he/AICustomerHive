import { db } from "../db";
import { leads, customers, users } from "@shared/schema";
import { eq } from "drizzle-orm";

interface PersonalizationData {
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    jobTitle?: string;
    industry?: string;
    createdAt?: string;
  };
  lead?: {
    status?: string;
    score?: number;
    source?: string;
    value?: number;
    priority?: string;
    tags?: string[];
    notes?: string;
    assignedTo?: string;
  };
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  custom?: Record<string, any>;
}

interface TokenConfig {
  defaultValues: Record<string, string>;
  enableSmartContent?: boolean;
}

/**
 * Enhanced personalization token processor inspired by HubSpot's system
 */
export class PersonalizationEngine {
  private defaultConfig: TokenConfig = {
    defaultValues: {
      'contact.firstName': 'Valued Customer',
      'contact.lastName': 'Friend',
      'contact.company': 'Your Company',
      'lead.status': 'New',
      'user.firstName': 'Team Member'
    }
  };

  /**
   * Process content and replace personalization tokens with actual data
   */
  async processContent(
    content: string, 
    recipientEmail: string, 
    config?: Partial<TokenConfig>
  ): Promise<string> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    // Get personalization data for the recipient
    const personalizationData = await this.getPersonalizationData(recipientEmail);
    
    // Find all tokens in the content
    const tokens = this.extractTokens(content);
    
    let processedContent = content;
    
    for (const token of tokens) {
      const value = this.resolveTokenValue(token, personalizationData, mergedConfig);
      const tokenPattern = new RegExp(`\\{\\{\\s*${token.replace('.', '\\.')}\\s*\\}\\}`, 'g');
      processedContent = processedContent.replace(tokenPattern, value);
    }
    
    return processedContent;
  }

  /**
   * Extract all personalization tokens from content
   */
  private extractTokens(content: string): string[] {
    const tokenPattern = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
    const tokens: string[] = [];
    let match;
    
    while ((match = tokenPattern.exec(content)) !== null) {
      if (!tokens.includes(match[1])) {
        tokens.push(match[1]);
      }
    }
    
    return tokens;
  }

  /**
   * Get personalization data for a specific recipient
   */
  private async getPersonalizationData(email: string): Promise<PersonalizationData> {
    const data: PersonalizationData = {};
    
    try {
      // Try to find contact in leads table first
      const leadResult = await db.select().from(leads).where(eq(leads.email, email)).limit(1);
      if (leadResult.length > 0) {
        const lead = leadResult[0];
        data.contact = {
          firstName: lead.name?.split(' ')[0] || '',
          lastName: lead.name?.split(' ').slice(1).join(' ') || '',
          email: lead.email ?? '',
          company: lead.company ?? '',
          phone: lead.phone ?? '',
          jobTitle: lead.jobTitle ?? '',
          industry: lead.industry ?? '',
          createdAt: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ''
        };
        data.lead = {
          status: lead.leadStatus || 'new',
          score: lead.score || 0,
          source: lead.leadSource || '',
          value: lead.conversionProbability || 0,
          priority: lead.engagementLevel ? (lead.engagementLevel > 70 ? 'High' : lead.engagementLevel > 40 ? 'Medium' : 'Low') : 'Low',
          tags: lead.tags || [],
          notes: lead.notes || '',
          assignedTo: lead.leadOwner || ''
        };
      }
      
      // Try customers table if not found in leads
      if (!data.contact) {
        const customerResult = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
        if (customerResult.length > 0) {
          const customer = customerResult[0];
          data.contact = {
            firstName: customer.firstName || customer.name?.split(' ')[0] || '',
            lastName: customer.lastName || customer.name?.split(' ').slice(1).join(' ') || '',
            email: customer.email,
            company: customer.company || '',
            phone: customer.phone || '',
            jobTitle: customer.jobTitle || '',
            industry: customer.contactIndustry || '',
            createdAt: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : ''
          };
        }
      }
      
    } catch (error) {
      console.error('Error fetching personalization data:', error);
    }
    
    return data;
  }

  /**
   * Get user name by ID for assignedTo fields
   */
  private async getUserName(userId: number): Promise<string> {
    try {
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userResult.length > 0) {
        const user = userResult[0];
        return user.name || user.username;
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
    return '';
  }

  /**
   * Resolve the value for a specific token
   */
  private resolveTokenValue(
    token: string, 
    data: PersonalizationData, 
    config: TokenConfig
  ): string {
    const parts = token.split('.');
    
    if (parts.length !== 2) {
      return config.defaultValues[token] || token;
    }
    
    const [category, property] = parts;
    let value = '';
    
    switch (category) {
      case 'contact':
        value = data.contact?.[property as keyof typeof data.contact] || '';
        break;
      case 'lead':
        value = data.lead?.[property as keyof typeof data.lead]?.toString() || '';
        break;
      case 'user':
        value = data.user?.[property as keyof typeof data.user] || '';
        break;
      case 'custom':
        value = data.custom?.[property] || '';
        break;
      default:
        value = '';
    }
    
    // Return default value if no actual value found
    return value || config.defaultValues[token] || config.defaultValues[`${category}.${property}`] || 'Customer';
  }

  /**
   * Get available personalization tokens based on database schema
   */
  getAvailableTokens(): Array<{ token: string; label: string; category: string }> {
    return [
      // Contact tokens
      { token: 'contact.firstName', label: 'First Name', category: 'Contact' },
      { token: 'contact.lastName', label: 'Last Name', category: 'Contact' },
      { token: 'contact.email', label: 'Email Address', category: 'Contact' },
      { token: 'contact.company', label: 'Company', category: 'Contact' },
      { token: 'contact.phone', label: 'Phone Number', category: 'Contact' },
      { token: 'contact.jobTitle', label: 'Job Title', category: 'Contact' },
      { token: 'contact.industry', label: 'Industry', category: 'Contact' },
      { token: 'contact.createdAt', label: 'Created Date', category: 'Contact' },
      
      // Lead tokens
      { token: 'lead.status', label: 'Lead Status', category: 'Lead' },
      { token: 'lead.score', label: 'Lead Score', category: 'Lead' },
      { token: 'lead.source', label: 'Lead Source', category: 'Lead' },
      { token: 'lead.value', label: 'Lead Value', category: 'Lead' },
      { token: 'lead.priority', label: 'Priority', category: 'Lead' },
      { token: 'lead.assignedTo', label: 'Assigned To', category: 'Lead' },
    ];
  }

  /**
   * Preview personalization with sample data
   */
  async previewContent(content: string, sampleEmail?: string): Promise<{ processed: string; tokens: string[] }> {
    const tokens = this.extractTokens(content);
    
    // Use sample email if provided, otherwise use sample data
    let processedContent: string;
    
    if (sampleEmail) {
      processedContent = await this.processContent(content, sampleEmail);
    } else {
      // Use sample data for preview
      const sampleData: PersonalizationData = {
        contact: {
          firstName: 'John',
          lastName: 'Smith', 
          email: 'john@example.com',
          company: 'Acme Corp',
          phone: '(555) 123-4567',
          jobTitle: 'Marketing Manager',
          industry: 'Technology',
          createdAt: new Date().toLocaleDateString()
        },
        lead: {
          status: 'Qualified',
          score: 85,
          source: 'Website',
          value: 50000,
          priority: 'High',
          assignedTo: 'Sarah Johnson'
        }
      };
      
      processedContent = content;
      for (const token of tokens) {
        const value = this.resolveTokenValue(token, sampleData, this.defaultConfig);
        const tokenPattern = new RegExp(`\\{\\{\\s*${token.replace('.', '\\.')}\\s*\\}\\}`, 'g');
        processedContent = processedContent.replace(tokenPattern, value);
      }
    }
    
    return { processed: processedContent, tokens };
  }
}

// Export singleton instance
export const personalizationEngine = new PersonalizationEngine();