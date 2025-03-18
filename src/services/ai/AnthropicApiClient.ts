
import { supabase } from "@/integrations/supabase/client";
import { withRetry, createRequestTimeout } from "@/utils/ApiUtils";

export class AnthropicApiClient {
  /**
   * Validates message format before sending to Anthropic
   */
  static validateMessages(messages: any[]): void {
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
  }
  
  /**
   * Prepares the payload for the Anthropic API
   */
  static preparePayload(messages: any[], maxTokens: number = 4000): any {
    return {
      model: 'claude-3-sonnet-20240229',
      max_tokens: maxTokens,
      messages: messages,
      response_format: { type: "json_object" }
    };
  }
  
  /**
   * Makes the actual API call to Anthropic through the Edge Function
   */
  static async callApi(payload: any, apiKey: string): Promise<any> {
    // Set up timeout handling
    const { controller, clearTimeout } = createRequestTimeout(120000);
    
    try {
      console.log("Calling Anthropic API through Edge Function proxy...");
      
      return await withRetry(
        async () => {
          const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
            body: {
              ...payload,
              apiKey: apiKey
            }
          });
          
          if (error) {
            console.error("Edge function error:", error);
            
            if (error.message && error.message.includes('deployed')) {
              throw new Error(`Edge Function not deployed or not responding. Please make sure the Edge Function is deployed properly.`);
            } else {
              throw new Error(`Edge function error: ${error.message || JSON.stringify(error)}`);
            }
          }
          
          if (data && data.error) {
            console.error("Anthropic API error via Edge Function:", data.error);
            
            if (data.error.status === 401 || 
                (data.error.message && data.error.message.includes('API key'))) {
              throw new Error(`Invalid API key. Please check your Anthropic API key in Settings.`);
            }
            
            throw new Error(`Anthropic API error: ${data.error.message || JSON.stringify(data.error)}`);
          }
          
          console.log("Anthropic API call completed successfully via Edge Function");
          console.log("Response preview:", JSON.stringify(data).substring(0, 200) + "...");
          
          if (!data || !data.content || !Array.isArray(data.content) || data.content.length === 0) {
            console.warn("Unexpected response structure from Anthropic API:", JSON.stringify(data).substring(0, 200));
            throw new Error("Invalid response structure from Anthropic API");
          }
          
          return data;
        },
        {
          shouldRetry: (error) => {
            // Don't retry aborted requests or auth errors
            if (error.name === 'AbortError' || 
                (error.message.includes('401') || 
                error.message.includes('API key'))) {
              return false;
            }
            
            // Only retry network errors, 5xx server errors, or deployment issues
            return error instanceof TypeError || 
                  error.message.includes('5') || 
                  error.message.includes('network') || 
                  error.message.includes('deployed') || 
                  error.message.includes('Edge Function');
          }
        }
      );
    } finally {
      // Make sure to clear the timeout
      clearTimeout();
    }
  }
}
