
import { AIService } from './AIService';
import { toast } from 'sonner';

export class AnthropicAPI {
  /**
   * Call to Anthropic API for CV analysis
   */
  static async callAnthropic(messages: any[], maxTokens: number = 4000): Promise<any> {
    try {
      const apiKey = AIService.getApiKey('anthropic');
      let finalApiKey = apiKey;
      
      if (!apiKey) {
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
      
      if (!finalApiKey) {
        throw new Error('Anthropic API key not set. Please set it in the Settings page.');
      }
      
      // Add a timeout for the fetch call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
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
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
        }
        
        return await response.json();
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // If the error is an AbortError, provide a more helpful message
        if (fetchError.name === 'AbortError') {
          throw new Error('Request to Anthropic API timed out. Please try again later.');
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      // Show user-friendly toast
      toast.error('Failed to connect to Anthropic API. Please check your API key in Settings.');
      throw error;
    }
  }
}
