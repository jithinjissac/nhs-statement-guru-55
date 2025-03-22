
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
      // Get API key with improved error handling
      let apiKey;
      try {
        apiKey = await ApiKeyService.getApiKey('anthropic');
        console.log("API key available:", apiKey ? "Yes" : "No");
      } catch (keyError) {
        console.error('Error retrieving API key:', keyError);
        toast.error('Could not retrieve Anthropic API key. Please check your settings.');
        throw new Error('Could not retrieve Anthropic API key. Please check your settings.');
      }
      
      // Validate messages
      AnthropicApiClient.validateMessages(messages);
      
      // Check if messages are too large and warn if necessary
      const messageSize = JSON.stringify(messages).length;
      console.log("Message payload size:", messageSize, "bytes");
      
      if (messageSize > 80000) {
        console.warn("Message payload is very large, may cause timeouts");
        toast.warning("Analyzing a large document. This might take a bit longer than usual.", {
          duration: 5000,
        });
      }
      
      // Log request info
      console.log("Starting Anthropic API call with model claude-3-sonnet-20240229");
      
      // Add a loading toast that will be dismissed on success or error
      const loadingToastId = toast.loading('Analyzing document with AI...', { 
        duration: 60000 // Long duration that will be dismissed on completion
      });
      
      try {
        // Prepare payload - simplify to only include required fields
        const payload = {
          model: 'claude-3-sonnet-20240229',
          max_tokens: maxTokens,
          messages: messages,
          temperature: 0.7 // Slightly lower temperature for more reliable results
        };

        console.log("Using Supabase Edge Function to avoid CORS issues");
        
        // Call via Supabase Edge Function
        const result = await supabase.functions.invoke('anthropic-proxy', {
          body: {
            apiKey,
            payload
          }
        });
        
        // Clear the loading toast
        toast.dismiss(loadingToastId);
        
        if (result.error) {
          console.error('Edge function error:', result.error);
          
          // Handle specific error cases with user-friendly messages
          const errorMessage = result.error.message || '';
          
          if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
            toast.error('The analysis took too long to complete. Try with a smaller document or break your analysis into smaller parts.');
            throw new Error('Analysis timeout. Please try with less content.');
          } else if (errorMessage.includes('API key') || errorMessage.includes('invalid_api_key')) {
            toast.error('Invalid API key. Please check your Anthropic API key in Settings.');
            throw new Error('Invalid API key. Please update it in Settings.');
          } else if (errorMessage.includes('rate_limit')) {
            toast.error('Rate limit exceeded. Please try again in a few minutes.');
            throw new Error('Rate limit exceeded. Please try again later.');
          } else if (errorMessage.includes('invalid_request') || errorMessage.includes('extra fields')) {
            toast.error('There was an issue with the request format. Try simplifying your analysis.');
            throw new Error('Invalid request format. Please try again with simpler content.');
          } else {
            toast.error('Error connecting to AI service. Please try again in a moment.');
            throw new Error(`Edge Function error: ${errorMessage}`);
          }
        }
        
        if (!result.data) {
          toast.error('No data returned from AI service. Please try again.');
          throw new Error('No data returned from edge function');
        }
        
        toast.success('Analysis completed successfully!');
        console.log("Anthropic API call via Edge Function completed successfully");
        return result.data;
      } finally {
        // Ensure loading toast is dismissed in all cases
        toast.dismiss(loadingToastId);
      }
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      // Show user-friendly toast if not already shown
      if (!error.message?.includes('timeout') && 
          !error.message?.includes('API key') && 
          !error.message?.includes('Rate limit') &&
          !error.message?.includes('Invalid request format')) {
        toast.error(error.message || 'Failed to connect to Anthropic API. Please try again later.');
      }
      throw error;
    }
  }

  /**
   * Get guidelines and sample statements to enhance AI generation
   */
  static async getNHSStatementResources() {
    try {
      // Directly fetch from local storage for reliability with database issues
      const getLocalGuidelines = () => {
        const guidelinesJSON = localStorage.getItem('nhs_guidelines');
        return guidelinesJSON ? JSON.parse(guidelinesJSON) : [];
      };
      
      const getLocalSampleStatements = () => {
        const samplesJSON = localStorage.getItem('nhs_samples');
        return samplesJSON ? JSON.parse(samplesJSON) : [];
      };
      
      // Get data from local storage - more reliable with current DB issues
      const guidelines = getLocalGuidelines();
      const sampleStatements = getLocalSampleStatements();
      
      console.log(`Retrieved ${guidelines.length} guidelines and ${sampleStatements.length} sample statements from local storage`);
      
      // Additional NHS supporting statement guidelines - these complement the user-added guidelines
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
        },
        {
          title: "Human-Like Writing Style",
          content: "Use varied sentence structures, occasional contractions, and personal anecdotes. Incorporate thoughtful reflections on your experiences and motivations. Write as if speaking directly to another person, with warmth and authenticity. Avoid overly formal language or repetitive structures."
        }
      ];
      
      // Combine locally fetched guidelines with the NHS-specific ones
      const enhancedGuidelines = [...guidelines, ...nhsSupportingStatementGuidelines];
      
      return {
        guidelines: enhancedGuidelines,
        sampleStatements
      };
    } catch (error) {
      console.error('Error retrieving NHS statement resources:', error);
      // Return default values if there's an error
      return {
        guidelines: [
          {
            title: "Human-Like Writing Style",
            content: "Use varied sentence structures, occasional contractions, and personal anecdotes. Incorporate thoughtful reflections on your experiences and motivations. Write as if speaking directly to another person, with warmth and authenticity. Avoid overly formal language or repetitive structures."
          }
        ],
        sampleStatements: []
      };
    }
  }
}
