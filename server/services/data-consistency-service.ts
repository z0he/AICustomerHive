import { storage } from "../storage.js";
import { 
  Lead, 
  Customer, 
  Contact,
  CustomerTouchpoint,
  JourneyStage
} from "@shared/schema";

/**
 * Data Consistency Service - Phase 4: Data Consistency
 * 
 * This service ensures complete data consistency across all CRM features
 * by standardizing data formats, fixing inconsistencies, and maintaining
 * referential integrity throughout the unified system.
 */
export class DataConsistencyService {
  
  /**
   * Audit and fix data inconsistencies across the entire CRM
   */
  async performFullDataConsistencyAudit(): Promise<{
    issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>;
    fixes: Array<{ type: string; description: string; recordsAffected: number }>;
    summary: {
      totalIssuesFound: number;
      totalIssuesFixed: number;
      criticalIssuesRemaining: number;
    };
  }> {
    const issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
    const fixes: Array<{ type: string; description: string; recordsAffected: number }> = [];

    try {
      // 1. Industry Field Consistency
      const industryAudit = await this.auditIndustryFieldConsistency();
      issues.push(...industryAudit.issues);
      fixes.push(...industryAudit.fixes);

      // 2. Journey Stage Consistency
      const journeyAudit = await this.auditJourneyStageConsistency();
      issues.push(...journeyAudit.issues);
      fixes.push(...journeyAudit.fixes);

      // 3. Contact Data Normalization
      const contactAudit = await this.auditContactDataNormalization();
      issues.push(...contactAudit.issues);
      fixes.push(...contactAudit.fixes);

      // 4. Touchpoint Referential Integrity
      const touchpointAudit = await this.auditTouchpointIntegrity();
      issues.push(...touchpointAudit.issues);
      fixes.push(...touchpointAudit.fixes);

      // 5. Segment Data Consistency
      const segmentAudit = await this.auditSegmentConsistency();
      issues.push(...segmentAudit.issues);
      fixes.push(...segmentAudit.fixes);

      const summary = {
        totalIssuesFound: issues.length,
        totalIssuesFixed: fixes.reduce((sum, fix) => sum + fix.recordsAffected, 0),
        criticalIssuesRemaining: issues.filter(i => i.severity === 'high').length
      };

      return { issues, fixes, summary };
    } catch (error) {
      console.error('Data consistency audit failed:', error);
      throw new Error('Failed to perform data consistency audit');
    }
  }

  /**
   * Audit industry field consistency between leads and customers
   */
  private async auditIndustryFieldConsistency() {
    const issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
    const fixes: Array<{ type: string; description: string; recordsAffected: number }> = [];

    try {
      const leads = await storage.getLeads();
      const customers = await storage.getCustomers();

      // Check for leads with null/undefined industry
      const leadsWithoutIndustry = leads.filter(lead => !lead.industry || lead.industry.trim() === '');
      if (leadsWithoutIndustry.length > 0) {
        issues.push({
          type: 'missing_industry_leads',
          description: `${leadsWithoutIndustry.length} leads are missing industry information`,
          severity: 'medium'
        });

        // Fix: Set industry to 'Unknown' for leads without industry
        for (const lead of leadsWithoutIndustry) {
          await storage.updateLead(lead.id, { industry: 'Unknown' });
        }

        fixes.push({
          type: 'industry_normalization_leads',
          description: 'Set missing lead industries to "Unknown"',
          recordsAffected: leadsWithoutIndustry.length
        });
      }

      // Check for customers with null/undefined industry
      const customersWithoutIndustry = customers.filter(customer => !customer.industry || customer.industry.trim() === '');
      if (customersWithoutIndustry.length > 0) {
        issues.push({
          type: 'missing_industry_customers',
          description: `${customersWithoutIndustry.length} customers are missing industry information`,
          severity: 'medium'
        });

        // Fix: Set industry to 'Unknown' for customers without industry
        for (const customer of customersWithoutIndustry) {
          await storage.updateCustomer(customer.id, { industry: 'Unknown' });
        }

        fixes.push({
          type: 'industry_normalization_customers',
          description: 'Set missing customer industries to "Unknown"',
          recordsAffected: customersWithoutIndustry.length
        });
      }

      // Check for industry naming inconsistencies
      const allIndustries = new Set([
        ...leads.map(l => l.industry).filter(Boolean),
        ...customers.map(c => c.industry).filter(Boolean)
      ]);

      const industryVariations = this.findIndustryVariations(Array.from(allIndustries));
      if (industryVariations.length > 0) {
        issues.push({
          type: 'industry_naming_inconsistency',
          description: `Found ${industryVariations.length} industry naming variations that should be standardized`,
          severity: 'low'
        });

        // Fix industry variations
        let fixedCount = 0;
        for (const variation of industryVariations) {
          // Update leads
          const affectedLeads = leads.filter(l => l.industry === variation.variant);
          for (const lead of affectedLeads) {
            await storage.updateLead(lead.id, { industry: variation.standard });
            fixedCount++;
          }

          // Update customers
          const affectedCustomers = customers.filter(c => c.industry === variation.variant);
          for (const customer of affectedCustomers) {
            await storage.updateCustomer(customer.id, { industry: variation.standard });
            fixedCount++;
          }
        }

        if (fixedCount > 0) {
          fixes.push({
            type: 'industry_standardization',
            description: 'Standardized industry naming variations',
            recordsAffected: fixedCount
          });
        }
      }

    } catch (error) {
      console.error('Industry field audit failed:', error);
      issues.push({
        type: 'industry_audit_error',
        description: 'Failed to complete industry field audit',
        severity: 'high'
      });
    }

    return { issues, fixes };
  }

