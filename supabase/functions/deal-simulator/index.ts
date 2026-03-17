import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CompanyData {
  companyName: string;
  symbol: string;
  sector: string;
  marketCap: number | null;
  enterpriseValue: number | null;
  evToSales: number | null;
  evToEBITDA: number | null;
  ebitdaMargin: number | null;
  priceToEarningsRatio: number | null;
  revenueGrowth: number | null;
}

async function fetchAlphaVantageData(ticker: string, avKey: string): Promise<CompanyData> {
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${avKey}`;
  const res = await fetch(url);
  const text = await res.text();

  let data: any;
  try { data = JSON.parse(text); } catch {
    console.error("AV non-JSON:", text.substring(0, 200));
    throw new Error(`Alpha Vantage error for ${ticker}`);
  }

  if (data["Error Message"]) {
    throw new Error(`AV error: ${data["Error Message"]}`);
  }
  if (data["Note"]) {
    throw new Error(`AV rate limit: ${data["Note"]}`);
  }
  if (data["Information"]) {
    throw new Error(`AV info: ${data["Information"]}`);
  }

  console.log(`AV response keys for ${ticker}:`, Object.keys(data).join(", "), "| first values:", JSON.stringify(data).substring(0, 300));

  if (!data["Symbol"]) {
    throw new Error(`No data found for ${ticker}. Response: ${JSON.stringify(data).substring(0, 200)}`);
  }

  const parseNum = (v: string | undefined) => {
    if (!v || v === "None" || v === "-") return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const marketCap = parseNum(data["MarketCapitalization"]);
  const ebitda = parseNum(data["EBITDA"]);
  const revenue = parseNum(data["RevenueTTM"]);
  const ev = marketCap; // AV doesn't provide EV directly; approximate
  const evToEBITDA = (ev && ebitda && ebitda > 0) ? ev / ebitda : null;
  const evToSales = (ev && revenue && revenue > 0) ? ev / revenue : null;
  const ebitdaMargin = (ebitda && revenue && revenue > 0) ? ebitda / revenue : null;
  const revenueGrowth = parseNum(data["QuarterlyRevenueGrowthYOY"]);

  return {
    companyName: data["Name"] || ticker,
    symbol: data["Symbol"] || ticker,
    sector: data["Sector"] || "N/A",
    marketCap,
    enterpriseValue: ev,
    evToSales,
    evToEBITDA,
    ebitdaMargin,
    priceToEarningsRatio: parseNum(data["TrailingPE"]),
    revenueGrowth,
  };
}

function formatNumber(val: number | null): string {
  if (val === null || val === undefined) return "N/A";
  if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toFixed(1)}`;
}

function formatMultiple(val: number | null): string {
  if (val === null || val === undefined) return "N/A";
  return `${val.toFixed(1)}x`;
}

