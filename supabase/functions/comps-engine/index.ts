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

async function fetchPeerData(ticker: string): Promise<PeerData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryProfile,financialData,defaultKeyStatistics,price`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { return null; }

    const result = json?.quoteSummary?.result?.[0];
    if (!result) return null;

    const price = result.price || {};
    const fin = result.financialData || {};
    const stats = result.defaultKeyStatistics || {};

    const name = price.shortName || price.longName || ticker;
    if (!name) return null;

    const revenueGrowth = fin.revenueGrowth?.raw ?? null;
    const ebitdaMargin = fin.ebitdaMargins?.raw ?? null;

    return {
      company: name,
      ticker: price.symbol || ticker,
      evEbitda: fmt(stats.enterpriseToEbitda?.raw ?? null),
      evRevenue: fmt(stats.enterpriseToRevenue?.raw ?? null),
      pe: fmt(stats.trailingPE?.raw ?? price.trailingPE?.raw ?? null),
      revGrowth: fmtPct(revenueGrowth),
      ebitdaMargin: fmtPct(ebitdaMargin),
      marketCap: formatNumber(price.marketCap?.raw ?? null),
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

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetData = await fetchPeerData(ticker);

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

    const peerResults = await Promise.all(
      peerTickers.map((t: string) => fetchPeerData(t))
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