  /**
   * Audit journey stage consistency
   */
  private async auditJourneyStageConsistency() {
    const issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
    const fixes: Array<{ type: string; description: string; recordsAffected: number }> = [];

    try {
      const leads = await storage.getLeads();
      const customers = await storage.getCustomers();
      const journeyStages = await storage.getJourneyStages();
      const touchpoints = await storage.getCustomerTouchpoints();

      // Check for contacts with invalid journey stage IDs
      const invalidJourneyStageIds = new Set<number>();
      const validStageIds = new Set(journeyStages.map(s => s.id));

      let fixedLeads = 0;
      for (const lead of leads) {
        if (lead.currentJourneyStageId && !validStageIds.has(lead.currentJourneyStageId)) {
          invalidJourneyStageIds.add(lead.currentJourneyStageId);
          // Fix: Reset to null or default stage
          await storage.updateLead(lead.id, { 
            currentJourneyStageId: null,
            journeyEntryDate: lead.journeyEntryDate || new Date()
          });
          fixedLeads++;
        }
      }

      let fixedCustomers = 0;
      for (const customer of customers) {
        if (customer.currentJourneyStageId && !validStageIds.has(customer.currentJourneyStageId)) {
          invalidJourneyStageIds.add(customer.currentJourneyStageId);
          // Fix: Reset to null or default stage
          await storage.updateCustomer(customer.id, { 
            currentJourneyStageId: null,
            journeyEntryDate: customer.journeyEntryDate || new Date()
          });
          fixedCustomers++;
        }
      }

      if (invalidJourneyStageIds.size > 0) {
        issues.push({
          type: 'invalid_journey_stage_ids',
          description: `Found ${invalidJourneyStageIds.size} invalid journey stage references`,
          severity: 'high'
        });

        fixes.push({
          type: 'journey_stage_cleanup',
          description: 'Cleaned up invalid journey stage references',
          recordsAffected: fixedLeads + fixedCustomers
        });
      }

      // Check for touchpoints with inconsistent stage names
      const touchpointStages = new Set(touchpoints.map(t => t.touchpointStage));
      const validStageNames = new Set(['awareness', 'consideration', 'decision', 'onboarding', 'retention', 'advocacy']);
      const invalidTouchpointStages = Array.from(touchpointStages).filter(stage => !validStageNames.has(stage));

      if (invalidTouchpointStages.length > 0) {
        issues.push({
          type: 'invalid_touchpoint_stages',
          description: `Found ${invalidTouchpointStages.length} touchpoints with invalid stage names`,
          severity: 'medium'
        });

        // Fix invalid touchpoint stages
        let fixedTouchpoints = 0;
        for (const invalidStage of invalidTouchpointStages) {
          const affectedTouchpoints = touchpoints.filter(t => t.touchpointStage === invalidStage);
          for (const touchpoint of affectedTouchpoints) {
            // Map to awareness as default
            await storage.updateCustomerTouchpoint(touchpoint.id, { 
              touchpointStage: 'awareness' 
            });
            fixedTouchpoints++;
          }
        }

        fixes.push({
          type: 'touchpoint_stage_normalization',
          description: 'Normalized invalid touchpoint stage names',
          recordsAffected: fixedTouchpoints
        });
      }

    } catch (error) {
      console.error('Journey stage audit failed:', error);
      issues.push({
        type: 'journey_stage_audit_error',
        description: 'Failed to complete journey stage audit',
        severity: 'high'
      });
    }

    return { issues, fixes };
  }

