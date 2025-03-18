
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for the response
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the anthropic key from the environment variables
    // This is the key stored in Supabase's Edge Function secrets
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured on the server" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse the request body
    const requestData = await req.json();
    console.log("Received request for Anthropic API:", {
      model: requestData.model,
      messageCount: requestData.messages?.length || 0,
      maxTokens: requestData.max_tokens
    });

    // Forward the request to Anthropic API
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestData)
    });

    // Get the response data
    const responseData = await anthropicResponse.json();
    const status = anthropicResponse.status;
    
    if (!anthropicResponse.ok) {
      console.error("Anthropic API error:", status, responseData);
      return new Response(
        JSON.stringify({ 
          error: responseData.error || "Unknown error from Anthropic API",
          status: status
        }),
        { 
          status: status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Anthropic API call successful");
    
    // Return the API response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in Anthropic proxy:", error.message);
    
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
