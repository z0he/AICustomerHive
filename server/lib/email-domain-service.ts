/**
 * Email Domain Service
 * Enforces the use of mail.aicrm.co.uk domain for all outbound emails
 * Prevents sandbox domain usage in production
 */

// Primary domain for all outbound emails
export const PRIMARY_EMAIL_DOMAIN = 'mail.aicrm.co.uk';

// System sender email
export const SYSTEM_SENDER_EMAIL = `noreply@${PRIMARY_EMAIL_DOMAIN}`;

/**
 * Validate if a domain is allowed for sending emails
 */
export function isValidEmailDomain(domain: string): boolean {
  // Allow primary domain
  if (domain === PRIMARY_EMAIL_DOMAIN) {
    return true;
  }
  
  // In development, allow localhost testing
  if (process.env.NODE_ENV === 'development' && domain.includes('sandbox')) {
    console.warn(`Using sandbox domain ${domain} in development mode only`);
    return true;
  }
  
  // Block sandbox domains in production
  if (domain.includes('sandbox') && process.env.NODE_ENV === 'production') {
    console.error(`Sandbox domain ${domain} not allowed in production`);
    return false;
  }
  
  return false;
}

/**
 * Get the appropriate domain for email sending
 * Always returns the primary domain unless in development with sandbox
 */
export function getEmailDomain(userDomain?: string): string {
  // If user provided a custom domain, validate it
  if (userDomain) {
    if (isValidEmailDomain(userDomain)) {
      return userDomain;
    } else {
      console.warn(`Invalid domain ${userDomain}, falling back to primary domain`);
    }
  }
  
  return PRIMARY_EMAIL_DOMAIN;
}

/**
 * Ensure the 'from' email address uses the correct domain
 */
export function normalizeFromEmail(fromEmail: string, domain?: string): string {
  const emailDomain = getEmailDomain(domain);
  
  // Extract username from email if provided
  const emailParts = fromEmail.split('@');
  const username = emailParts[0] || 'noreply';
  
  // Return normalized email with correct domain
  return `${username}@${emailDomain}`;
}

/**
 * Validate email configuration before sending
 */
export function validateEmailConfig(config: {
  from: string;
  domain?: string;
  apiKey?: string;
}): { isValid: boolean; error?: string; normalizedFrom?: string } {
  const emailDomain = getEmailDomain(config.domain);
  
  // Validate domain
  if (!isValidEmailDomain(emailDomain)) {
    return {
      isValid: false,
      error: `Invalid email domain: ${emailDomain}. All emails must use ${PRIMARY_EMAIL_DOMAIN}`
    };
  }
  
  // Normalize from email
  const normalizedFrom = normalizeFromEmail(config.from, emailDomain);
  
  return {
    isValid: true,
    normalizedFrom
  };
}