function formatPercent(val: number | null): string {
  if (val === null || val === undefined) return "N/A";
  return `${(val * 100).toFixed(1)}%`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { acquirerTicker, targetTicker, dealStructure, viewMode } = await req.json();

    if (!acquirerTicker || !targetTicker) {
      return new Response(JSON.stringify({ error: "Both acquirerTicker and targetTicker are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AV_KEY = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!AV_KEY) {
      return new Response(JSON.stringify({ error: "ALPHA_VANTAGE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sequentially with delay to respect AV rate limit (1 req/sec)
    const acquirerData = await fetchAlphaVantageData(acquirerTicker, AV_KEY);
    await new Promise(r => setTimeout(r, 1200));
    const targetData = await fetchAlphaVantageData(targetTicker, AV_KEY);

    const fmt = (d: CompanyData) => ({
      name: d.companyName,
      ticker: d.symbol,
      sector: d.sector,
      marketCap: formatNumber(d.marketCap),
      ev: formatNumber(d.enterpriseValue),
      evEbitda: formatMultiple(d.evToEBITDA),
      evRevenue: formatMultiple(d.evToSales),
      revenueGrowth: formatPercent(d.revenueGrowth),
      ebitdaMargin: formatPercent(d.ebitdaMargin),
    });

    const acquirerFormatted = fmt(acquirerData);
    const targetFormatted = fmt(targetData);

    const context = `
Acquirer: ${acquirerData.companyName} (${acquirerData.symbol})
- Sector: ${acquirerData.sector}
- Market Cap: ${formatNumber(acquirerData.marketCap)}, EV: ${formatNumber(acquirerData.enterpriseValue)}
- EV/EBITDA: ${formatMultiple(acquirerData.evToEBITDA)}, EV/Revenue: ${formatMultiple(acquirerData.evToSales)}
- Revenue Growth: ${formatPercent(acquirerData.revenueGrowth)}, EBITDA Margin: ${formatPercent(acquirerData.ebitdaMargin)}
- P/E: ${formatMultiple(acquirerData.priceToEarningsRatio)}

Target: ${targetData.companyName} (${targetData.symbol})
- Sector: ${targetData.sector}
- Market Cap: ${formatNumber(targetData.marketCap)}, EV: ${formatNumber(targetData.enterpriseValue)}
- EV/EBITDA: ${formatMultiple(targetData.evToEBITDA)}, EV/Revenue: ${formatMultiple(targetData.evToSales)}
- Revenue Growth: ${formatPercent(targetData.revenueGrowth)}, EBITDA Margin: ${formatPercent(targetData.ebitdaMargin)}
- P/E: ${formatMultiple(targetData.priceToEarningsRatio)}

Deal Structure: ${dealStructure || "all-cash"}
`.trim();

    const systemPrompt = viewMode === "pe-associate"
      ? "You are a Private Equity Associate at KKR. Write in returns-focused investment committee memo style. Reference actual metrics, focus on EBITDA expansion, leverage, and exit multiple."
      : "You are a Senior M&A Analyst at Goldman Sachs. Write in precise, data-driven Goldman Sachs pitch book style. Reference the actual numbers provided. Be specific and avoid generic language.";

    async function callClaude(userPrompt: string): Promise<string> {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_KEY!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Claude API error:", res.status, errText);
        throw new Error(`Claude API error: ${res.status}`);
      }
      const data = await res.json();
      return data.content?.[0]?.text ?? "";
    }

    const [rationaleText, synergiesText, flagsText] = await Promise.all([
      callClaude(`Given these two companies and deal context:\n\n${context}\n\nWrite a strategic rationale for this acquisition in 4-5 sentences. Reference the actual financial metrics provided.`),
      callClaude(`Given these two companies and deal context:\n\n${context}\n\nReturn ONLY a JSON object with two arrays:\n{"synergies": ["synergy1", "synergy2", "synergy3"], "risks": ["risk1", "risk2", "risk3"]}\n\nEach synergy should include specific dollar magnitude estimates where possible. Each risk should be specific and reference actual metrics. No markdown, no explanation — just the JSON.`),
      callClaude(`Given these two companies and deal context:\n\n${context}\n\nReturn ONLY a JSON object:\n{"flags": ["flag1", "flag2", "flag3"]}\n\nEach flag should identify one quantitative or structural red flag referencing actual numbers. No markdown, no explanation — just the JSON.`),
    ]);

    let synergies = ["Analysis unavailable"];
    let integrationRisks = ["Analysis unavailable"];
    let riskFlags = ["Analysis unavailable"];

    try {
      const j = JSON.parse(synergiesText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      synergies = j.synergies || synergies;
      integrationRisks = j.risks || integrationRisks;
    } catch (e) { console.error("Failed to parse synergies:", e); }

    try {
      const j = JSON.parse(flagsText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      riskFlags = j.flags || riskFlags;
    } catch (e) { console.error("Failed to parse flags:", e); }

    return new Response(
      JSON.stringify({ acquirerData: acquirerFormatted, targetData: targetFormatted, rationale: rationaleText, synergies, integrationRisks, riskFlags }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("deal-simulator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});