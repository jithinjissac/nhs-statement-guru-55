
import { StorageService } from '../StorageService';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/AuthContext';

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
    
    // Try authenticated storage service
    try {
      const { data: authData } = await supabase.auth.getSession();
      const isAuthenticated = !!authData.session;
      
      if (isAuthenticated) {
        console.log(`User is authenticated, trying to get ${provider} API key from database`);
        const storedApiKey = await StorageService.getApiKeys();
        if (storedApiKey && storedApiKey[provider]) {
          console.log(`Using ${provider} API key from storage service`);
          return storedApiKey[provider];
        }
      } else {
        console.log(`User is not authenticated, skipping database API key lookup`);
      }
    } catch (storageError) {
      console.warn(`Error getting API key from storage service for ${provider}:`, storageError);
    }
    
    // Check environment variables as last resort
    const envKey = import.meta.env[`VITE_${provider.toUpperCase()}_API_KEY`];
    if (envKey) {
      console.log(`Using ${provider} API key from environment variables`);
      // Store for future use
      try {
        await StorageService.saveApiKey(provider, envKey);
      } catch (saveError) {
        console.warn(`Failed to save ${provider} API key from environment:`, saveError);
      }
      return envKey;
    }
    
    // Check Supabase edge function secrets as a final option
    try {
      const { data, error } = await StorageService.getSecretFromSupabase(`${provider.toUpperCase()}_API_KEY`);
      if (!error && data && data.value) {
        console.log(`Using ${provider} API key from Supabase secrets`);
        // Store for future use
        try {
          await StorageService.saveApiKey(provider, data.value);
        } catch (saveError) {
          console.warn(`Failed to save ${provider} API key from Supabase secret:`, saveError);
        }
        return data.value;
      }
    } catch (secretError) {
      console.warn(`Error checking Supabase secrets for ${provider} API key:`, secretError);
    }
    
    toast.error(`${provider} API key not set. Please set it in the Settings page.`, {
      duration: 6000,
      action: {
        label: "Go to Settings",
        onClick: () => window.location.href = "/admin/settings"
      }
    });
    
    throw new Error(`${provider} API key not set. Please set it in the Settings page.`);
  }
  
  /**
   * Validates if an API key for the specified provider is set
   */
  static async isApiKeySet(provider: string): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey(provider);
      return !!apiKey;
    } catch (error) {
      return false;
    }
  }
}