  /**
   * Audit contact data normalization
   */
  private async auditContactDataNormalization() {
    const issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
    const fixes: Array<{ type: string; description: string; recordsAffected: number }> = [];

    try {
      const leads = await storage.getLeads();
      const customers = await storage.getCustomers();

      // Check for email format consistency
      let fixedEmailsCount = 0;
      
      // Normalize lead emails
      for (const lead of leads) {
        if (lead.email) {
          const normalizedEmail = lead.email.toLowerCase().trim();
          if (normalizedEmail !== lead.email) {
            await storage.updateLead(lead.id, { email: normalizedEmail });
            fixedEmailsCount++;
          }
        }
      }

      // Normalize customer emails
      for (const customer of customers) {
        if (customer.email) {
          const normalizedEmail = customer.email.toLowerCase().trim();
          if (normalizedEmail !== customer.email) {
            await storage.updateCustomer(customer.id, { email: normalizedEmail });
            fixedEmailsCount++;
          }
        }
      }

      if (fixedEmailsCount > 0) {
        fixes.push({
          type: 'email_normalization',
          description: 'Normalized email formats to lowercase',
          recordsAffected: fixedEmailsCount
        });
      }

      // Check for missing initials
      let fixedInitialsCount = 0;
      
      for (const lead of leads) {
        if (!lead.initials && lead.name) {
          const initials = this.generateInitials(lead.name);
          await storage.updateLead(lead.id, { initials });
          fixedInitialsCount++;
        }
      }

      for (const customer of customers) {
        const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        if (!customer.initials && fullName) {
          const initials = this.generateInitials(fullName);
          await storage.updateCustomer(customer.id, { initials });
          fixedInitialsCount++;
        }
      }

      if (fixedInitialsCount > 0) {
        fixes.push({
          type: 'initials_generation',
          description: 'Generated missing initials for contacts',
          recordsAffected: fixedInitialsCount
        });
      }

    } catch (error) {
      console.error('Contact data normalization audit failed:', error);
      issues.push({
        type: 'contact_data_audit_error',
        description: 'Failed to complete contact data normalization audit',
        severity: 'high'
      });
    }

    return { issues, fixes };
  }

  /**
   * Audit touchpoint referential integrity
   */
  private async auditTouchpointIntegrity() {
    const issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
    const fixes: Array<{ type: string; description: string; recordsAffected: number }> = [];

    try {
      const touchpoints = await storage.getCustomerTouchpoints();
      const leads = await storage.getLeads();
      const customers = await storage.getCustomers();

      const leadIds = new Set(leads.map(l => l.id));
      const customerIds = new Set(customers.map(c => c.id));

      // Find orphaned touchpoints
      const orphanedTouchpoints = touchpoints.filter(tp => {
        const hasValidCustomer = customerIds.has(tp.customerId);
        const hasValidLead = !tp.leadId || leadIds.has(tp.leadId);
        return !hasValidCustomer || !hasValidLead;
      });

      if (orphanedTouchpoints.length > 0) {
        issues.push({
          type: 'orphaned_touchpoints',
          description: `Found ${orphanedTouchpoints.length} touchpoints with invalid references`,
          severity: 'high'
        });

        // Remove orphaned touchpoints
        for (const touchpoint of orphanedTouchpoints) {
          await storage.deleteCustomerTouchpoint(touchpoint.id);
        }

        fixes.push({
          type: 'orphaned_touchpoint_cleanup',
          description: 'Removed orphaned touchpoints with invalid references',
          recordsAffected: orphanedTouchpoints.length
        });
      }

    } catch (error) {
      console.error('Touchpoint integrity audit failed:', error);
      issues.push({
        type: 'touchpoint_integrity_audit_error',
        description: 'Failed to complete touchpoint integrity audit',
        severity: 'high'
      });
    }

    return { issues, fixes };
  }

  /**
   * Audit segment data consistency
   */
  private async auditSegmentConsistency() {
    const issues: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
    const fixes: Array<{ type: string; description: string; recordsAffected: number }> = [];

    try {
      const contactSegments = await storage.getContactSegments();
      
      // Check for segments with invalid filter criteria
      let fixedSegments = 0;
      for (const segment of contactSegments) {
        if (segment.filterCriteria) {
          const hasInvalidCriteria = segment.filterCriteria.some(criteria => 
            !criteria.field || !criteria.operator || criteria.value === undefined
          );

          if (hasInvalidCriteria) {
            // Fix by removing invalid criteria
            const validCriteria = segment.filterCriteria.filter(criteria =>
              criteria.field && criteria.operator && criteria.value !== undefined
            );

            await storage.updateContactSegment(segment.id, {
              filterCriteria: validCriteria
            });
            fixedSegments++;
          }
        }
      }

      if (fixedSegments > 0) {
        fixes.push({
          type: 'segment_criteria_cleanup',
          description: 'Cleaned up invalid segment filter criteria',
          recordsAffected: fixedSegments
        });
      }

    } catch (error) {
      console.error('Segment consistency audit failed:', error);
      issues.push({
        type: 'segment_consistency_audit_error',
        description: 'Failed to complete segment consistency audit',
        severity: 'high'
      });
    }

    return { issues, fixes };
  }

