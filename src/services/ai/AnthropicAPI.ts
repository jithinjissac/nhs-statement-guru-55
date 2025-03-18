
import { AIService } from './AIService';
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
        // Get API key from storage service
        const apiKey = await AIService.getApiKey('anthropic');
        
        if (apiKey) {
          finalApiKey = apiKey;
          console.log("Using API key from storage service");
        } else {
          // Check if we're in development environment with a fallback key
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
        console.log("Message payload size:", JSON.stringify(messages).length, "bytes");
        
        // Add retry logic for network flakiness
        let retries = 0;
        const maxRetries = 2;
        let lastError: Error | null = null;
        
        // First try using the Supabase Edge Function to avoid CORS issues
        while (retries <= maxRetries) {
          try {
            if (retries > 0) {
              console.log(`Retry attempt ${retries}/${maxRetries}`);
            }
            
            console.log("Calling Anthropic API through Edge Function proxy...");
            
            // 1. Try the Supabase Edge Function approach
            try {
              const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
                body: {
                  model: 'claude-3-sonnet-20240229',
                  max_tokens: maxTokens,
                  messages: messages
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
              return data;
            } catch (edgeFunctionError) {
              console.error("Failed to use Edge Function, falling back to direct API call:", edgeFunctionError);
              
              // 2. Try direct API call with API key as a fallback approach (will still have CORS issues in browser)
              // Only attempt this in development environment where CORS might be disabled
              if (import.meta.env.DEV) {
                console.log("Attempting direct API call (dev environment only)...");
                
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': finalApiKey,
                    'anthropic-version': '2023-06-01'
                  },
                  body: JSON.stringify({
                    model: 'claude-3-sonnet-20240229',
                    max_tokens: maxTokens,
                    messages: messages
                  }),
                  signal: controller.signal
                });
                
                // Clear the timeout since we got a response
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                  const errorText = await response.text();
                  let errorData;
                  
                  try {
                    errorData = JSON.parse(errorText);
                  } catch (e) {
                    errorData = { error: { message: errorText || response.statusText } };
                  }
                  
                  const errorMessage = errorData.error?.message || response.statusText;
                  console.error('Anthropic API error response:', errorData);
                  console.error('Status code:', response.status);
                  
                  throw new Error(`Anthropic API error (${response.status}): ${errorMessage}`);
                }
                
                const data = await response.json();
                console.log("Anthropic API call completed successfully");
                return data;
              } else {
                throw new Error("Edge Function failed and direct API calls are not supported in production due to CORS restrictions. Please ensure the Edge Function is deployed correctly.");
              }
            }
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
        
        // Re-throw the error for other types of errors
        console.error('Error in fetch operation:', fetchError);
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
