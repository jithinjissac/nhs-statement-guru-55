
import { AIService } from './AIService';

export class AnthropicAPI {
  /**
   * Call to Anthropic API for CV analysis
   */
  static async callAnthropic(messages: any[], maxTokens: number = 4000): Promise<any> {
    try {
      const apiKey = AIService.getApiKey('anthropic');
      
      if (!apiKey) {
        // Check if we're in development environment with a fallback key
        const fallbackKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
        
        if (fallbackKey) {
          console.log("Using fallback API key from environment variables");
          // Store the key for future use
          AIService.setApiKey('anthropic', fallbackKey);
        } else {
          throw new Error('Anthropic API key not set. Please set it in the Settings page.');
        }
      }
      
      // Get the potentially updated key
      const finalApiKey = AIService.getApiKey('anthropic');
      
      if (!finalApiKey) {
        throw new Error('Anthropic API key not set. Please set it in the Settings page.');
      }
      
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
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      throw error;
    }
  }
}
