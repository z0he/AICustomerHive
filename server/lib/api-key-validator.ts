/**
 * API Key Validator Service
 * Validates OpenAI and Mailgun API keys in real-time
 */

import formData from 'form-data';
import Mailgun from 'mailgun.js';

/**
 * Validate OpenAI API key by making a test request
 */
export async function validateOpenAIKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return { isValid: false, error: 'Invalid API key format' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { isValid: true };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key or insufficient permissions' };
    } else {
      return { isValid: false, error: `API validation failed with status ${response.status}` };
    }
  } catch (error) {
    return { isValid: false, error: 'Failed to validate API key - network error' };
  }
}

/**
 * Validate Mailgun API key and domain by making a test request
 */
export async function validateMailgunKey(apiKey: string, domain: string): Promise<{ isValid: boolean; error?: string }> {
  if (!apiKey || !apiKey.startsWith('key-')) {
    return { isValid: false, error: 'Invalid Mailgun API key format' };
  }

  if (!domain) {
    return { isValid: false, error: 'Domain is required' };
  }

  // Import domain validation functions
  const { isValidEmailDomain, PRIMARY_EMAIL_DOMAIN } = await import('./email-domain-service');
  
  // First check if domain is allowed
  if (!isValidEmailDomain(domain)) {
    return { 
      isValid: false, 
      error: `Invalid domain. Only ${PRIMARY_EMAIL_DOMAIN} is allowed. Please ensure your Mailgun API key is associated with ${PRIMARY_EMAIL_DOMAIN}.` 
    };
  }

  try {
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ username: 'api', key: apiKey });

    // Test by getting domain information
    const result = await mg.domains.get(domain);
    
    if (result) {
      return { isValid: true };
    } else {
      return { isValid: false, error: 'Domain not found or inaccessible' };
    }
  } catch (error: any) {
    if (error?.status === 401) {
      return { isValid: false, error: 'Invalid Mailgun API key' };
    } else if (error?.status === 404) {
      return { isValid: false, error: `Domain not found in your Mailgun account. Please ensure you have ${PRIMARY_EMAIL_DOMAIN} added to your Mailgun account.` };
    } else {
      return { isValid: false, error: `Mailgun validation failed: ${error?.message || 'Unknown error'}` };
    }
  }
}

/**
 * Health check for user's personal API keys
 */
export async function performAPIHealthCheck(userId: number, keys: {
  openaiKey?: string;
  mailgunKey?: string;
  mailgunDomain?: string;
}): Promise<{
  openai: { isValid: boolean; error?: string };
  mailgun: { isValid: boolean; error?: string };
}> {
  const results = {
    openai: { isValid: false },
    mailgun: { isValid: false }
  };

  // Validate OpenAI key if provided
  if (keys.openaiKey) {
    results.openai = await validateOpenAIKey(keys.openaiKey);
  }

  // Validate Mailgun key if provided
  if (keys.mailgunKey && keys.mailgunDomain) {
    results.mailgun = await validateMailgunKey(keys.mailgunKey, keys.mailgunDomain);
  }

  return results;
}