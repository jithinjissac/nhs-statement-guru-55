
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
        messages: messages,
        temperature: 0.85 // Slightly higher temperature for more natural, human-like text
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
    
    // Additional NHS supporting statement guidelines
    const nhsSupportingStatementGuidelines = [
      {
        title: "Purpose of an NHS Supporting Statement",
        content: "The purpose of a supporting statement is to demonstrate you are the right person for the job, show you're applying for the right reasons, and meet all criteria in the job pack. It should address each criterion in the person specification with evidence."
      },
      {
        title: "Supporting Statement Structure",
        content: "Start with an attention-grabbing introduction explaining why you're applying. In the main body, address each criterion with specific examples using the STAR method (Situation, Task, Action, Result). End with a strong conclusion highlighting key strengths and how you embody NHS values."
      },
      {
        title: "What NHS Employers Look For",
        content: "Employers assess how well you meet criteria with specific examples, your alignment with NHS values, genuine passion for the role, evidence of research about the organization, and attention to detail in your writing."
      },
      {
        title: "NHS Values to Emphasize",
        content: "Working together for patients, Respect and dignity, Commitment to quality of care, Compassion, Improving lives, Everyone counts. Always demonstrate how your experience aligns with these core values."
      },
      {
        title: "Using Personal Language",
        content: "Write in first person with natural language variations. Include personal reflections on your healthcare journey and authentic motivations for working in the NHS. Avoid formulaic or robotic phrasing."
      }
    ];
    
    // Combine stored guidelines with the NHS-specific ones
    const enhancedGuidelines = [...guidelines, ...nhsSupportingStatementGuidelines];
    
    console.log(`Retrieved ${enhancedGuidelines.length} guidelines and ${sampleStatements.length} sample statements for AI enhancement`);
    
    return {
      guidelines: enhancedGuidelines,
      sampleStatements
    };
  }
}
