import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PeerData {
  company: string;
  ticker: string;
  evEbitda: string;
  evRevenue: string;
  pe: string;
  revGrowth: string;
  ebitdaMargin: string;
  marketCap: string;
}

function formatNumber(val: number | null): string {
  if (val === null || val === undefined) return "N/A";
  if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toFixed(1)}`;
}

function fmt(val: number | null, suffix = "x"): string {
  if (val === null || val === undefined || isNaN(val)) return "N/A";
  return `${val.toFixed(1)}${suffix}`;
}

function fmtPct(val: number | null): string {
  if (val === null || val === undefined || isNaN(val)) return "N/A";
  return `${(val * 100).toFixed(1)}%`;
}

async function fetchPeerData(ticker: string, fmpKey: string): Promise<PeerData | null> {
  try {
    const [profileRes, metricsRes, ratiosRes, growthRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${fmpKey}`),
      fetch(`https://financialmodelingprep.com/stable/key-metrics?symbol=${ticker}&limit=1&apikey=${fmpKey}`),
      fetch(`https://financialmodelingprep.com/stable/ratios?symbol=${ticker}&limit=1&apikey=${fmpKey}`),
      fetch(`https://financialmodelingprep.com/stable/financial-growth?symbol=${ticker}&limit=2&apikey=${fmpKey}`),
    ]);

    const [profile, metrics, ratios, growth] = await Promise.all([
      profileRes.json(), metricsRes.json(), ratiosRes.json(), growthRes.json(),
    ]);

    const p = Array.isArray(profile) ? profile[0] : profile;
    const m = Array.isArray(metrics) ? metrics[0] : metrics;
    const r = Array.isArray(ratios) ? ratios[0] : ratios;
    const g = Array.isArray(growth) ? growth : [];

    if (!p?.companyName) return null;

    const revenueGrowth = g.length > 1 ? g[1]?.revenueGrowth : g[0]?.revenueGrowth;

    return {
      company: p.companyName,
      ticker: p.symbol,
      evEbitda: fmt(m?.evToEBITDA),
      evRevenue: fmt(m?.evToSales),
      pe: fmt(r?.priceToEarningsRatio),
      revGrowth: fmtPct(revenueGrowth),
      ebitdaMargin: fmtPct(r?.ebitdaMargin),
      marketCap: formatNumber(m?.marketCap ?? p?.mktCap),
    };
  } catch (e) {
    console.error(`Error fetching data for ${ticker}:`, e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticker, sector, revenueRange } = await req.json();

    if (!ticker) {
      return new Response(JSON.stringify({ error: "ticker is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FMP_KEY = Deno.env.get("FMP_API_KEY");
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!FMP_KEY || !ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: "API keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Get target company data
    const targetData = await fetchPeerData(ticker, FMP_KEY);

    // Step 2: Ask Claude to identify comparable companies
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: "You are a senior equity research analyst. Identify comparable publicly traded US companies for valuation analysis.",
        messages: [{
          role: "user",
          content: `Identify 8-10 comparable US public companies for ${ticker}${sector ? ` in the ${sector} sector` : ""}${revenueRange && revenueRange !== "Any" ? ` with revenue ${revenueRange}` : ""}.

Return ONLY a JSON object with no markdown:
{"tickers": ["TICK1", "TICK2", ...], "rationale": "3-4 sentence explanation of why these peers were selected."}

Focus on sector alignment, similar business models, and comparable revenue scale. Only include actively traded US stocks.`,
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("Claude error:", claudeRes.status, errText);
      throw new Error(`Claude API error: ${claudeRes.status}`);
    }

    const claudeData = await claudeRes.json();
    const claudeText = claudeData.content?.[0]?.text ?? "";

    let peerTickers: string[] = [];
    let rationale = "";

    try {
      const parsed = JSON.parse(claudeText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      peerTickers = parsed.tickers || [];
      rationale = parsed.rationale || "";
    } catch (e) {
      console.error("Failed to parse Claude peer response:", e, claudeText);
      return new Response(JSON.stringify({ error: "Failed to parse AI peer selection" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Fetch FMP data for all peers in parallel
    const peerResults = await Promise.all(
      peerTickers.map((t: string) => fetchPeerData(t, FMP_KEY))
    );

    const peers = peerResults.filter((p): p is PeerData => p !== null);

    return new Response(
      JSON.stringify({ target: targetData, peers, rationale }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("comps-engine error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
