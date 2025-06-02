import { storage } from "../storage";
import { sendEmail } from "./mailgun";
import { personalizationEngine } from "./personalization";

/**
 * Email scheduler service for processing scheduled emails
 */
class EmailScheduler {
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the email scheduler
   */
  start(intervalMs: number = 60000) { // Check every minute by default
    if (this.intervalId) {
      console.log("Email scheduler is already running");
      return;
    }

    console.log("Starting email scheduler...");
    this.intervalId = setInterval(() => {
      this.processScheduledEmails();
    }, intervalMs);
  }

  /**
   * Stop the email scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Email scheduler stopped");
    }
  }

  /**
   * Process emails that are ready to be sent
   */
  async processScheduledEmails() {
    if (this.isProcessing) {
      return; // Prevent overlapping executions
    }

    this.isProcessing = true;
    
    try {
      const readyEmails = await storage.getScheduledEmailsReady();
      
      if (readyEmails.length === 0) {
        return;
      }

      console.log(`Processing ${readyEmails.length} scheduled emails...`);

      for (const email of readyEmails) {
        await this.processScheduledEmail(email);
      }
    } catch (error) {
      console.error("Error processing scheduled emails:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single scheduled email
   */
  private async processScheduledEmail(email: any) {
    try {
      // Mark as processing
      await storage.updateScheduledEmail(email.id, {
        status: 'processing'
      });

      // Handle bulk sending based on target audience
      const recipients = await this.getRecipients(email.targetAudience);
      
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];

      for (const recipient of recipients) {
        try {
          // Personalize content for each recipient
          const personalizedSubject = await personalizationEngine.processContent(
            email.subject,
            recipient.email,
            { defaultValues: recipient }
          );

          const personalizedHtml = await personalizationEngine.processContent(
            email.htmlContent,
            recipient.email,
            { defaultValues: recipient }
          );

          const personalizedText = email.textContent 
            ? await personalizationEngine.processContent(email.textContent, recipient.email, { defaultValues: recipient })
            : personalizedHtml.replace(/<[^>]*>/g, '');

          // Send the email
          const success = await sendEmail({
            from: email.fromAddress,
            to: recipient.email,
            subject: personalizedSubject,
            html: personalizedHtml,
            text: personalizedText
          });

          if (success) {
            successCount++;
            
            // Log successful email
            await storage.createEmailLog({
              from: email.fromAddress,
              to: recipient.email,
              subject: personalizedSubject,
              body: personalizedHtml,
              status: 'sent',
              campaignId: email.campaignId,
              templateId: email.templateId,
              metadata: {
                scheduledEmailId: email.id,
                personalized: true,
                sentAt: new Date().toISOString()
              }
            });
          } else {
            failureCount++;
            errors.push(`Failed to send to ${recipient.email}`);
          }
        } catch (error) {
          failureCount++;
          errors.push(`Error sending to ${recipient.email}: ${error.message}`);
        }
      }

      // Update scheduled email status
      const finalStatus = failureCount === 0 ? 'sent' : 
                         successCount === 0 ? 'failed' : 'partially_sent';

      await storage.updateScheduledEmail(email.id, {
        status: finalStatus,
        sentAt: new Date(),
        recipientCount: recipients.length,
        errorMessage: errors.length > 0 ? errors.join('; ') : null,
        metadata: {
          ...email.metadata,
          successCount,
          failureCount,
          totalRecipients: recipients.length,
          processedAt: new Date().toISOString()
        }
      });

      console.log(`Scheduled email ${email.id} processed: ${successCount} sent, ${failureCount} failed`);

    } catch (error) {
      console.error(`Failed to process scheduled email ${email.id}:`, error);
      
      // Mark as failed
      await storage.updateScheduledEmail(email.id, {
        status: 'failed',
        errorMessage: error.message,
        metadata: {
          ...email.metadata,
          failedAt: new Date().toISOString(),
          error: error.message
        }
      });
    }
  }

  /**
   * Get recipients based on target audience configuration
   */
  private async getRecipients(targetAudience: any): Promise<any[]> {
    if (!targetAudience) {
      return [];
    }

    const recipients: any[] = [];

    // Handle different target audience types
    if (typeof targetAudience === 'string') {
      // Simple string target (legacy format)
      if (targetAudience === 'Customers') {
        const customers = await storage.getCustomers();
        recipients.push(...customers.map(c => ({
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          name: c.name,
          company: c.company
        })));
      } else if (targetAudience === 'Leads') {
        const leads = await storage.getLeads();
        recipients.push(...leads.filter(l => l.email).map(l => ({
          email: l.email!,
          firstName: l.name?.split(' ')[0] || '',
          lastName: l.name?.split(' ').slice(1).join(' ') || '',
          name: l.name,
          company: l.company
        })));
      }
    } else if (typeof targetAudience === 'object') {
      // Advanced targeting with filters
      if (targetAudience.type === 'Leads') {
        let leads = await storage.getLeads();
        
        // Apply filters
        if (targetAudience.filters) {
          if (targetAudience.filters.source) {
            leads = leads.filter(l => l.leadSource === targetAudience.filters.source);
          }
          if (targetAudience.filters.status) {
            leads = leads.filter(l => l.leadStatus === targetAudience.filters.status);
          }
        }
        
        recipients.push(...leads.filter(l => l.email).map(l => ({
          email: l.email!,
          firstName: l.name?.split(' ')[0] || '',
          lastName: l.name?.split(' ').slice(1).join(' ') || '',
          name: l.name,
          company: l.company
        })));
      } else if (targetAudience.type === 'Customers') {
        const customers = await storage.getCustomers();
        recipients.push(...customers.map(c => ({
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          name: c.name,
          company: c.company
        })));
      }
    }

    return recipients.filter(r => r.email); // Ensure all recipients have email addresses
  }

  /**
   * Manually trigger processing (for testing)
   */
  async triggerProcessing() {
    await this.processScheduledEmails();
  }
}

// Export singleton instance
export const emailScheduler = new EmailScheduler();