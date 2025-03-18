
import { AIService } from './AIService';
import { StorageService } from '../StorageService';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";

export class AnthropicAPI {
  /**
   * Call to Anthropic API for CV analysis
   */
  static async callAnthropic(messages: any[], maxTokens: number = 4000): Promise<any> {
    try {
      // First try to get the Anthropic API key from storage or environment
      let finalApiKey;
      
      try {
        // Prefer localStorage directly to avoid database policy issues
        const localStorageKeys = StorageService.getApiKeysFromLocalStorage() || {};
        if (localStorageKeys.anthropic) {
          finalApiKey = localStorageKeys.anthropic;
          console.log("Using API key from local storage");
        } else {
          // Try storage service as fallback
          try {
            const apiKey = await AIService.getApiKey('anthropic');
            
            if (apiKey) {
              finalApiKey = apiKey;
              console.log("Using API key from storage service");
            }
          } catch (storageError) {
            console.log("Error getting API key from storage service, checking environment", storageError);
          }
          
          // Check if we're in development environment with a fallback key
          if (!finalApiKey) {
            const fallbackKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
            
            if (fallbackKey) {
              console.log("Using fallback API key from environment variables");
              // Store the key for future use
              AIService.setApiKey('anthropic', fallbackKey);
              finalApiKey = fallbackKey;
            } else {
              throw new Error('Anthropic API key not set. Please set it in the Settings page.');
            }
          }
        }
      } catch (keyError) {
        console.error('Error retrieving API key:', keyError);
        throw new Error('Could not retrieve Anthropic API key. Please check your settings.');
      }
      
      if (!finalApiKey) {
        console.error('No API key available for Anthropic');
        throw new Error('Anthropic API key not set. Please set it in the Settings page.');
      }
      
      console.log("API key available:", finalApiKey ? "Yes" : "No");
      
      // Add a timeout for the fetch call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout
      
      try {
        // Log the start of the API call
        console.log("Starting Anthropic API call with model claude-3-sonnet-20240229");
        
        // Validate messages format
        if (!Array.isArray(messages)) {
          throw new Error("Messages must be an array");
        }
        
        if (messages.length === 0) {
          throw new Error("Messages array cannot be empty");
        }
        
        // Validate each message in the array
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          if (!message.role || !message.content) {
            throw new Error(`Invalid message at index ${i}: missing role or content`);
          }
          
          if (typeof message.content !== 'string') {
            throw new Error(`Invalid message content at index ${i}: content must be a string`);
          }
        }
        
        // Prepare the payload
        const payload = {
          model: 'claude-3-sonnet-20240229',
          max_tokens: maxTokens,
          messages: messages,
          response_format: { type: "json_object" } // Force JSON response format
        };
        
        console.log("Message payload size:", JSON.stringify(payload).length, "bytes");
        console.log("First message preview:", messages[0]?.content?.substring(0, 100) + "...");
        
        // Add retry logic for network flakiness
        let retries = 0;
        const maxRetries = 2;
        let lastError: Error | null = null;
        
        // Use the Supabase Edge Function to avoid CORS issues
        while (retries <= maxRetries) {
          try {
            if (retries > 0) {
              console.log(`Retry attempt ${retries}/${maxRetries}`);
            }
            
            console.log("Calling Anthropic API through Edge Function proxy...");
            
            // Try the Supabase Edge Function approach
            const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
              body: {
                ...payload,
                apiKey: finalApiKey // Pass the API key to the edge function
              }
            });
            
            // Clear the timeout since we got a response
            clearTimeout(timeoutId);
            
            if (error) {
              console.error("Edge function error:", error);
              throw new Error(`Edge function error: ${error.message || JSON.stringify(error)}`);
            }
            
            if (data.error) {
              console.error("Anthropic API error via Edge Function:", data.error);
              throw new Error(`Anthropic API error: ${data.error.message || JSON.stringify(data.error)}`);
            }
            
            console.log("Anthropic API call completed successfully via Edge Function");
            console.log("Response preview:", JSON.stringify(data).substring(0, 200) + "...");
            
            // Validate the response structure before returning
            if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
              console.warn("Unexpected response structure from Anthropic API:", JSON.stringify(data).substring(0, 200));
              throw new Error("Invalid response structure from Anthropic API");
            }
            
            return data;
          } catch (fetchAttemptError) {
            lastError = fetchAttemptError as Error;
            
            // Don't retry aborted requests or auth errors
            if (fetchAttemptError.name === 'AbortError' || 
                (fetchAttemptError instanceof Error && 
                 (fetchAttemptError.message.includes('401') || 
                  fetchAttemptError.message.includes('403')))) {
              throw fetchAttemptError;
            }
            
            // Only retry network errors or 5xx server errors
            if (fetchAttemptError instanceof TypeError || 
                (fetchAttemptError instanceof Error && 
                 fetchAttemptError.message.includes('5'))) {
              retries++;
              if (retries <= maxRetries) {
                // Exponential backoff: 1s, 2s, 4s...
                const backoffMs = Math.pow(2, retries - 1) * 1000;
                console.log(`Network/server error, waiting ${backoffMs}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, backoffMs));
                continue;
              }
            }
            
            // If we reach here, either we've exhausted retries or it's an error we don't retry
            throw fetchAttemptError;
          }
        }
        
        // If we somehow get here after exhausting retries
        throw lastError || new Error('Failed to connect to Anthropic API after multiple attempts');
      } catch (fetchError) {
        // Clear the timeout if we got an error
        clearTimeout(timeoutId);
        
        // Handle specific error types
        if (fetchError.name === 'AbortError') {
          console.error('Request to Anthropic API timed out');
          throw new Error('Request to Anthropic API timed out. Please try again later.');
        }
        
        // Check for network-related errors
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          console.error('Network error when calling Anthropic API:', fetchError);
          throw new Error('Network issue detected when calling Anthropic API. Please make sure the Edge Function is deployed properly and try again.');
        }
        
        // Log the detailed error for debugging
        console.error('Error in fetch operation:', fetchError);
        
        // Re-throw the error with a more informative message
        if (fetchError.message.includes('Edge function error')) {
          throw new Error(`Edge function error: ${fetchError.message}. Please check that the Edge Function is deployed and the API key is valid.`);
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      // Show user-friendly toast
      toast.error(error.message || 'Failed to connect to Anthropic API. Please check your API key in Settings.');
      throw error;
    }
  }
}
