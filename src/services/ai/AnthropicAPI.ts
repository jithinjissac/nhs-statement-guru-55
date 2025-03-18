
import { toast } from 'sonner';
import { ApiKeyService } from './ApiKeyService';
import { AnthropicApiClient } from './AnthropicApiClient';
import { supabase } from '@/integrations/supabase/client';
import { StorageService } from '../StorageService';

export class AnthropicAPI {
  /**
   * Call to Anthropic API for analysis
   */
  static async callAnthropic(messages: any[], maxTokens: number = 4000): Promise<any> {
    try {
      // Get API key
      let apiKey;
      try {
        apiKey = await ApiKeyService.getApiKey('anthropic');
        console.log("API key available:", apiKey ? "Yes" : "No");
      } catch (keyError) {
        console.error('Error retrieving API key:', keyError);
        throw new Error('Could not retrieve Anthropic API key. Please check your settings.');
      }
      
      // Validate messages
      AnthropicApiClient.validateMessages(messages);
      
      // Log request info
      console.log("Starting Anthropic API call with model claude-3-sonnet-20240229");
      console.log("Message payload size:", JSON.stringify(messages).length, "bytes");
      console.log("First message preview:", messages[0]?.content?.substring(0, 100) + "...");
      
      // Prepare payload - Remove response_format to avoid API errors
      const payload = {
        model: 'claude-3-sonnet-20240229',
        max_tokens: maxTokens,
        messages: messages
      };

      console.log("Using Supabase Edge Function to avoid CORS issues");
      // Call via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
        body: {
          apiKey,
          payload
        }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Error from proxy: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data returned from edge function');
      }
      
      console.log("Anthropic API call via Edge Function completed successfully");
      return data;
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      // Show user-friendly toast
      toast.error(error.message || 'Failed to connect to Anthropic API. Please check your API key in Settings.');
      throw error;
    }
  }

  /**
   * Get guidelines and sample statements to enhance AI generation
   */
  static async getNHSStatementResources() {
    const guidelines = await StorageService.getGuidelines();
    const sampleStatements = await StorageService.getSampleStatements();
    
    console.log(`Retrieved ${guidelines.length} guidelines and ${sampleStatements.length} sample statements for AI enhancement`);
    
    return {
      guidelines,
      sampleStatements
    };
  }
}
