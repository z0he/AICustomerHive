import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { getEmailDomain, validateEmailConfig, PRIMARY_EMAIL_DOMAIN } from './email-domain-service';

if (!process.env.MAILGUN_API_KEY) {
  console.warn("MAILGUN_API_KEY environment variable is not set");
}

if (!process.env.MAILGUN_DOMAIN) {
  console.warn("MAILGUN_DOMAIN environment variable is not set, using default domain");
  process.env.MAILGUN_DOMAIN = PRIMARY_EMAIL_DOMAIN;
}

// Initialize Mailgun with API key
const mailgun = new Mailgun(formData);
let mg = process.env.MAILGUN_API_KEY ? 
  mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY }) : 
  null;

/**
 * Reinitialize the Mailgun client with updated credentials
 */
export function reinitializeMailgunClient(): void {
  if (process.env.MAILGUN_API_KEY) {
    mg = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY });
    console.log("Mailgun client reinitialized with new API key");
  } else {
    mg = null;
    console.warn("Cannot reinitialize Mailgun client: API key not set");
  }
}

interface EmailParams {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  'h:X-Mailgun-Variables'?: string;
  attachment?: any[];
  [key: string]: any; // Allow additional tracking options
}

/**
 * Send an email using Mailgun with custom credentials if provided
 */
export async function sendEmail(params: EmailParams, customCredentials?: { apiKey: string; domain: string }): Promise<{ success: boolean; mailgunId?: string; error?: string }> {
  // Validate and normalize email configuration
  const validation = validateEmailConfig({
    from: params.from,
    domain: customCredentials?.domain || process.env.MAILGUN_DOMAIN,
    apiKey: customCredentials?.apiKey || process.env.MAILGUN_API_KEY
  });

  if (!validation.isValid) {
    console.error('Email configuration validation failed:', validation.error);
    return { success: false, error: validation.error };
  }

  // Use the validated domain and normalized from address
  const emailDomain = getEmailDomain(customCredentials?.domain);
  
  // Double-check domain is correct
  if (emailDomain !== PRIMARY_EMAIL_DOMAIN) {
    console.error(`Invalid email domain: ${emailDomain}. Only ${PRIMARY_EMAIL_DOMAIN} is allowed.`);
    return { success: false, error: `Invalid email domain. Only ${PRIMARY_EMAIL_DOMAIN} is allowed.` };
  }
  
  const normalizedParams = {
    ...params,
    from: validation.normalizedFrom || params.from
  };

  let mailgunClient = mg;

  // Use custom credentials if provided (for user-specific configs)
  if (customCredentials) {
    const customMailgun = new Mailgun(formData);
    mailgunClient = customMailgun.client({ username: 'api', key: customCredentials.apiKey });
    console.log('Using custom Mailgun credentials for domain:', emailDomain);
  } else if (!mg || !process.env.MAILGUN_DOMAIN) {
    console.error('Mailgun client not initialized. Check your API key and domain.');
    return { success: false, error: 'Mailgun client not initialized' };
  }

  try {
    if (!mailgunClient) {
      return { success: false, error: 'Mailgun client not initialized' };
    }

    // Ensure text field is always provided (Mailgun requires it)
    const messageParams: any = {
      ...normalizedParams,
      text: normalizedParams.text || normalizedParams.html || ' ', // Use empty space as fallback if neither text nor html provided
      'o:tracking': 'no', // Disable open tracking
      'o:tracking-clicks': 'no', // Disable click tracking
      'o:tracking-opens': 'no' // Disable open tracking (alternative syntax)
    };

    // Remove undefined template to avoid Mailgun API issues
    if (!messageParams.template) {
      delete messageParams.template;
    }
    
    const result = await (mailgunClient as any).messages.create(emailDomain, messageParams);
    console.log('Email sent successfully to domain:', emailDomain, 'Result:', result);
    
    // Return both success status and Mailgun ID for tracking
    return { success: true, mailgunId: result.id };
  } catch (error: any) {
    console.error('Mailgun email error:', error);
    
    // Check for sandbox domain activation error
    if (error?.status === 403 && error?.details && error.details.includes('Please activate your Mailgun account')) {
      throw new Error('Mailgun account needs activation. Please check your email for the activation link from Mailgun or log in to your Mailgun control panel to activate your account.');
    }
    
    // Check for sandbox domain recipient verification error
    if (error?.status === 403 && error?.details && error.details.includes('not authorized to send')) {
      throw new Error('Mailgun sandbox domains only allow sending to verified recipients. Please authorize the recipient email in your Mailgun console or upgrade to a paid account.');
    }
    
    return { success: false, error: error?.message || 'Unknown error occurred' };
  }
}

/**
 * Send an email using a template
 */
export async function sendTemplateEmail(
  to: string,
  from: string,
  subject: string,
  templateVariables: Record<string, any>,
  templateName: string
): Promise<{ success: boolean; mailgunId?: string; error?: string }> {
  return sendEmail({
    to,
    from,
    subject,
    text: "This email contains HTML content. Please use an email client that supports HTML to view it properly.",
    template: templateName,
    'h:X-Mailgun-Variables': JSON.stringify(templateVariables)
  });
}

/**
 * Check if Mailgun is properly configured
 */
export function isMailgunConfigured(): boolean {
  return !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN && mg);
}