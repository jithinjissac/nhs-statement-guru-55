
import { AIService } from './AIService';
import { toast } from 'sonner';

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
        const apiKey = AIService.getApiKey('anthropic');
        
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
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout (increased from 60s)
      
      try {
        // Log the start of the API call (for debugging)
        console.log("Starting Anthropic API call with model claude-3-sonnet-20240229");
        
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
        
        // Check if the response is ok (status in the range 200-299)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
          const errorMessage = errorData.error?.message || response.statusText;
          console.error('Anthropic API error response:', errorData);
          console.error('Status code:', response.status);
          throw new Error(`Anthropic API error (${response.status}): ${errorMessage}`);
        }
        
        // Parse and return the response JSON
        const data = await response.json();
        console.log("Anthropic API call completed successfully");
        return data;
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
          throw new Error('Network error when calling Anthropic API. Please check your internet connection and API key.');
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
