
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Utility function to add retry logic
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries}`);
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
      
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      // Don't retry if it's an abort error
      if (error.name === 'AbortError') {
        throw error;
      }
    }
  }
  throw lastError;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

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
      console.log("Request received with valid JSON");
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

    // Get the API key from various sources with improved error handling
    let apiKey = body.apiKey;
    
    // If no API key in request, try environment variable
    if (!apiKey) {
      apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      console.log("Using API key from environment variable");
    }
    
    if (!apiKey) {
      console.error("No API key available");
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

    // Get the payload from the body or create a default one
    const payload = body.payload || {};
    
    // Check if the message payload is too large
    const messageSize = JSON.stringify(payload.messages || []).length;
    if (messageSize > 100000) {
      console.warn(`Large message payload: ${messageSize} bytes`);
    }
    
    // Ensure model is set with better defaults for reliability
    const requestPayload = {
      model: payload.model || 'claude-3-sonnet-20240229',
      max_tokens: payload.max_tokens || 4000,
      messages: payload.messages || [],
      temperature: payload.temperature !== undefined ? payload.temperature : 0.85,
      // Lower timeout value for more reliability (Anthropic recommends this)
      timeout: 30
    };

    // IMPORTANT: Only include response_format if it's provided in the original payload
    if (payload.response_format) {
      if (typeof payload.response_format === 'object' && payload.response_format.type) {
        requestPayload.response_format = payload.response_format;
      } else {
        console.log("Invalid response_format provided, skipping");
      }
    }

    // Log request info with message count and size
    console.log(`Making request to Anthropic API with ${requestPayload.messages.length} messages`);
    console.log(`Model: ${requestPayload.model}, Temperature: ${requestPayload.temperature}`);
    console.log(`Total payload size: ${JSON.stringify(requestPayload).length} bytes`);
    
    // Set up timeout handling with a shorter window (25 seconds)
    // This ensures we can return a proper timeout response before the Edge Function itself times out
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
      }, 1); // Only retry once to avoid timeouts
      
      // Clear the timeout as we got a response
      clearTimeout(timeoutId);

      // If response is not ok, handle error
      if (!response.ok) {
        const errorStatus = response.status;
        let errorData;
        
        try {
          // Try to parse error response as JSON
          errorData = await response.json();
        } catch {
          // If not JSON, get as text
          const errorText = await response.text();
          errorData = { message: errorText || 'Unknown error from Anthropic API' };
        }
        
        // Log detailed error information
        console.error(`Anthropic API error (${errorStatus}):`, JSON.stringify(errorData));
        
        // Map common error codes to more helpful messages
        let userMessage = `Anthropic API error: ${errorStatus}`;
        
        if (errorStatus === 401) {
          userMessage = 'Invalid API key. Please check your Anthropic API key and try again.';
        } else if (errorStatus === 429) {
          userMessage = 'Rate limit exceeded. Please try again later or reduce your request frequency.';
        } else if (errorStatus === 408 || errorStatus === 504) {
          userMessage = 'The request to Anthropic timed out. Try again with shorter messages.';
        } else if (errorStatus === 500) {
          userMessage = 'Anthropic API server error. Please try again later.';
        } else if (errorStatus === 413) {
          userMessage = 'The request is too large. Try reducing the amount of text you are analyzing.';
        }
        
        return new Response(
          JSON.stringify({ 
            error: { 
              message: userMessage,
              status: errorStatus,
              details: errorData 
            } 
          }),
          {
            status: 502, // Return 502 Bad Gateway instead of passing through the original status code
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Parse the Anthropic response
      const data = await response.json();
      console.log("Anthropic API call completed successfully");
      console.log(`Response size: ${JSON.stringify(data).length} bytes`);
      
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
      
      // Handle abort/timeout errors specially
      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Request timed out. The analysis request is likely too complex or large. Try with less content or break it into smaller pieces.',
              details: { name: fetchError.name, message: fetchError.message }
            }
          }),
          {
            status: 504, // Gateway Timeout
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Handle other fetch errors
      return new Response(
        JSON.stringify({
          error: {
            message: 'Error connecting to Anthropic API. Please try again or check your network connection.',
            details: { name: fetchError.name, message: fetchError.message }
          }
        }),
        {
          status: 502, // Bad Gateway
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error("Unhandled error in Edge Function:", error);
    return new Response(
      JSON.stringify({
        error: {
          message: 'Internal Server Error in Edge Function',
          details: error.message
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
