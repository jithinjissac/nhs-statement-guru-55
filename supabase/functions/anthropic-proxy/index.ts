
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

    // Validate required fields
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      console.error("Missing or invalid messages array in request");
      return new Response(
        JSON.stringify({ error: { message: 'Missing or invalid messages array' } }),
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

    // Remove apiKey from the payload before sending to Anthropic
    const { apiKey: _, ...cleanPayload } = body;

    // Ensure model is set
    const payload = {
      ...cleanPayload,
      model: body.model || 'claude-3-sonnet-20240229',
      response_format: body.response_format || { type: "json_object" }
    };

    console.log(`Making request to Anthropic API with ${payload.messages.length} messages`);
    console.log(`Model: ${payload.model}`);

    // Make the request to Anthropic API with improved error handling
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    // Check if response is ok
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
          status: errorStatus,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the Anthropic response
    const data = await response.json();
    console.log("Anthropic API response received successfully");
    
    // Validate response before returning
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error("Invalid response structure from Anthropic API:", JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ error: { message: 'Invalid response structure from Anthropic API' } }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return the successful response
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
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
