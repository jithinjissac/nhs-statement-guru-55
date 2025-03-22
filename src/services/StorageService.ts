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
   * Save a guideline to Supabase and local storage
   * Prioritizing local storage for reliability
   */
  static async saveGuideline(guideline: Guideline): Promise<void> {
    try {
      if (!guideline.id) {
        guideline.id = uuidv4();
      }
      
      // Always save to local storage first for reliability
      this.saveGuidelineToLocalStorage(guideline);
      console.log(`Successfully saved guideline "${guideline.title}" to local storage`);
      
      // Attempt to save to Supabase as backup, but don't block or fail if it doesn't work
      try {
        const { error } = await supabase
          .from('rules')
          .upsert({
            id: guideline.id,
            title: guideline.title,
            content: guideline.content,
            created_at: guideline.dateAdded ? guideline.dateAdded : new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: guideline.id, // This is a workaround as we don't have auth yet
            file_name: null,
            file_url: null
          });
        
        if (error) {
          console.warn(`Non-critical database error saving guideline: ${error.message}. Using local storage only.`);
        } else {
          console.log(`Successfully saved guideline "${guideline.title}" to database as backup`);
        }
      } catch (dbError) {
        console.warn(`Non-critical database error saving guideline: ${dbError}. Using local storage only.`);
      }
    } catch (error) {
      console.error('Error saving guideline:', error);
      // Emergency fallback to ensure it's always saved somewhere
      this.saveGuidelineToLocalStorage(guideline);
      throw error;
    }
  }
  
  /**
   * Save guideline to local storage
   */
  private static saveGuidelineToLocalStorage(guideline: Guideline): void {
    try {
      // Get existing guidelines
      const existingGuidelinesJSON = localStorage.getItem('nhs_guidelines');
      const existingGuidelines: Guideline[] = existingGuidelinesJSON 
        ? JSON.parse(existingGuidelinesJSON) 
        : [];
      
      // Check if guideline already exists
      const index = existingGuidelines.findIndex(g => g.id === guideline.id);
      
      if (index >= 0) {
        // Update existing
        existingGuidelines[index] = guideline;
      } else {
        // Add new
        existingGuidelines.push(guideline);
      }
      
      // Save back to localStorage
      localStorage.setItem('nhs_guidelines', JSON.stringify(existingGuidelines));
      console.log(`Saved guideline "${guideline.title}" to local storage`);
    } catch (error) {
      console.error('Error saving guideline to local storage:', error);
    }
  }
  
  /**
   * Get all guidelines - prioritizing local storage for reliability
   */
  static async getGuidelines(): Promise<Guideline[]> {
    try {
      // Always get from localStorage first as reliable source
      const localGuidelines = this.getGuidelinesFromLocalStorage();
      console.log(`Found ${localGuidelines.length} guidelines in local storage`);
      
      // Try to get from Supabase as additional source, but don't block on error
      try {
        const { data, error } = await supabase
          .from('rules')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn(`Non-critical database error getting guidelines: ${error.message}. Using local storage only.`);
          return localGuidelines;
        }
        
        // Convert DB format to app format
        const dbGuidelines = (data || []).map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          dateAdded: item.created_at
        }));
        
        // Merge guidelines from both sources
        // Create a map for quick lookup
        const guidelinesMap = new Map<string, Guideline>();
        
        // Add DB guidelines first
        dbGuidelines.forEach(guideline => {
          guidelinesMap.set(guideline.id, guideline);
        });
        
        // Local guidelines override DB ones if they exist
        localGuidelines.forEach(guideline => {
          guidelinesMap.set(guideline.id, guideline);
        });
        
        // Convert back to array
        const mergedGuidelines = Array.from(guidelinesMap.values());
        
        // Sort by date (newest first)
        mergedGuidelines.sort((a, b) => {
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        });
        
        // Update local storage with merged results to keep them in sync
        localStorage.setItem('nhs_guidelines', JSON.stringify(mergedGuidelines));
        
        return mergedGuidelines;
      } catch (dbError) {
        console.warn(`Non-critical database error getting guidelines: ${dbError}. Using local storage only.`);
        return localGuidelines;
      }
    } catch (error) {
      console.error('Failed to fetch guidelines:', error);
      // Fall back to local storage in case of any error
      return this.getGuidelinesFromLocalStorage();
    }
  }
  
  /**
   * Get guidelines from local storage
   */
  private static getGuidelinesFromLocalStorage(): Guideline[] {
    try {
      const guidelinesJSON = localStorage.getItem('nhs_guidelines');
      if (!guidelinesJSON) {
        console.log('No guidelines found in local storage, using defaults');
        return this.getDefaultGuidelines();
      }
      
      const guidelines: Guideline[] = JSON.parse(guidelinesJSON);
      console.log(`Found ${guidelines.length} guidelines in local storage`);
      return guidelines;
    } catch (error) {
      console.error('Error reading guidelines from local storage:', error);
      return this.getDefaultGuidelines();
    }
  }
  
  /**
   * Provide default guidelines if none exist
   */
  private static getDefaultGuidelines(): Guideline[] {
    return [
      {
        id: uuidv4(),
        title: 'NHS Statement Structure',
        content: 'A well-structured NHS supporting statement should include an introduction explaining your interest in the role, followed by sections that address your relevant skills and experience. Match your achievements to the person specification, using the STAR method (Situation, Task, Action, Result) for examples. Conclude by summarizing your suitability and enthusiasm for the position.',
        dateAdded: new Date().toISOString()
      },
      {
        id: uuidv4(),
        title: 'NHS Values Integration',
        content: "Always reference the NHS Constitution values in your statement: respect and dignity, commitment to quality of care, compassion, improving lives, working together for patients, and everyone counts. Provide concrete examples of how you've demonstrated these values in your work.",
        dateAdded: new Date().toISOString()
      }
    ];
  }
  
  /**
   * Delete a guideline - prioritizing local storage for reliability
   */
  static async deleteGuideline(id: string): Promise<void> {
    try {
      // Delete from local storage first for immediate user feedback
      this.deleteGuidelineFromLocalStorage(id);
      console.log(`Deleted guideline ${id} from local storage`);
      
      // Try to delete from Supabase as well, but don't block if it fails
      try {
        const { error } = await supabase
          .from('rules')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.warn(`Non-critical database error deleting guideline: ${error.message}`);
        } else {
          console.log(`Successfully deleted guideline ${id} from database`);
        }
      } catch (dbError) {
        console.warn(`Non-critical database error deleting guideline: ${dbError}`);
      }
    } catch (error) {
      console.error('Error deleting guideline:', error);
      // Make sure we at least try local storage
      this.deleteGuidelineFromLocalStorage(id);
      throw error;
    }
  }
  
  /**
   * Delete guideline from local storage
   */
  private static deleteGuidelineFromLocalStorage(id: string): void {
    try {
      const guidelinesJSON = localStorage.getItem('nhs_guidelines');
      if (!guidelinesJSON) return;
      
      const guidelines: Guideline[] = JSON.parse(guidelinesJSON);
      const filteredGuidelines = guidelines.filter(g => g.id !== id);
      
      localStorage.setItem('nhs_guidelines', JSON.stringify(filteredGuidelines));
      console.log(`Deleted guideline ${id} from local storage`);
    } catch (error) {
      console.error('Error deleting guideline from local storage:', error);
    }
  }
  
  /**
   * Save a sample statement - prioritizing local storage for reliability
   */
  static async saveSampleStatement(sample: SampleStatement): Promise<void> {
    try {
      if (!sample.id) {
        sample.id = uuidv4();
      }
      
      // Always save to local storage first for reliability
      this.saveSampleStatementToLocalStorage(sample);
      console.log(`Successfully saved sample "${sample.title}" to local storage`);
      
      // Attempt to save to Supabase as backup, but don't block if it fails
      try {
        const { error } = await supabase
          .from('sample_statements')
          .upsert({
            id: sample.id,
            title: sample.title,
            content: sample.content,
            category: sample.category || 'general',
            created_at: sample.dateAdded ? sample.dateAdded : new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: sample.id // This is a workaround as we don't have auth yet
          });
        
        if (error) {
          console.warn(`Non-critical database error saving sample: ${error.message}. Using local storage only.`);
        } else {
          console.log(`Successfully saved sample "${sample.title}" to database as backup`);
        }
      } catch (dbError) {
        console.warn(`Non-critical database error saving sample: ${dbError}. Using local storage only.`);
      }
    } catch (error) {
      console.error('Error saving sample statement:', error);
      // Emergency fallback
      this.saveSampleStatementToLocalStorage(sample);
      throw error;
    }
  }
  
  /**
   * Save sample statement to local storage
   */
  private static saveSampleStatementToLocalStorage(sample: SampleStatement): void {
    try {
      // Get existing samples
      const existingSamplesJSON = localStorage.getItem('nhs_samples');
      const existingSamples: SampleStatement[] = existingSamplesJSON 
        ? JSON.parse(existingSamplesJSON) 
        : [];
      
      // Check if sample already exists
      const index = existingSamples.findIndex(s => s.id === sample.id);
      
      if (index >= 0) {
        // Update existing
        existingSamples[index] = sample;
      } else {
        // Add new
        existingSamples.push(sample);
      }
      
      // Save back to localStorage
      localStorage.setItem('nhs_samples', JSON.stringify(existingSamples));
      console.log(`Saved sample statement "${sample.title}" to local storage`);
    } catch (error) {
      console.error('Error saving sample statement to local storage:', error);
    }
  }
  
  /**
   * Get all sample statements - prioritizing local storage for reliability
   */
  static async getSampleStatements(): Promise<SampleStatement[]> {
    try {
      // Always get from localStorage first as reliable source
      const localSamples = this.getSampleStatementsFromLocalStorage();
      console.log(`Found ${localSamples.length} samples in local storage`);
      
      // Try to get from Supabase as additional source, but don't block on error
      try {
        const { data, error } = await supabase
          .from('sample_statements')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn(`Non-critical database error getting samples: ${error.message}. Using local storage only.`);
          return localSamples;
        }
        
        // Convert DB format to app format
        const dbSamples = (data || []).map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          category: item.category || 'general',
          dateAdded: item.created_at
        }));
        
        // Merge samples from both sources
        // Create a map for quick lookup
        const samplesMap = new Map<string, SampleStatement>();
        
        // Add DB samples first
        dbSamples.forEach(sample => {
          samplesMap.set(sample.id, sample);
        });
        
        // Local samples override DB ones if they exist
        localSamples.forEach(sample => {
          samplesMap.set(sample.id, sample);
        });
        
        // Convert back to array
        const mergedSamples = Array.from(samplesMap.values());
        
        // Sort by date (newest first)
        mergedSamples.sort((a, b) => {
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        });
        
        // Update local storage with merged results to keep them in sync
        localStorage.setItem('nhs_samples', JSON.stringify(mergedSamples));
        
        return mergedSamples;
      } catch (dbError) {
        console.warn(`Non-critical database error getting samples: ${dbError}. Using local storage only.`);
        return localSamples;
      }
    } catch (error) {
      console.error('Failed to fetch sample statements:', error);
      return this.getSampleStatementsFromLocalStorage();
    }
  }
  
  /**
   * Get sample statements from local storage
   */
  private static getSampleStatementsFromLocalStorage(): SampleStatement[] {
    try {
      const samplesJSON = localStorage.getItem('nhs_samples');
      if (!samplesJSON) {
        console.log('No sample statements found in local storage, using defaults');
        return this.getDefaultSampleStatements();
      }
      
      const samples: SampleStatement[] = JSON.parse(samplesJSON);
      console.log(`Found ${samples.length} sample statements in local storage`);
      return samples;
    } catch (error) {
      console.error('Error reading sample statements from local storage:', error);
      return this.getDefaultSampleStatements();
    }
  }
  
  /**
   * Provide default sample statements if none exist
   */
  private static getDefaultSampleStatements(): SampleStatement[] {
    return [
      {
        id: uuidv4(),
        title: 'Nurse Sample Statement',
        content: 'As a registered nurse with over five years of experience in acute care settings, I am drawn to this position at your NHS Trust because of your reputation for excellent patient care and professional development opportunities. Throughout my career, I have consistently demonstrated the core NHS values, particularly compassion and commitment to quality of care. In my current role at City Hospital, I manage a caseload of 15-20 patients per shift, ensuring that each receives personalized care according to their specific needs...',
        category: 'nursing',
        dateAdded: new Date().toISOString()
      },
      {
        id: uuidv4(),
        title: 'Healthcare Administrator Sample',
        content: 'With a proven track record in healthcare administration spanning seven years, I am excited to apply for this position where I can contribute to the efficient running of your department. My experience includes managing appointment systems, maintaining patient records, and coordinating interdepartmental communications. I take pride in creating smooth administrative processes that ultimately benefit patient care. In my current role, I implemented a new digital filing system that reduced document retrieval time by 40%...',
        category: 'administrative',
        dateAdded: new Date().toISOString()
      }
    ];
  }
  
  /**
   * Delete a sample statement - prioritizing local storage for reliability
   */
  static async deleteSampleStatement(id: string): Promise<void> {
    try {
      // Delete from local storage first for immediate user feedback
      this.deleteSampleStatementFromLocalStorage(id);
      console.log(`Deleted sample ${id} from local storage`);
      
      // Try to delete from Supabase as well, but don't block if it fails
      try {
        const { error } = await supabase
          .from('sample_statements')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.warn(`Non-critical database error deleting sample: ${error.message}`);
        } else {
          console.log(`Successfully deleted sample ${id} from database`);
        }
      } catch (dbError) {
        console.warn(`Non-critical database error deleting sample: ${dbError}`);
      }
    } catch (error) {
      console.error('Error deleting sample statement:', error);
      // Make sure we at least try local storage
      this.deleteSampleStatementFromLocalStorage(id);
      throw error;
    }
  }
  
  /**
   * Delete sample statement from local storage
   */
  private static deleteSampleStatementFromLocalStorage(id: string): void {
    try {
      const samplesJSON = localStorage.getItem('nhs_samples');
      if (!samplesJSON) return;
      
      const samples: SampleStatement[] = JSON.parse(samplesJSON);
      const filteredSamples = samples.filter(s => s.id !== id);
      
      localStorage.setItem('nhs_samples', JSON.stringify(filteredSamples));
      console.log(`Deleted sample statement ${id} from local storage`);
    } catch (error) {
      console.error('Error deleting sample statement from local storage:', error);
    }
  }
  
  /**
   * Save an API key - prioritizing local storage as more reliable
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
   * Get a secret from Supabase Edge Function secrets
   */
  static async getSecretFromSupabase(secretName: string): Promise<{data?: {value: string}, error?: any}> {
    try {
      // Call the Edge Function to retrieve the secret
      const { data, error } = await supabase.functions.invoke('get-secret', {
        body: { secretName }
      });
      
      if (error) {
        console.error(`Error getting secret ${secretName} from Supabase:`, error);
        return { error };
      }
      
      return { data };
    } catch (error) {
      console.error(`Error in getSecretFromSupabase for ${secretName}:`, error);
      return { error };
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
