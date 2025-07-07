/**
 * Domain Enforcement Service
 * Provides comprehensive domain validation and user guidance
 */

import { PRIMARY_EMAIL_DOMAIN } from './email-domain-service';

export interface DomainValidationResult {
  isValid: boolean;
  error?: string;
  userGuidance?: string;
}

/**
 * Validate domain configuration and provide user guidance
 */
export function validateDomainConfiguration(
  userDomain: string,
  apiKeyDomain?: string
): DomainValidationResult {
  // Check if user's configured domain is correct
  if (userDomain !== PRIMARY_EMAIL_DOMAIN) {
    return {
      isValid: false,
      error: `Invalid domain configuration: ${userDomain}`,
      userGuidance: `Your domain must be ${PRIMARY_EMAIL_DOMAIN}. Please update your domain configuration.`
    };
  }

  // Check if API key domain matches (if provided)
  if (apiKeyDomain && apiKeyDomain !== PRIMARY_EMAIL_DOMAIN) {
    if (apiKeyDomain.includes('sandbox')) {
      return {
        isValid: false,
        error: `Sandbox domain detected: ${apiKeyDomain}`,
        userGuidance: `Your Mailgun API key is associated with a sandbox domain (${apiKeyDomain}). To use AICRM, you need to:
1. Add ${PRIMARY_EMAIL_DOMAIN} to your Mailgun account
2. Generate a new API key for ${PRIMARY_EMAIL_DOMAIN}
3. Update your configuration with the new API key`
      };
    }

    return {
      isValid: false,
      error: `API key domain mismatch: ${apiKeyDomain}`,
      userGuidance: `Your Mailgun API key is associated with ${apiKeyDomain}, but AICRM requires ${PRIMARY_EMAIL_DOMAIN}. Please ensure your API key is for the correct domain.`
    };
  }

  return {
    isValid: true
  };
}

/**
 * Get detailed setup instructions for users
 */
export function getMailgunSetupInstructions(): string {
  return `
To use your personal Mailgun API key with AICRM:

1. Log into your Mailgun account (https://app.mailgun.com)
2. Go to the Domains section
3. Add ${PRIMARY_EMAIL_DOMAIN} as a new domain
4. Complete the DNS verification process
5. Go to the API Keys section
6. Generate a new API key for ${PRIMARY_EMAIL_DOMAIN}
7. Use this new API key in your AICRM settings

Note: Sandbox domains are not supported in production.
`;
}