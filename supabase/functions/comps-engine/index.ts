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

async function fetchPeerData(ticker: string, avKey: string): Promise<PeerData | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${avKey}`;
    const res = await fetch(url);
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { return null; }

    if (!data["Symbol"] || data["Error Message"] || data["Note"]) return null;

    const parseNum = (v: string | undefined) => {
      if (!v || v === "None" || v === "-") return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };

    const marketCap = parseNum(data["MarketCapitalization"]);
    const ebitda = parseNum(data["EBITDA"]);
    const revenue = parseNum(data["RevenueTTM"]);
    const ev = marketCap;
    const evToEBITDA = (ev && ebitda && ebitda > 0) ? ev / ebitda : null;
    const evToSales = (ev && revenue && revenue > 0) ? ev / revenue : null;
    const ebitdaMargin = (ebitda && revenue && revenue > 0) ? ebitda / revenue : null;
    const revenueGrowth = parseNum(data["QuarterlyRevenueGrowthYOY"]);

    return {
      company: data["Name"] || ticker,
      ticker: data["Symbol"] || ticker,
      evEbitda: fmt(evToEBITDA),
      evRevenue: fmt(evToSales),
      pe: fmt(parseNum(data["TrailingPE"])),
      revGrowth: fmtPct(revenueGrowth),
      ebitdaMargin: fmtPct(ebitdaMargin),
      marketCap: formatNumber(marketCap),
    };
  } catch (e) {
    console.error(`Error fetching data for ${ticker}:`, e);
    return null;
  }
}

// Fetch peers sequentially with delay to respect AV rate limits (5 req/min free tier)
async function fetchPeersSequentially(tickers: string[], avKey: string): Promise<PeerData[]> {
  const results: PeerData[] = [];
  for (const ticker of tickers) {
    const data = await fetchPeerData(ticker, avKey);
    if (data) results.push(data);
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1200));
  }
  return results;
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

    const AV_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!AV_KEY || !ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: "API keys not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetData = await fetchPeerData(ticker, AV_KEY);

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
          content: `Identify 2-3 of the most comparable US public companies for ${ticker}${sector ? ` in the ${sector} sector` : ""}${revenueRange && revenueRange !== "Any" ? ` with revenue ${revenueRange}` : ""}.

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

    // Fetch peers sequentially to respect rate limits
    const peers = await fetchPeersSequentially(peerTickers, AV_KEY);

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