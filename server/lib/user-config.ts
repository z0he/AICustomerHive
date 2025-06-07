import { storage } from "../storage";

/**
 * Service for managing user-specific API configurations
 */
export class UserConfigService {
  
  /**
   * Get user's OpenAI API key
   */
  static async getUserOpenAIKey(userId: number): Promise<string | null> {
    try {
      const config = await storage.getUserConfiguration(userId, 'openai');
      return config?.configData?.apiKey || null;
    } catch (error) {
      console.error('Error getting user OpenAI config:', error);
      return null;
    }
  }

  /**
   * Save user's OpenAI API key
   */
  static async saveUserOpenAIKey(userId: number, apiKey: string): Promise<boolean> {
    try {
      await storage.updateUserConfiguration(userId, 'openai', { apiKey });
      return true;
    } catch (error) {
      console.error('Error saving user OpenAI config:', error);
      return false;
    }
  }

  /**
   * Get user's Mailgun configuration
   */
  static async getUserMailgunConfig(userId: number): Promise<{ apiKey: string; domain: string } | null> {
    try {
      const config = await storage.getUserConfiguration(userId, 'mailgun');
      if (config?.configData?.apiKey && config?.configData?.domain) {
        return {
          apiKey: config.configData.apiKey,
          domain: config.configData.domain
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user Mailgun config:', error);
      return null;
    }
  }

  /**
   * Save user's Mailgun configuration
   */
  static async saveUserMailgunConfig(userId: number, apiKey: string, domain: string): Promise<boolean> {
    try {
      await storage.updateUserConfiguration(userId, 'mailgun', { apiKey, domain });
      return true;
    } catch (error) {
      console.error('Error saving user Mailgun config:', error);
      return false;
    }
  }

  /**
   * Check if user has OpenAI configured
   */
  static async hasUserOpenAI(userId: number): Promise<boolean> {
    const apiKey = await this.getUserOpenAIKey(userId);
    return apiKey !== null && apiKey.trim() !== '' && !apiKey.includes('demo') && !apiKey.includes('placeholder');
  }

  /**
   * Check if user has Mailgun configured
   */
  static async hasUserMailgun(userId: number): Promise<boolean> {
    const config = await this.getUserMailgunConfig(userId);
    return config !== null && config.apiKey.trim() !== '' && config.domain.trim() !== '';
  }

  /**
   * Delete user's configuration
   */
  static async deleteUserConfig(userId: number, configType: string): Promise<boolean> {
    try {
      return await storage.deleteUserConfiguration(userId, configType);
    } catch (error) {
      console.error('Error deleting user config:', error);
      return false;
    }
  }
}