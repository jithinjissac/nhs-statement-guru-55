
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
        
        // Use a CORS proxy to avoid CORS issues
        // We'll try several approaches and use the first one that works
        const corsProxies = [
          {
            name: "CORS Proxy Service",
            url: "https://corsproxy.io/",
            endpoint: (apiUrl: string) => `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`,
            headers: (apiKey: string) => ({
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            })
          },
          {
            name: "CORS Anywhere Fallback",
            url: "https://cors-anywhere.herokuapp.com/",
            endpoint: (apiUrl: string) => `https://cors-anywhere.herokuapp.com/${apiUrl}`,
            headers: (apiKey: string) => ({
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            })
          },
          {
            name: "No CORS Mode (Limited)",
            url: "https://api.anthropic.com",
            endpoint: (apiUrl: string) => apiUrl,
            headers: (apiKey: string) => ({
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            }),
            mode: 'no-cors' as RequestMode
          }
        ];
        
        while (retries <= maxRetries) {
          try {
            if (retries > 0) {
              console.log(`Retry attempt ${retries}/${maxRetries}`);
            }
            
            // Choose a proxy based on retry count
            const proxyIndex = Math.min(retries, corsProxies.length - 1);
            const proxy = corsProxies[proxyIndex];
            console.log(`Trying ${proxy.name} approach...`);
            
            const apiUrl = 'https://api.anthropic.com/v1/messages';
            const fetchOptions: RequestInit = {
              method: 'POST',
              headers: proxy.headers(finalApiKey),
              body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: maxTokens,
                messages: messages
              }),
              signal: controller.signal
            };
            
            // Add mode if specified
            if (proxy.mode) {
              fetchOptions.mode = proxy.mode;
            }
            
            const response = await fetch(proxy.endpoint(apiUrl), fetchOptions);
            
            // Clear the timeout since we got a response
            clearTimeout(timeoutId);
            
            // For no-cors mode, we can't access response details
            if (proxy.mode === 'no-cors') {
              console.log("Using no-cors mode, limited response data available");
              // We have to assume response is successful and create a placeholder
              // This is not ideal but may work for simple use cases
              return {
                content: [
                  {
                    text: "Due to CORS limitations, we've had to use a limited connection mode. " +
                          "Please consider an alternative approach or contact support for assistance."
                  }
                ]
              };
            }
            
            // Check if the response is ok (status in the range 200-299)
            if (!response.ok) {
              // Try to parse the error response as JSON
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
              
              // Handle rate limits differently
              if (response.status === 429) {
                throw new Error(`Anthropic API rate limit exceeded. Please try again in a few moments.`);
              }
              
              // Handle authentication issues
              if (response.status === 401 || response.status === 403) {
                throw new Error(`Anthropic API authentication error (${response.status}): ${errorMessage}. Please check your API key in Settings.`);
              }
              
              throw new Error(`Anthropic API error (${response.status}): ${errorMessage}`);
            }
            
            // Parse and return the response JSON
            const data = await response.json();
            console.log("Anthropic API call completed successfully");
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
          throw new Error('CORS issue detected when calling Anthropic API. The application is using a proxy to work around CORS limitations. Please try again or contact support if the issue persists.');
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
