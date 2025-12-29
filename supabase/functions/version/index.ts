import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const VERSION = Deno.env.get("LUMIO_VERSION") || "unknown";
const BUILD_NUMBER = Deno.env.get("BUILD_NUMBER") || "unknown";
const GIT_SHA = Deno.env.get("GIT_SHA") || "unknown";
const BUILD_DATE = Deno.env.get("BUILD_DATE") || new Date().toISOString();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "X-Lumio-Version": VERSION,
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const response = {
    version: VERSION,
    buildNumber: BUILD_NUMBER,
    gitSha: GIT_SHA,
    buildDate: BUILD_DATE,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