  /**
   * Find industry naming variations that should be standardized
   */
  private findIndustryVariations(industries: string[]): Array<{ variant: string; standard: string }> {
    const variations: Array<{ variant: string; standard: string }> = [];
    
    // Common industry standardizations
    const standardizations: Record<string, string> = {
      'Tech': 'Technology',
      'IT': 'Technology',
      'Info Tech': 'Technology',
      'Information Technology': 'Technology',
      'Software': 'Technology',
      'SaaS': 'Technology',
      'Healthcare': 'Healthcare',
      'Health Care': 'Healthcare',
      'Medical': 'Healthcare',
      'Finance': 'Financial Services',
      'Financial': 'Financial Services',
      'Banking': 'Financial Services',
      'Retail': 'Retail',
      'E-commerce': 'Retail',
      'Education': 'Education',
      'Educational': 'Education',
      'Manufacturing': 'Manufacturing',
      'Consulting': 'Professional Services',
      'Services': 'Professional Services'
    };

    for (const industry of industries) {
      const standard = standardizations[industry];
      if (standard && standard !== industry) {
        variations.push({ variant: industry, standard });
      }
    }

    return variations;
  }

  /**
   * Generate initials from a name
   */
  private generateInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2) || 'U'; // Default to 'U' for Unknown
  }

  /**
   * Get data consistency health score
   */
  async getDataConsistencyHealthScore(): Promise<{
    overallScore: number;
    categoryScores: {
      industryConsistency: number;
      journeyStageIntegrity: number;
      contactDataNormalization: number;
      touchpointIntegrity: number;
      segmentConsistency: number;
    };
    recommendations: string[];
  }> {
    try {
      const audit = await this.performFullDataConsistencyAudit();
      
      // Calculate category scores (0-100)
      const totalIssues = audit.issues.length;
      const criticalIssues = audit.issues.filter(i => i.severity === 'high').length;
      const mediumIssues = audit.issues.filter(i => i.severity === 'medium').length;
      const lowIssues = audit.issues.filter(i => i.severity === 'low').length;

      // Weight issues by severity
      const weightedIssueScore = (criticalIssues * 3) + (mediumIssues * 2) + (lowIssues * 1);
      const maxPossibleIssues = 20; // Assumed baseline
      const overallScore = Math.max(0, Math.min(100, 100 - (weightedIssueScore / maxPossibleIssues * 100)));

      // Category-specific scores (simplified for demo)
      const categoryScores = {
        industryConsistency: 100 - (audit.issues.filter(i => i.type.includes('industry')).length * 20),
        journeyStageIntegrity: 100 - (audit.issues.filter(i => i.type.includes('journey')).length * 25),
        contactDataNormalization: 100 - (audit.issues.filter(i => i.type.includes('contact')).length * 15),
        touchpointIntegrity: 100 - (audit.issues.filter(i => i.type.includes('touchpoint')).length * 30),
        segmentConsistency: 100 - (audit.issues.filter(i => i.type.includes('segment')).length * 20)
      };

      const recommendations: string[] = [];
      if (criticalIssues > 0) {
        recommendations.push(`Address ${criticalIssues} critical data integrity issues immediately`);
      }
      if (mediumIssues > 0) {
        recommendations.push(`Review and fix ${mediumIssues} medium-priority data consistency issues`);
      }
      if (audit.summary.totalIssuesFixed > 0) {
        recommendations.push(`Monitor ${audit.summary.totalIssuesFixed} recently fixed data issues for stability`);
      }

      return {
        overallScore: Math.round(overallScore),
        categoryScores: {
          industryConsistency: Math.max(0, Math.min(100, categoryScores.industryConsistency)),
          journeyStageIntegrity: Math.max(0, Math.min(100, categoryScores.journeyStageIntegrity)), 
          contactDataNormalization: Math.max(0, Math.min(100, categoryScores.contactDataNormalization)),
          touchpointIntegrity: Math.max(0, Math.min(100, categoryScores.touchpointIntegrity)),
          segmentConsistency: Math.max(0, Math.min(100, categoryScores.segmentConsistency))
        },
        recommendations
      };
    } catch (error) {
      console.error('Failed to calculate data consistency health score:', error);
      return {
        overallScore: 0,
        categoryScores: {
          industryConsistency: 0,
          journeyStageIntegrity: 0,
          contactDataNormalization: 0,
          touchpointIntegrity: 0,
          segmentConsistency: 0
        },
        recommendations: ['Failed to assess data consistency - manual review required']
      };
    }
  }
}

export const dataConsistencyService = new DataConsistencyService();