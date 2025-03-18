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
   * Save an API key to Supabase
   */
  static async saveApiKey(provider: string, keyValue: string): Promise<void> {
    try {
      if (!keyValue.trim()) return;
      
      // Generate a unique ID if not provided
      const id = uuidv4();
      
      // Try to find an existing API key for this provider
      const { data: existingKeys } = await supabase
        .from('api_keys')
        .select('*')
        .eq('name', provider);
      
      if (existingKeys && existingKeys.length > 0) {
        // Update existing key
        const { error } = await supabase
          .from('api_keys')
          .update({
            key: keyValue,
            updated_at: new Date().toISOString()
          })
          .eq('name', provider);
        
        if (error) throw error;
      } else {
        // Insert new key
        const { error } = await supabase
          .from('api_keys')
          .insert({
            id: id,
            name: provider,
            key: keyValue,
            active: true,
            created_by: id // This is a workaround as we don't have auth yet
          });
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      throw error;
    }
  }
  
  /**
   * Get all API keys from Supabase
   */
  static async getApiKeys(): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('active', true);
      
      if (error) throw error;
      
      // Convert to record object
      const keys: Record<string, string> = {};
      (data || []).forEach(item => {
        keys[item.name.toLowerCase()] = item.key;
      });
      
      return keys;
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
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
