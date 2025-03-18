
import { withRetry, createRequestTimeout } from "@/utils/ApiUtils";

export class AnthropicApiClient {
  private static BASE_URL = "https://api.anthropic.com/v1/messages";

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
   * Makes the direct API call to Anthropic - Note: this method is not used
   * directly anymore as we use the Edge Function to avoid CORS issues
   * but is kept for reference and as a backup solution
   */
  static async callApi(payload: any, apiKey: string): Promise<any> {
    // Set up timeout handling
    const { controller, clearTimeout } = createRequestTimeout(120000);
    
    try {
      console.log("Making direct call to Anthropic API...");
      
      return await withRetry(
        async () => {
          const response = await fetch(this.BASE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Anthropic API error:", errorData);
            
            if (response.status === 401) {
              throw new Error(`Invalid API key. Please check your Anthropic API key in Settings.`);
            }
            
            throw new Error(`Anthropic API error: ${errorData.error?.message || response.statusText}`);
          }
          
          const data = await response.json();
          
          console.log("Anthropic API call completed successfully");
          console.log("Response preview:", JSON.stringify(data).substring(0, 200) + "...");
          
          if (!data || !data.content) {
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
            
            // Only retry network errors, 5xx server errors
            return error instanceof TypeError || 
                  error.message.includes('5') || 
                  error.message.includes('network');
          }
        }
      );
    } finally {
      // Make sure to clear the timeout
      clearTimeout();
    }
  }
}
