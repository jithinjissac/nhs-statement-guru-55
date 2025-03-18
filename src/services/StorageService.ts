
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export type Guideline = {
  id: string;
  title: string;
  content: string;
  dateAdded: string;
};

export type SampleStatement = {
  id: string;
  title: string;
  content: string;
  category: string;
  dateAdded: string;
};

export type ApiKey = {
  id: string;
  name: string;
  key: string;
  active: boolean;
};

export class StorageService {
  /**
   * Save a guideline to Supabase
   */
  static async saveGuideline(guideline: Guideline): Promise<void> {
    try {
      if (!guideline.id) {
        guideline.id = uuidv4();
      }
      
      // Format the data properly for Supabase upsert
      const { error } = await supabase
        .from('rules')
        .upsert({
          id: guideline.id,
          title: guideline.title,
          content: guideline.content,
          created_at: guideline.dateAdded ? guideline.dateAdded : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Adding required fields
          created_by: guideline.id, // This is a workaround as we don't have auth yet
          file_name: null,
          file_url: null
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving guideline:', error);
      throw error;
    }
  }
  
  /**
   * Get all guidelines from Supabase
   */
  static async getGuidelines(): Promise<Guideline[]> {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        dateAdded: item.created_at
      }));
    } catch (error) {
      console.error('Failed to fetch guidelines:', error);
      return [];
    }
  }
  
  /**
   * Delete a guideline from Supabase
   */
  static async deleteGuideline(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting guideline:', error);
      throw error;
    }
  }
  
  /**
   * Save a sample statement to Supabase
   */
  static async saveSampleStatement(sample: SampleStatement): Promise<void> {
    try {
      if (!sample.id) {
        sample.id = uuidv4();
      }
      
      // Format the data properly for Supabase upsert
      const { error } = await supabase
        .from('sample_statements')
        .upsert({
          id: sample.id,
          title: sample.title,
          content: sample.content,
          // Adding required fields
          created_at: sample.dateAdded ? sample.dateAdded : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: sample.id // This is a workaround as we don't have auth yet
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving sample statement:', error);
      throw error;
    }
  }
  
  /**
   * Get all sample statements from Supabase
   */
  static async getSampleStatements(): Promise<SampleStatement[]> {
    try {
      const { data, error } = await supabase
        .from('sample_statements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: 'general', // Since category doesn't exist in the table, we set a default
        dateAdded: item.created_at
      }));
    } catch (error) {
      console.error('Failed to fetch sample statements:', error);
      return [];
    }
  }
  
  /**
   * Delete a sample statement from Supabase
   */
  static async deleteSampleStatement(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('sample_statements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting sample statement:', error);
      throw error;
    }
  }
  
  /**
   * Save an API key - prioritizing local storage as more reliable
   * instead of dealing with Supabase policy issues
   */
  static async saveApiKey(provider: string, keyValue: string): Promise<void> {
    try {
      if (!keyValue.trim()) return;
      
      // Use local storage as primary storage - this is critical
      this.saveApiKeyToLocalStorage(provider, keyValue);
      console.log(`Successfully saved ${provider} API key to local storage`);
      
      // Attempt Supabase as secondary, but don't rely on it succeeding
      try {
        const id = uuidv4();
        const { error } = await supabase
          .from('api_keys')
          .insert({
            id: id,
            name: provider,
            key: keyValue,
            active: true,
            created_by: 'system' // Set a default value to satisfy the schema
          });
        
        if (error) {
          console.warn(`Non-critical DB error saving API key: ${error.message}`);
        } else {
          console.log(`Successfully saved ${provider} API key to database as backup`);
        }
      } catch (dbError) {
        console.warn(`Non-critical database error saving API key: ${dbError}. Using local storage.`);
      }
    } catch (error) {
      console.error('Error in saveApiKey:', error);
      // Ensure key is always saved to local storage even if there's an error
      this.saveApiKeyToLocalStorage(provider, keyValue);
    }
  }
  
  /**
   * Save API key to local storage
   */
  private static saveApiKeyToLocalStorage(provider: string, keyValue: string): void {
    try {
      // Get existing keys from localStorage
      const existingKeysJSON = localStorage.getItem('api_keys');
      const existingKeys = existingKeysJSON ? JSON.parse(existingKeysJSON) : {};
      
      // Update with new key
      existingKeys[provider.toLowerCase()] = keyValue;
      
      // Save back to localStorage
      localStorage.setItem('api_keys', JSON.stringify(existingKeys));
      console.log(`Saved ${provider} API key to local storage`);
    } catch (error) {
      console.error('Error saving API key to local storage:', error);
    }
  }
  
  /**
   * Get all API keys - prioritizing local storage for reliability
   */
  static async getApiKeys(): Promise<Record<string, string>> {
    console.log("Getting API keys from storage");
    try {
      // Always get from localStorage first as primary source
      const localKeys = this.getApiKeysFromLocalStorage();
      console.log("Local storage keys found:", Object.keys(localKeys));
      
      // Try to get from Supabase as additional source, but don't block on error
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('active', true);
        
        if (error) {
          console.warn(`Non-critical DB error getting API keys: ${error.message}. Using only local storage.`);
          return localKeys;
        }
        
        // Merge keys from database with local keys
        const dbKeys: Record<string, string> = {};
        (data || []).forEach(item => {
          dbKeys[item.name.toLowerCase()] = item.key;
        });
        console.log("Database keys found:", Object.keys(dbKeys));
        
        // Local keys take precedence over DB keys (more likely to be up-to-date)
        return { ...dbKeys, ...localKeys };
      } catch (dbError) {
        console.warn(`Non-critical database error getting API keys: ${dbError}. Using only local storage.`);
        return localKeys;
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      return this.getApiKeysFromLocalStorage();
    }
  }
  
  /**
   * Get API keys from local storage - exposed as public for direct use
   */
  static getApiKeysFromLocalStorage(): Record<string, string> {
    try {
      const keysJSON = localStorage.getItem('api_keys');
      const keys = keysJSON ? JSON.parse(keysJSON) : {};
      console.log("Keys from local storage:", Object.keys(keys));
      return keys;
    } catch (error) {
      console.error('Error reading API keys from local storage:', error);
      return {};
    }
  }
  
  /**
   * Save settings to local storage (keeping this in local storage as it's user-specific)
   */
  static saveSettings(settings: Record<string, any>): void {
    localStorage.setItem('nhs_statement_settings', JSON.stringify(settings));
  }
  
  /**
   * Get settings from local storage
   */
  static getSettings(): Record<string, any> {
    const storedData = localStorage.getItem('nhs_statement_settings');
    if (!storedData) return {};
    
    try {
      return JSON.parse(storedData);
    } catch (error) {
      console.error('Failed to parse settings:', error);
      return {};
    }
  }
}
