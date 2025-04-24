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
const mg = process.env.MAILGUN_API_KEY ? 
  mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY }) : 
  null;

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
 * Send an email using Mailgun
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!mg || !process.env.MAILGUN_DOMAIN) {
    console.error('Mailgun client not initialized. Check your API key and domain.');
    return false;
  }

  try {
    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN, params);
    console.log('Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Mailgun email error:', error);
    return false;
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