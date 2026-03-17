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

async function fetchFMPData(ticker: string, fmpKey: string): Promise<CompanyData> {
  const base = "https://financialmodelingprep.com/api/v3";
  const [profileRes, metricsRes, ratiosRes, growthRes] = await Promise.all([
    fetch(`${base}/profile/${ticker}?apikey=${fmpKey}`),
    fetch(`${base}/key-metrics/${ticker}?limit=1&apikey=${fmpKey}`),
    fetch(`${base}/ratios/${ticker}?limit=1&apikey=${fmpKey}`),
    fetch(`${base}/financial-growth/${ticker}?limit=2&apikey=${fmpKey}`),
  ]);

  const [profText, metText, ratText, groText] = await Promise.all([
    profileRes.text(), metricsRes.text(), ratiosRes.text(), growthRes.text(),
  ]);

  const safeParse = (t: string) => { try { return JSON.parse(t); } catch { console.error("FMP parse error:", t.substring(0, 200)); return []; } };

  const profile = safeParse(profText);
  const metrics = safeParse(metText);
  const ratios = safeParse(ratText);
  const growth = safeParse(groText);

  const p = Array.isArray(profile) ? profile[0] : profile;
  const m = Array.isArray(metrics) ? metrics[0] : metrics;
  const r = Array.isArray(ratios) ? ratios[0] : ratios;
  const g = Array.isArray(growth) ? growth : [];

  const revenueGrowth = g.length > 1 ? g[1]?.revenueGrowth : g[0]?.revenueGrowth;

  return {
    companyName: p?.companyName ?? ticker,
    symbol: p?.symbol ?? ticker,
    sector: p?.sector ?? "N/A",
    marketCap: m?.marketCap ?? p?.mktCap ?? null,
    enterpriseValue: m?.enterpriseValue ?? null,
    evToSales: m?.evToSales ?? null,
    evToEBITDA: m?.evToEBITDA ?? null,
    ebitdaMargin: r?.ebitdaMargin ?? null,
    priceToEarningsRatio: r?.priceToEarningsRatio ?? null,
    revenueGrowth: revenueGrowth ?? null,
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

    const FMP_KEY = Deno.env.get("FMP_API_KEY");
    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!FMP_KEY) {
      return new Response(JSON.stringify({ error: "FMP_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ANTHROPIC_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [acquirerData, targetData] = await Promise.all([
      fetchFMPData(acquirerTicker, FMP_KEY),
      fetchFMPData(targetTicker, FMP_KEY),
    ]);

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

Target: ${targetData.companyName} (${targetData.symbol})
- Sector: ${targetData.sector}
- Market Cap: ${formatNumber(targetData.marketCap)}, EV: ${formatNumber(targetData.enterpriseValue)}
- EV/EBITDA: ${formatMultiple(targetData.evToEBITDA)}, EV/Revenue: ${formatMultiple(targetData.evToSales)}
- Revenue Growth: ${formatPercent(targetData.revenueGrowth)}, EBITDA Margin: ${formatPercent(targetData.ebitdaMargin)}

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