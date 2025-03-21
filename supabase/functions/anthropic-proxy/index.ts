
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility function to add more robust, fine-grained retry logic with better logging
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  let lastError;
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries} for Anthropic API request`);
        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt - 1) * (0.9 + Math.random() * 0.2), 4000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log(`Making attempt ${attempt + 1} to Anthropic API`);
      const response = await fetch(url, options);
      
      // Log response status
      console.log(`Anthropic API returned status: ${response.status}`);
      
      // Early return for successful responses
      if (response.ok) {
        console.log("Successfully received response from Anthropic API");
        return response;
      }
      
      // For error responses, get the detailed error message
      const errorStatus = response.status;
      let errorDetails;
      
      try {
        errorDetails = await response.json();
        console.error(`Anthropic API error (${errorStatus}):`, JSON.stringify(errorDetails));
      } catch (e) {
        const text = await response.text();
        errorDetails = { message: text || 'Unknown API error' };
        console.error(`Anthropic API error (${errorStatus}):`, text);
      }
      
      // Don't retry auth errors or bad requests
      if (errorStatus === 401 || errorStatus === 400) {
        const error = new Error(`Anthropic API error (${errorStatus}): ${JSON.stringify(errorDetails)}`);
        // @ts-ignore
        error.status = errorStatus;
        // @ts-ignore
        error.details = errorDetails;
        throw error;
      }
      
      // For other errors, continue retry attempts
      lastError = new Error(`Anthropic API error (${errorStatus}): ${JSON.stringify(errorDetails)}`);
      // @ts-ignore
      lastError.status = errorStatus;
      // @ts-ignore
      lastError.details = errorDetails;
      
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message || error);
      lastError = error;
      
      // Don't retry if it's an abort error (timeout) or auth error
      if (error.name === 'AbortError' || 
          (error.status && (error.status === 401 || error.status === 400))) {
        throw error;
      }
    }
    
    attempt++;
  }
  
  console.error(`All ${maxRetries + 1} attempts to Anthropic API failed`);
  throw lastError || new Error("Maximum retries exceeded");
}

// Helper function to sanitize and validate message payload
function validateMessagePayload(messages: any[]) {
  if (!Array.isArray(messages)) {
    console.warn("Messages is not an array, returning as is");
    return messages;
  }
  
  console.log(`Validating message payload with ${messages.length} messages`);
  const MAX_CONTENT_LENGTH = 100000; // Characters per message limit
  const validatedMessages = [...messages];
  
  let totalSize = 0;
  for (let i = 0; i < validatedMessages.length; i++) {
    const message = validatedMessages[i];
    if (message?.content) {
      let contentLength = 0;
      
      if (typeof message.content === 'string') {
        contentLength = message.content.length;
        totalSize += contentLength;
        
        if (contentLength > MAX_CONTENT_LENGTH) {
          console.warn(`Message at index ${i} is too long (${contentLength} chars). Truncating to ${MAX_CONTENT_LENGTH} chars.`);
          
          // Truncate and add warning about truncation
          validatedMessages[i] = {
            ...message,
            content: message.content.substring(0, MAX_CONTENT_LENGTH) + 
              `... [Content truncated from ${contentLength} characters due to length limits]`
          };
        }
      } else if (Array.isArray(message.content)) {
        // Handle content array (for multimodal messages)
        let truncated = false;
        const newContent = message.content.map((item: any) => {
          if (item.type === 'text' && typeof item.text === 'string') {
            contentLength += item.text.length;
            totalSize += item.text.length;
            
            if (item.text.length > MAX_CONTENT_LENGTH) {
              truncated = true;
              return {
                type: 'text',
                text: item.text.substring(0, MAX_CONTENT_LENGTH) + 
                  `... [Content truncated from ${item.text.length} characters due to length limits]`
              };
            }
          }
          return item;
        });
        
        if (truncated) {
          console.warn(`Multimodal message at index ${i} had text content truncated`);
          validatedMessages[i] = {
            ...message,
            content: newContent
          };
        }
      }
    }
  }
  
  console.log(`Total message payload size: ${totalSize} characters`);
  return validatedMessages;
}

serve(async (req) => {
  // Handle CORS preflight requests immediately
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  const requestStartTime = Date.now();
  console.log(`Anthropic proxy request received at ${new Date().toISOString()}`);
  
  try {
    // Validate request method
    if (req.method !== 'POST') {
      console.error(`Invalid method: ${req.method}`);
      return new Response(
        JSON.stringify({ error: { message: 'Method not allowed' } }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the request body
    let body;
    try {
      body = await req.json();
      console.log(`Request parsed successfully, payload size: ${JSON.stringify(body).length} bytes`);
    } catch (e) {
      console.error("Error parsing request body as JSON:", e);
      return new Response(
        JSON.stringify({ error: { message: 'Invalid JSON in request body' } }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Try multiple sources for the API key with better error handling
    let apiKey = body.apiKey;
    let apiKeySource = "request body";
    
    // If no API key in request, try environment variable
    if (!apiKey) {
      apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      apiKeySource = "environment variable";
    }
    
    if (!apiKey) {
      console.error("No API key found");
      return new Response(
        JSON.stringify({ 
          error: { 
            message: 'API key is required. Please provide it in the request or set the ANTHROPIC_API_KEY environment variable.',
            code: 'missing_api_key'
          } 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Using API key from ${apiKeySource}`);

    // Get the payload from the body or create a default one
    const payload = body.payload || {};
    
    // Check if the message payload is too large and validate/truncate if needed
    const validatedMessages = validateMessagePayload(payload.messages || []);
    
    // Ensure model is set with better defaults for reliability
    const model = payload.model || 'claude-3-sonnet-20240229';
    console.log(`Using Anthropic model: ${model}`);
    
    const requestPayload = {
      model: model,
      max_tokens: payload.max_tokens || 4000,
      messages: validatedMessages,
      temperature: payload.temperature !== undefined ? payload.temperature : 0.7,
    };

    // IMPORTANT: Only include response_format if it's provided in the original payload
    if (payload.response_format && 
        typeof payload.response_format === 'object' && 
        payload.response_format.type) {
      requestPayload.response_format = payload.response_format;
      console.log(`Using custom response format: ${JSON.stringify(payload.response_format)}`);
    }

    // Log request info with more details
    console.log(`Making request to Anthropic API with ${requestPayload.messages.length} messages`);
    console.log(`Model: ${requestPayload.model}, Temperature: ${requestPayload.temperature}, Max tokens: ${requestPayload.max_tokens}`);
    
    // Set up timeout handling - 25 seconds to ensure we can return before the Edge Function times out
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("Request timed out after 25 seconds, aborting");
      controller.abort();
    }, 25000);
    
    try {
      // Use the retry function for better reliability
      const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      }, 2); // Retry up to 2 times
      
      // Clear the timeout as we got a response
      clearTimeout(timeoutId);

      // Parse the Anthropic response
      const data = await response.json();
      
      const requestDuration = Date.now() - requestStartTime;
      console.log(`Anthropic API call completed successfully in ${requestDuration}ms`);
      
      // Return the successful response
      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (fetchError) {
      // Clear the timeout if it's still active
      clearTimeout(timeoutId);
      
      console.error("Fetch error:", fetchError);
      
      // Handle specific error cases
      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Request timed out. The analysis request may be too complex or large. Try with less content or break it into smaller pieces.',
              code: 'timeout',
              details: { name: fetchError.name }
            }
          }),
          {
            status: 504, // Gateway Timeout
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Handle authentication errors
      if (fetchError.status === 401) {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Invalid API key. Please check your Anthropic API key and try again.',
              code: 'invalid_api_key',
              details: { status: fetchError.status }
            }
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Handle rate limit errors
      if (fetchError.status === 429) {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Rate limit exceeded. Please try again later or reduce your request frequency.',
              code: 'rate_limit',
              details: { status: fetchError.status }
            }
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Generic API error response
      return new Response(
        JSON.stringify({
          error: {
            message: `Error connecting to Anthropic API: ${fetchError.message || 'Unknown error'}`,
            code: 'api_error',
            details: { status: fetchError.status, error: fetchError.details }
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    const requestDuration = Date.now() - requestStartTime;
    console.error(`Unhandled error after ${requestDuration}ms:`, error);
    
    return new Response(
      JSON.stringify({
        error: {
          message: 'Internal server error in Edge Function',
          code: 'server_error',
          details: { message: error.message }
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
