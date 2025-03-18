
import { toast } from 'sonner';
import { ApiKeyService } from './ApiKeyService';
import { AnthropicApiClient } from './AnthropicApiClient';

export class AnthropicAPI {
  /**
   * Call to Anthropic API for CV analysis
   */
  static async callAnthropic(messages: any[], maxTokens: number = 4000): Promise<any> {
    try {
      // Get API key
      let finalApiKey;
      try {
        finalApiKey = await ApiKeyService.getApiKey('anthropic');
        console.log("API key available:", finalApiKey ? "Yes" : "No");
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
      
      // Prepare payload
      const payload = AnthropicApiClient.preparePayload(messages, maxTokens);
      
      // Make the API call
      return await AnthropicApiClient.callApi(payload, finalApiKey);
      
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      // Show user-friendly toast
      toast.error(error.message || 'Failed to connect to Anthropic API. Please check your API key in Settings.');
      throw error;
    }
  }
}
