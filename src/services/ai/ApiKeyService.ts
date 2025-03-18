
import { StorageService } from '../StorageService';

export class ApiKeyService {
  /**
   * Retrieves the API key for a specified provider
   */
  static async getApiKey(provider: string): Promise<string> {
    let apiKey;
    
    // Try local storage first (most reliable source)
    try {
      const localStorageKeys = StorageService.getApiKeysFromLocalStorage() || {};
      if (localStorageKeys[provider]) {
        console.log(`Using ${provider} API key from local storage`);
        return localStorageKeys[provider];
      }
    } catch (error) {
      console.warn(`Error accessing local storage for ${provider} API key:`, error);
    }
    
    // Try storage service as fallback
    try {
      const storedApiKey = await StorageService.getApiKeys();
      if (storedApiKey && storedApiKey[provider]) {
        console.log(`Using ${provider} API key from storage service`);
        return storedApiKey[provider];
      }
    } catch (storageError) {
      console.warn(`Error getting API key from storage service for ${provider}:`, storageError);
    }
    
    // Check environment variables as last resort
    const envKey = import.meta.env[`VITE_${provider.toUpperCase()}_API_KEY`];
    if (envKey) {
      console.log(`Using ${provider} API key from environment variables`);
      // Store for future use
      await StorageService.saveApiKey(provider, envKey);
      return envKey;
    }
    
    throw new Error(`${provider} API key not set. Please set it in the Settings page.`);
  }
}
