import formData from 'form-data';
import Mailgun from 'mailgun.js';

if (!process.env.MAILGUN_API_KEY) {
  console.warn("MAILGUN_API_KEY environment variable is not set");
}

if (!process.env.MAILGUN_DOMAIN) {
  console.warn("MAILGUN_DOMAIN environment variable is not set");
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
}

/**
 * Send an email using Mailgun with custom credentials if provided
 */
export async function sendEmail(params: EmailParams, customCredentials?: { apiKey: string; domain: string }): Promise<{ success: boolean; mailgunId?: string; error?: string }> {
  let mailgunClient = mg;
  let domain = process.env.MAILGUN_DOMAIN;

  // Use custom credentials if provided (for user-specific configs)
  if (customCredentials) {
    const customMailgun = new Mailgun(formData);
    mailgunClient = customMailgun.client({ username: 'api', key: customCredentials.apiKey });
    domain = customCredentials.domain;
    console.log('Using custom Mailgun credentials for domain:', customCredentials.domain);
  } else if (!mg || !process.env.MAILGUN_DOMAIN) {
    console.error('Mailgun client not initialized. Check your API key and domain.');
    return { success: false, error: 'Mailgun client not initialized' };
  }

  try {
    // Ensure text field is always provided (Mailgun requires it)
    const messageParams = {
      ...params,
      text: params.text || params.html || ' ', // Use empty space as fallback if neither text nor html provided
      'o:tracking': 'no', // Disable open tracking
      'o:tracking-clicks': 'no', // Disable click tracking
      'o:tracking-opens': 'no' // Disable open tracking (alternative syntax)
    };
    
    const result = await mailgunClient.messages.create(domain, messageParams);
    console.log('Email sent successfully:', result);
    
    // Return both success status and Mailgun ID for tracking
    return { success: true, mailgunId: result.id };
  } catch (error) {
    console.error('Mailgun email error:', error);
    
    // Check for sandbox domain activation error
    if (error.status === 403 && error.details && error.details.includes('Please activate your Mailgun account')) {
      throw new Error('Mailgun account needs activation. Please check your email for the activation link from Mailgun or log in to your Mailgun control panel to activate your account.');
    }
    
    // Check for sandbox domain recipient verification error
    if (error.status === 403 && error.details && error.details.includes('not authorized to send')) {
      throw new Error('Mailgun sandbox domains only allow sending to verified recipients. Please authorize the recipient email in your Mailgun console or upgrade to a paid account.');
    }
    
    return { success: false, error: error.message };
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
): Promise<boolean> {
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