
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
      console.error("Anthropic API key not found in environment variables");
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured on the server" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate required fields
    if (!requestData.model) {
      console.error("Missing required field: model");
      return new Response(
        JSON.stringify({ error: "Missing required field: model" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!requestData.messages || !Array.isArray(requestData.messages) || requestData.messages.length === 0) {
      console.error("Missing or invalid required field: messages");
      return new Response(
        JSON.stringify({ error: "Missing or invalid required field: messages" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Log request details
    console.log("Received request for Anthropic API:", {
      model: requestData.model,
      messageCount: requestData.messages?.length || 0,
      maxTokens: requestData.max_tokens,
      responseFormat: requestData.response_format || "not specified",
      firstMessagePreview: requestData.messages && requestData.messages.length > 0 
        ? requestData.messages[0].content.substring(0, 100) + "..." 
        : "no messages"
    });

    // Ensure response_format is set for JSON output
    if (!requestData.response_format) {
      requestData.response_format = { type: "json_object" };
      console.log("Added JSON response format to request");
    }
    
    // Ensure max_tokens is set
    if (!requestData.max_tokens) {
      requestData.max_tokens = 4000;
      console.log("Set default max_tokens to 4000");
    }

    // Forward the request to Anthropic API
    console.log("Sending request to Anthropic API...");
    let anthropicResponse;
    try {
      anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(requestData)
      });
    } catch (fetchError) {
      console.error("Network error when calling Anthropic API:", fetchError);
      return new Response(
        JSON.stringify({ error: "Network error when calling Anthropic API" }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the response data
    let responseData;
    try {
      responseData = await anthropicResponse.json();
    } catch (jsonError) {
      console.error("Error parsing Anthropic API response:", jsonError);
      return new Response(
        JSON.stringify({ error: "Error parsing Anthropic API response" }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const status = anthropicResponse.status;
    
    if (!anthropicResponse.ok) {
      console.error("Anthropic API error:", status, responseData);
      return new Response(
        JSON.stringify({ 
          error: responseData.error || "Unknown error from Anthropic API",
          status: status,
          details: responseData
        }),
        { 
          status: status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Anthropic API call successful");
    console.log("Response status:", status);
    console.log("Response preview:", JSON.stringify(responseData).substring(0, 200) + "...");
    
    // Validate that the response contains valid JSON in the content field if using json_object format
    if (requestData.response_format?.type === "json_object") {
      try {
        if (responseData.content && 
            Array.isArray(responseData.content) && 
            responseData.content.length > 0 && 
            responseData.content[0] && 
            responseData.content[0].text) {
          // Try parsing the JSON to verify it's valid
          const jsonContent = responseData.content[0].text;
          console.log("Content text preview:", jsonContent.substring(0, 100) + "...");
          try {
            JSON.parse(jsonContent);
            console.log("Validated JSON response format is valid");
          } catch (jsonParseError) {
            console.error("Warning: Anthropic returned invalid JSON despite json_object format:", jsonParseError);
            console.error("First 200 chars of content:", jsonContent.substring(0, 200));
            // We don't fail here, as the client will handle the sanitization
          }
        } else {
          console.warn("Unexpected response structure from Anthropic API", 
            JSON.stringify(responseData).substring(0, 200));
        }
      } catch (contentValidationError) {
        console.error("Error validating content structure:", contentValidationError);
        // Continue without failing
      }
    }
    
    // Return the API response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Unexpected error in Anthropic proxy:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: `Server error: ${error.message}`,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
