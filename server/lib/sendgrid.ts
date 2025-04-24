import { MailService } from '@sendgrid/mail';

// Setup SendGrid mail service
let mailService: MailService | null = null;

/**
 * Initialize the SendGrid mail service with API key
 */
export function initSendGrid(apiKey?: string): boolean {
  const key = apiKey || process.env.SENDGRID_API_KEY;
  
  if (!key) {
    console.warn('SendGrid API key not provided. Email sending will be unavailable.');
    return false;
  }
  
  try {
    mailService = new MailService();
    mailService.setApiKey(key);
    return true;
  } catch (error) {
    console.error('Failed to initialize SendGrid:', error);
    mailService = null;
    return false;
  }
}

export interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  attachments?: {
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }[];
  categories?: string[];
  customArgs?: Record<string, string>;
}

/**
 * Send email using SendGrid API
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!mailService) {
    if (!initSendGrid()) {
      console.error('SendGrid not initialized. Cannot send email.');
      return false;
    }
  }
  
  try {
    await mailService!.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
      templateId: params.templateId,
      dynamicTemplateData: params.dynamicTemplateData,
      attachments: params.attachments,
      categories: params.categories,
      customArgs: params.customArgs
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Check if SendGrid is properly initialized
 */
export function isSendGridInitialized(): boolean {
  return mailService !== null;
}