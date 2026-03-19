import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });
console.log("ANTHROPIC KEY:", process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.slice(0,8) + "..." : "MISSING");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;

/** Format a raw dollar value: $1.2T / $3.5B / $450M */
const fmtMoney = (v) => {
  if (!v) return "N/A";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  return `$${(v / 1e6).toFixed(0)}M`;
};

async function getCompanyData(ticker) {
  console.log("Fetching Yahoo Finance data for:", ticker);

  const [quote, summary] = await Promise.all([
    yahooFinance.quote(ticker),
    yahooFinance.quoteSummary(ticker, {
      modules: ["summaryProfile", "financialData", "defaultKeyStatistics"],
    }),
  ]);

  const keyStats = summary.defaultKeyStatistics || {};
  const finData  = summary.financialData || {};
  const profile  = summary.summaryProfile || {};

  const mktCap        = quote.marketCap || 0;
  const ev            = keyStats.enterpriseValue || 0;
  const evEbitda      = keyStats.enterpriseToEbitda;
  const evRevenue     = keyStats.enterpriseToRevenue;
  const revGrowth     = finData.revenueGrowth;
  const ebitdaMargin  = finData.ebitdaMargins;
  const totalRevenue  = finData.totalRevenue || 0;
  const ebitdaAbs     = finData.ebitda || 0;
  const trailingEps   = keyStats.trailingEps != null ? Number(keyStats.trailingEps) : null;
  // Yahoo Finance returns debtToEquity as a percentage (e.g. 34 = 34% D/E = 0.34 ratio)
  const debtToEquity  = finData.debtToEquity != null ? Number(finData.debtToEquity) / 100 : null;

  const sharesOutstanding = keyStats.sharesOutstanding || 0;
  const currentPrice      = quote.regularMarketPrice || 0;

  console.log("Name:", quote.longName);
  console.log("Market Cap:", fmtMoney(mktCap));
  console.log("EV:", fmtMoney(ev));
  console.log("EV/EBITDA:", evEbitda != null ? `${evEbitda.toFixed(1)}x` : "N/A");
  console.log("EV/Revenue:", evRevenue != null ? `${evRevenue.toFixed(1)}x` : "N/A");
  console.log("Revenue Growth:", revGrowth != null ? `${(revGrowth*100).toFixed(1)}%` : "N/A");
  console.log("EBITDA Margin:", ebitdaMargin != null ? `${(ebitdaMargin*100).toFixed(1)}%` : "N/A");

  return {
    name:          quote.longName || quote.shortName || ticker,
    ticker:        quote.symbol || ticker,
    marketCap:     fmtMoney(mktCap),
    ev:            fmtMoney(ev),
    evEbitda:      evEbitda != null ? `${Number(evEbitda).toFixed(1)}x` : "N/A",
    evRevenue:     evRevenue != null ? `${Number(evRevenue).toFixed(1)}x` : "N/A",
    revenueGrowth: revGrowth != null ? `${(Number(revGrowth) * 100).toFixed(1)}%` : "N/A",
    ebitdaMargin:  ebitdaMargin != null ? `${(Number(ebitdaMargin) * 100).toFixed(1)}%` : "N/A",
    totalRevenue:  fmtMoney(totalRevenue),
    ebitda:        ebitdaAbs ? fmtMoney(ebitdaAbs) : "N/A",
    // raw values for calculations
    rawEv:           ev,
    rawMktCap:       mktCap,
    rawEvEbitda:     evEbitda != null ? Number(evEbitda) : null,
    rawEbitdaMargin: ebitdaMargin != null ? Number(ebitdaMargin) : null,
    rawTotalRevenue: totalRevenue,
    rawEbitda:       ebitdaAbs,
    sharesOutstanding,
    currentPrice,
    trailingEps,
    rawDeRatio: debtToEquity,   // Yahoo Finance balance-sheet D/E (total debt / total equity)
    sector:   profile.sector   || "",
    industry: profile.industry || "",
  };
}

async function callClaude(systemPrompt, userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "";
}

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

