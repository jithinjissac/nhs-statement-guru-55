
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
    
    // Validate each message in the array and trim if too large
    const MAX_CONTENT_LENGTH = 25000; // Characters per message limit
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message.role || !message.content) {
        throw new Error(`Invalid message at index ${i}: missing role or content`);
      }
      
      if (typeof message.content !== 'string') {
        throw new Error(`Invalid message content at index ${i}: content must be a string`);
      }
      
      // Trim long messages to prevent timeouts
      if (message.content.length > MAX_CONTENT_LENGTH) {
        console.warn(`Message at index ${i} is too long (${message.content.length} chars). Trimming to ${MAX_CONTENT_LENGTH} chars.`);
        message.content = message.content.substring(0, MAX_CONTENT_LENGTH) + 
          `... [Note: Content was trimmed from ${message.content.length} to ${MAX_CONTENT_LENGTH} characters due to length]`;
      }
    }
    
    // Check total size of all messages
    const totalSize = JSON.stringify(messages).length;
    if (totalSize > 90000) {
      console.warn(`Total messages size is very large: ${totalSize} bytes. This may cause timeouts.`);
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
      timeout: 30, // Lower timeout for more reliability
      temperature: 0.85 // Slightly higher temperature for more natural, human-like text
    };
  }
  
  /**
   * Makes the direct API call to Anthropic - Note: this method is not used
   * directly anymore as we use the Edge Function to avoid CORS issues
   * but is kept for reference and as a backup solution
   */
  static async callApi(payload: any, apiKey: string): Promise<any> {
    // Set up timeout handling
    const { controller, clearTimeout } = createRequestTimeout(60000);
    
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
          maxRetries: 2,
          retryDelay: 1000,
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
