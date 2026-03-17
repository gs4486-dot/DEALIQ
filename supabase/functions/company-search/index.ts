import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");

    if (!query || query.length < 1) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FMP_KEY = Deno.env.get("FMP_API_KEY");
    if (!FMP_KEY) {
      return new Response(JSON.stringify({ error: "FMP_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      `https://financialmodelingprep.com/stable/search?query=${encodeURIComponent(query)}&limit=5&apikey=${FMP_KEY}`
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("FMP search error:", res.status, errText);
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const results = (Array.isArray(data) ? data : []).map((item: any) => ({
      symbol: item.symbol,
      name: item.name,
      exchange: item.stockExchange || item.exchangeShortName || "",
    }));

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("company-search error:", e);
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
