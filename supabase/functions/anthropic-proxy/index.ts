
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    
    // Ensure model is set
    const requestPayload = {
      model: payload.model || 'claude-3-sonnet-20240229',
      max_tokens: payload.max_tokens || 4000,
      messages: payload.messages || [],
      temperature: payload.temperature || 0.85
    };

    // IMPORTANT: Only include response_format if it's provided in the original payload
    // This avoids potential API errors if response_format is not properly formatted
    if (payload.response_format) {
      if (typeof payload.response_format === 'object' && payload.response_format.type) {
        requestPayload.response_format = payload.response_format;
      } else {
        console.log("Invalid response_format provided, using default");
      }
    }

    // Log request info
    console.log(`Making request to Anthropic API with ${requestPayload.messages.length} messages`);
    console.log(`Model: ${requestPayload.model}, Temperature: ${requestPayload.temperature}`);
    
    // Set up timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });
      
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
          userMessage = 'Rate limit exceeded. Please try again later.';
        } else if (errorStatus === 500) {
          userMessage = 'Anthropic API server error. Please try again later.';
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
              message: 'Request timed out. The Anthropic API took too long to respond.',
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
            message: 'Error connecting to Anthropic API',
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