app.get("/api/search", async (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) return res.json([]);
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`;
    const result = await fetch(url, { headers: YF_HEADERS }).then(r => r.json());
    const quotes = result?.quotes || [];
    res.json(quotes.filter(q => q.quoteType === "EQUITY").map(q => ({
      symbol: q.symbol,
      name:   q.longname || q.shortname || q.symbol,
      exchange: q.exchange,
    })));
  } catch {
    res.json([]);
  }
});

/**
 * Accretion / Dilution calculation.
 * Uses trailing EPS and shares to estimate pro-forma EPS impact.
 * Assumptions: 5.5% cost of debt, 25% tax rate, no synergies (conservative base case).
 */
function computeAccretion(impliedEv, structure, acquirerData, targetData) {
  const acqShares = acquirerData.sharesOutstanding;
  const acqEps    = acquirerData.trailingEps;
  const acqPrice  = acquirerData.currentPrice;

  if (!acqShares || acqEps == null || !acqPrice || acqEps === 0) return null;

  const acqNI  = acqEps * acqShares;
  const tgtNI  = (targetData.trailingEps != null && targetData.sharesOutstanding)
    ? targetData.trailingEps * targetData.sharesOutstanding
    : 0;

  const tgtNetDebt    = (targetData.rawEv || 0) - (targetData.rawMktCap || 0);
  const impliedEquity = impliedEv - tgtNetDebt;
  if (impliedEquity <= 0) return null;

  const COST_OF_DEBT = 0.055;
  const TAX_RATE     = 0.25;

  let proFormaNI, proFormaShares;

  if (structure === "all-cash") {
    const afterTaxInterest = impliedEquity * COST_OF_DEBT * (1 - TAX_RATE);
    proFormaNI     = acqNI + tgtNI - afterTaxInterest;
    proFormaShares = acqShares;
  } else if (structure === "all-stock") {
    const newShares = impliedEquity / acqPrice;
    proFormaShares  = acqShares + newShares;
    proFormaNI      = acqNI + tgtNI;
  } else {
    // mixed 50/50
    const cashHalf         = impliedEquity * 0.5;
    const stockHalf        = impliedEquity * 0.5;
    const afterTaxInterest = cashHalf * COST_OF_DEBT * (1 - TAX_RATE);
    const newShares        = stockHalf / acqPrice;
    proFormaShares         = acqShares + newShares;
    proFormaNI             = acqNI + tgtNI - afterTaxInterest;
  }

  const standaloneEPS = acqNI / acqShares;
  const proFormaEPS   = proFormaNI / proFormaShares;
  if (!isFinite(proFormaEPS)) return null;

  const accretionPct = (proFormaEPS - standaloneEPS) / Math.abs(standaloneEPS);

  return {
    standaloneEPS: standaloneEPS.toFixed(2),
    proFormaEPS:   proFormaEPS.toFixed(2),
    accretionPct:  `${accretionPct >= 0 ? "+" : ""}${(accretionPct * 100).toFixed(1)}%`,
    isAccretive:   accretionPct >= 0,
  };
}

app.post("/api/deal-simulator", async (req, res) => {
  const { acquirerTicker, targetTicker, dealStructure } = req.body;
  if (!acquirerTicker || !targetTicker) {
    return res.status(400).json({ error: "Acquirer and target tickers are required." });
  }

  try {
    const [acquirerData, targetData] = await Promise.all([
      getCompanyData(acquirerTicker.toUpperCase()),
      getCompanyData(targetTicker.toUpperCase()),
    ]);

    // Build metrics string — include absolute revenue & EBITDA so Claude anchors dollar magnitudes
    const metrics = `
Acquirer: ${acquirerData.name} (${acquirerData.ticker})
- Market Cap: ${acquirerData.marketCap}
- EV: ${acquirerData.ev}
- LTM Revenue: ${acquirerData.totalRevenue}
- LTM EBITDA: ${acquirerData.ebitda}
- EV/EBITDA: ${acquirerData.evEbitda}
- EV/Revenue: ${acquirerData.evRevenue}
- Revenue Growth: ${acquirerData.revenueGrowth}
- EBITDA Margin: ${acquirerData.ebitdaMargin}
- Sector: ${acquirerData.sector}

Target: ${targetData.name} (${targetData.ticker})
- Market Cap: ${targetData.marketCap}
- EV: ${targetData.ev}
- LTM Revenue: ${targetData.totalRevenue}
- LTM EBITDA: ${targetData.ebitda}
- EV/EBITDA: ${targetData.evEbitda}
- EV/Revenue: ${targetData.evRevenue}
- Revenue Growth: ${targetData.revenueGrowth}
- EBITDA Margin: ${targetData.ebitdaMargin}
- Sector: ${targetData.sector}

Deal Structure: ${dealStructure}`;

    const systemPrompt = `You are a Senior M&A Analyst at a bulge bracket bank. Be intellectually honest: only cite numbers that are explicitly provided in the data. Never invent synergy dollar estimates, forward revenue projections, or cost savings figures that are not derivable from the given metrics. When a synergy or risk is real but unquantifiable from available data, describe the mechanism clearly without attaching a made-up number. Write in concise pitch book style.`;

    const rationalePrompt = `Analyze the M&A rationale for ${acquirerData.name} acquiring ${targetData.name}. Use only the financial data provided — do not invent numbers. Return ONLY this JSON (no markdown, no other text): {"summary": "One punchy sentence with the core strategic thesis, referencing actual provided metrics where relevant.", "bullets": ["**Strategic fit**: one sentence on the business logic and market positioning.", "**Financial profile**: one sentence referencing actual provided metrics (multiples, margins, growth) to characterize the deal economics.", "**Value creation path**: one sentence on where value could come from — be specific about the mechanism, but do not invent dollar estimates."]}\n\n${metrics}`;

    const synergiesPrompt = `Identify exactly 3 potential synergies and exactly 3 integration execution risks for ${acquirerData.name} acquiring ${targetData.name}. IMPORTANT: Do NOT invent specific dollar synergy estimates or percentages — we do not have the internal cost structure data to support them. Instead, describe each synergy by its mechanism and strategic logic (e.g. "Cross-sell of X into Y's customer base given overlapping enterprise relationships" or "Consolidation of overlapping G&A functions"). For risks, be specific about what makes this deal hard to execute based on the actual data provided. Return ONLY this JSON: {"synergies": ["...", "...", "..."], "risks": ["...", "...", "..."]}. No other text.\n\n${metrics}`;

    const riskFlagsPrompt = `Identify exactly 3 material risk flags for this transaction — regulatory, strategic, financial, or integration. Ground each flag in the actual data provided (e.g. valuation multiples, margin profile, sector dynamics, deal structure). Do not invent numbers. Be specific about why the risk matters in this deal, not generic M&A boilerplate. Return ONLY this JSON: {"flags": ["...", "...", "..."]}. No other text.\n\n${metrics}`;

    const gradePrompt = `Grade this M&A transaction from A+ (exceptional deal, clear value creation) to F (value-destroying, no strategic logic). Use the full scale: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F. Base your grade on: (1) strategic fit and value creation logic, (2) financial attractiveness using the actual provided multiples, margin, and growth data, (3) execution risk given the deal structure and sector. Do not invent synergy estimates. Return ONLY this JSON (no markdown, no other text): {"grade": "B+", "verdict": "1-2 sentences. Be direct. Reference the actual data provided. Write like a senior banker giving a client a straight answer."}\n\n${metrics}`;

    const [rationaleText, synergiesText, riskFlagsText, gradeText] = await Promise.all([
      callClaude(systemPrompt, rationalePrompt),
      callClaude(systemPrompt, synergiesPrompt),
      callClaude(systemPrompt, riskFlagsPrompt),
      callClaude(systemPrompt, gradePrompt),
    ]);

    let synergiesData = { synergies: [], risks: [] };
    let riskFlagsData = { flags: [] };

    /** Robustly parse a JSON response that may have markdown fences or extra text */
    const parseJSON = (text, fallback) => {
      const stripped = text.replace(/```json\n?|```/g, "").trim();
      // Try 1: direct parse
      try { return JSON.parse(stripped); } catch {}
      // Try 2: extract the first {...} or [...] block
      const objMatch = stripped.match(/\{[\s\S]*\}/);
      if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
      const arrMatch = stripped.match(/\[[\s\S]*\]/);
      if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
      return fallback;
    };

    synergiesData = parseJSON(synergiesText, { synergies: [], risks: [] });
    riskFlagsData = parseJSON(riskFlagsText, { flags: [] });
    const gradeData = parseJSON(gradeText, { grade: null, verdict: null });

    // Parse rationale — if JSON parse fails, try to extract summary/bullets with regex
    let rationaleData = parseJSON(rationaleText, null);
    if (!rationaleData || typeof rationaleData.summary !== "string") {
      const sumMatch  = rationaleText.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const bulkMatch = rationaleText.match(/"bullets"\s*:\s*\[([\s\S]*?)\]/);
      const bullets   = bulkMatch
        ? (bulkMatch[1].match(/"((?:[^"\\]|\\.)*)"(?:\s*,|\s*\])/g) || [])
            .map(s => s.replace(/^"|",?\s*\]?$/g, "").replace(/\\"/g, '"'))
        : [];
      rationaleData = {
        summary: sumMatch ? sumMatch[1].replace(/\\"/g, '"') : "",
        bullets,
      };
    }

    // Premiums-paid valuation: 15% / 25% / 40% over current EV
    const baseEv   = targetData.rawEv || targetData.rawMktCap;
    const netDebt  = (targetData.rawEv || 0) - (targetData.rawMktCap || 0);
    const shares   = targetData.sharesOutstanding || 0;

    const fmtShare = (impliedEv) => {
      if (!shares || !impliedEv) return "N/A";
      const impliedEquity = impliedEv - netDebt;
      return `$${(impliedEquity / shares).toFixed(2)}`;
    };

    const evLow  = baseEv * 1.15;
    const evMid  = baseEv * 1.25;
    const evHigh = baseEv * 1.40;

    res.json({
      acquirerData,
      targetData,
      dealGrade:        gradeData,
      rationale:        rationaleData,
      synergies:        synergiesData.synergies || [],
      integrationRisks: synergiesData.risks || [],
      riskFlags:        riskFlagsData.flags || [],
      // Premiums-paid valuation
      valuationLow:          fmtMoney(evLow),
      valuationMid:          fmtMoney(evMid),
      valuationHigh:         fmtMoney(evHigh),
      valuationLowPerShare:  fmtShare(evLow),
      valuationMidPerShare:  fmtShare(evMid),
      valuationHighPerShare: fmtShare(evHigh),
      // Accretion / dilution (no synergies, conservative base case)
      accretionLow:  computeAccretion(evLow,  dealStructure, acquirerData, targetData),
      accretionMid:  computeAccretion(evMid,  dealStructure, acquirerData, targetData),
      accretionHigh: computeAccretion(evHigh, dealStructure, acquirerData, targetData),
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});


app.post("/api/comps-engine", async (req, res) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: "Ticker is required." });

  try {
    const t = ticker.toUpperCase();
    const targetData = await getCompanyData(t);

    // Step 1: try Yahoo Finance's own peer recommendations
    let peerTickers = [];
    try {
      const recs = await yahooFinance.recommendationsBySymbol(t);
      peerTickers = (recs?.recommendedSymbols || [])
        .map(r => r.symbol)
        .filter(s => s && s !== t)
        .slice(0, 10);
    } catch (e) {
      console.error("recommendationsBySymbol failed:", e.message);
    }

    // Step 2: fallback — ask Claude, then validate each ticker against Yahoo Finance
    if (peerTickers.length < 3) {
      console.log("Yahoo recs insufficient, falling back to Claude for ticker selection");
      const claudeTickers = await callClaude(
        "You are an equity research analyst. Return only valid JSON, no markdown.",
        `List EXACTLY 10 real publicly traded US-listed comparable companies for ${targetData.name} (${targetData.ticker}, ${targetData.sector}). Return ONLY: {"tickers":["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10"]}. No other text.`
      );
      try {
        const parsed = JSON.parse(claudeTickers.replace(/```json|```/g, "").trim());
        peerTickers = (parsed.tickers || []).filter(s => s && s !== t).slice(0, 8);
      } catch {}
    }

    if (peerTickers.length === 0) {
      return res.status(500).json({ error: "No comparable companies found for this ticker." });
    }

    // Fetch peer data, skip failures — request more candidates so filtering leaves enough
    const extraTickers = peerTickers.slice(0, 10);
    const settled = await Promise.allSettled(extraTickers.map(s => getCompanyData(s)));
    const targetMktCap = targetData.rawMktCap || 0;

    const peerData = settled
      .filter(r => r.status === "fulfilled")
      .map(r => r.value)
      .filter(p => {
        // Must be a real company with meaningful size (> $50M market cap)
        if (!p.rawMktCap || p.rawMktCap < 5e7) {
          console.log(`Filtered peer (too small): ${p.name} (${p.ticker}) mktCap=${fmtMoney(p.rawMktCap)}`);
          return false;
        }
        // Market cap within 1/50x – 50x of target (wide range, just catches completely wrong companies)
        if (targetMktCap > 0) {
          const ratio = p.rawMktCap / targetMktCap;
          if (ratio < 0.02 || ratio > 50) {
            console.log(`Filtered peer (market cap mismatch): ${p.name} (${p.ticker}) ratio=${ratio.toFixed(2)}x`);
            return false;
          }
        }
        // Revenue growth sanity: >±500% almost always means bad data
        const rg = parseFloat(p.revenueGrowth);
        if (!isNaN(rg) && Math.abs(rg) > 500) {
          console.log(`Filtered peer (extreme rev growth): ${p.name} (${p.ticker}) revGrowth=${p.revenueGrowth}`);
          return false;
        }
        return true;
      })
      .slice(0, 5);

    if (peerData.length === 0) {
      return res.status(500).json({ error: "Could not fetch data for comparable companies." });
    }

    // Industry names must match damodaran.json exactly (Jan 2026 data)
    const damodaranIndustries = [
      "Software (System & Application)","Software (Internet)","Software (Entertainment)",
      "Healthcare Products","Healthcare Support Services",
      "Drugs (Pharmaceutical)","Drugs (Biotechnology)",
      "Banks (Regional)","Bank (Money Center)",
      "Financial Svcs. (Non-bank & Insur)","Insurance (General)","Insurance (Life)","Insurance (Prop/Cas.)",
      "Retail (General)","Retail (Special Lines)","Retail (Grocery and Food)",
      "Oil/Gas (Production and Exploratio)","Oil/Gas (Integrated)",
      "Semiconductor","Semiconductor Equip",
      "Telecom (Wireless)","Telecom. Services",
      "Entertainment","Broadcasting",
      "Aerospace/Defense","Auto & Truck","Auto Parts",
      "Chemical (Specialty)","Electrical Equipment","Food Processing",
      "Hotel/Gaming","Real Estate (General/Diversified)",
      "Transportation","Transportation (Railroads)",
      "Utility (General)","Utility (Water)",
      "Computer Services","Computers/Peripherals",
      "Machinery","Metals & Mining","Green & Renewable Energy","Restaurant/Dining"
    ];

    // Always use Claude for industry classification — it knows the company and avoids
    // fragile string matching that silently falls back to "Software (System & Application)".
    const claudePick = await callClaude(
      "You are a financial analyst. Reply with only the exact industry name from the list, nothing else.",
      `Which of these industry categories best fits "${targetData.name}" (sector: ${targetData.sector}, industry: ${targetData.industry})?\n\nOptions:\n${damodaranIndustries.join("\n")}\n\nReply with the exact industry name only. No explanation.`
    );
    const damodaranIndustry = damodaranIndustries.find(d => d === claudePick.trim())
      ?? damodaranIndustries.find(d =>
          d.toLowerCase().includes((targetData.industry || "").toLowerCase()) ||
          (targetData.industry || "").toLowerCase().includes(d.toLowerCase().split(" ")[0])
        )
      ?? "Software (System & Application)";

    // Claude writes the rationale
    const peerList = peerData.map(p => `${p.name} (${p.ticker})`).join(", ");
    const rationaleText = await callClaude(
      "You are an equity research analyst. Be concise and specific.",
      `Write 2-3 sentences explaining why these companies are good comparables for ${targetData.name} (${targetData.sector}): ${peerList}. Reference business model similarity, revenue scale, and market positioning. No bullet points, just prose.`
    );

    res.json({ target: targetData, peers: peerData, rationale: rationaleText, damodaranIndustry });

  } catch (error) {
    console.error("Comps error:", error);
    res.status(500).json({ error: "Comps analysis failed." });
  }
});

// In production, serve the Vite build from the same server
const distPath = join(__dirname, "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // Catch-all: return index.html for any non-API route (React Router)
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`DEALIQ server running on http://localhost:${PORT}`);
});
