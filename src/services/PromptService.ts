
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemPrompt {
  id: string;
  key: string;
  title: string;
  content: string;
  category: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export class PromptService {
  /**
   * Retrieves all system prompts
   */
  static async getAllPrompts(): Promise<SystemPrompt[]> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });
      
      if (error) {
        console.error('Error fetching prompts:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
      toast.error('Failed to load prompts');
      return [];
    }
  }
  
  /**
   * Retrieves a system prompt by its key
   */
  static async getPromptByKey(key: string): Promise<SystemPrompt | null> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('key', key)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error(`Error fetching prompt with key ${key}:`, error);
        }
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to fetch prompt with key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Updates a system prompt
   */
  static async updatePrompt(id: string, updates: Partial<Omit<SystemPrompt, 'id' | 'created_at' | 'updated_at'>>): Promise<SystemPrompt | null> {
    try {
      const { data, error } = await supabase
        .from('system_prompts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating prompt:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast.error('Failed to update prompt');
      return null;
    }
  }
  
  /**
   * Processes a template by replacing placeholders with values
   */
  static processTemplate(template: string, variables: Record<string, string | number | boolean>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    }
    
    return processed;
  }
  
  /**
   * Gets a prompt by key and processes it with variables
   */
  static async getProcessedPrompt(key: string, variables: Record<string, string | number | boolean> = {}): Promise<string> {
    const prompt = await this.getPromptByKey(key);
    
    if (!prompt) {
      console.warn(`Prompt with key ${key} not found, using fallback`);
      return '';
    }
    
    return this.processTemplate(prompt.content, variables);
  }
}
