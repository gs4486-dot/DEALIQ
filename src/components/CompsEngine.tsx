import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import TickerSearchInput from "@/components/TickerSearchInput";
import AISection from "@/components/AISection";
import SkeletonBlock from "@/components/SkeletonBlock";
import FootballFieldChart, { parseMultiple, type FFRow, type FFRefLine } from "@/components/FootballFieldChart";

import damodaranData from "@/data/damodaran.json";
import { toast } from "sonner";

interface PeerData {
  name: string;
  ticker: string;
  evEbitda: string;
  evRevenue: string;
  revenueGrowth: string;
  ebitdaMargin: string;
  marketCap: string;
  totalRevenue: string;
  ebitda: string;
  // raw values for calculations
  rawEv?: number;
  rawMktCap?: number;
}

interface CompsResults {
  peers: PeerData[];
  rationale: string;
  target: PeerData | null;
  damodaranIndustry?: string;
}

function calcStats(peers: PeerData[]) {
  const parseNum = (s: string) => {
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  const getPercentiles = (values: number[]) => {
    if (values.length === 0) return { p25: "N/A", median: "N/A", p75: "N/A" };
    const sorted = [...values].sort((a, b) => a - b);
    const q = (p: number) => {
      const idx = (sorted.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    };
    return {
      p25:    `${q(0.25).toFixed(1)}x`,
      median: `${q(0.5).toFixed(1)}x`,
      p75:    `${q(0.75).toFixed(1)}x`,
    };
  };

  const getPercentilesPct = (values: number[]) => {
    if (values.length === 0) return { p25: "N/A", median: "N/A", p75: "N/A" };
    const sorted = [...values].sort((a, b) => a - b);
    const q = (p: number) => {
      const idx = (sorted.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    };
    return {
      p25:    `${q(0.25).toFixed(1)}%`,
      median: `${q(0.5).toFixed(1)}%`,
      p75:    `${q(0.75).toFixed(1)}%`,
    };
  };

  const evEbitdaVals = peers.map(p => parseNum(p.evEbitda)).filter((n): n is number => n !== null);
  const evRevVals    = peers.map(p => parseNum(p.evRevenue)).filter((n): n is number => n !== null);
  const rgVals       = peers.map(p => parseNum(p.revenueGrowth)).filter((n): n is number => n !== null);
  const emVals       = peers.map(p => parseNum(p.ebitdaMargin)).filter((n): n is number => n !== null);

  return {
    evEbitda:    getPercentiles(evEbitdaVals),
    evRevenue:   getPercentiles(evRevVals),
    revGrowth:   getPercentilesPct(rgVals),
    ebitdaMargin: getPercentilesPct(emVals),
  };
}

const CompsEngine = () => {
  const [ticker, setTicker]     = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults]   = useState<CompsResults | null>(null);

  const findComps = async () => {
    if (!ticker.trim()) {
      toast.error("Please enter a ticker symbol");
      return;
    }
    setIsLoading(true);
    setResults(null);

    try {
      const response = await fetch(`${API_URL}/api/comps-engine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Comps analysis failed");

      setResults(data);
    } catch (e: any) {
      console.error("Comps engine error:", e);
      toast.error(e.message || "Failed to find comparables. Make sure the server is running on port 3001.");
    } finally {
      setIsLoading(false);
    }
  };

  const peers        = results?.peers || [];
  const summaryStats = peers.length > 0 ? calcStats(peers) : null;

  // Damodaran industry row — server resolved (includes Claude fallback)
  const damodaranRow = damodaranData.industries.find(
    (ind) => ind.industry === results?.damodaranIndustry
  ) || damodaranData.industries[0];

  // Relevered beta: β_levered = β_unlevered × (1 + (1−t) × D/E)
  const targetRawEv     = (results?.target as any)?.rawEv     || 0;
  const targetRawMktCap = (results?.target as any)?.rawMktCap || 0;
  const netDebt         = targetRawEv - targetRawMktCap;
  // Cap D/E at 200% — companies with financial-services arms (auto, banks) have inflated
  // EV from loan-book debt that isn't true operating leverage; uncapped it distorts beta badly.
  const rawDeRatio      = targetRawMktCap > 0 && netDebt > 0 ? netDebt / targetRawMktCap : 0;
  const deRatio         = Math.min(rawDeRatio, 2.0);
  const TAX_RATE        = 0.25;
  const releveredBeta   = damodaranRow.beta * (1 + (1 - TAX_RATE) * deRatio);
  const RF              = damodaranData.riskFreeRate ?? 4.5;
  const releveredCoE    = RF + releveredBeta * damodaranRow.erp;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h2 className="text-[32px] font-bold text-foreground mb-1">Comps Engine</h2>
      <p className="text-muted-foreground text-sm mb-10">Generate comparable peer sets with live trading multiples</p>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">
        <div className="mb-4">
          <TickerSearchInput
            label="Company"
            value={ticker}
            onChange={setTicker}
            placeholder="Search by name or ticker..."
            icon={<Search className="w-4 h-4" />}
            hint="e.g. Apple or AAPL"
          />
        </div>

        <button
          onClick={findComps}
          disabled={!ticker.trim() || isLoading}
          className="w-full h-[42px] bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Finding Comparables...
            </>
          ) : (
            "Find Comparables"
          )}
        </button>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <SkeletonBlock height="h-64" />
          <SkeletonBlock height="h-32" />
          <SkeletonBlock height="h-24" />
        </div>
      )}

      {results && !isLoading && (
        <div className="space-y-10">
          {/* Section A: Comparable Companies Table */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">A. Comparable Companies</h3>
            <div className="data-table overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Ticker</th>
                    <th className="text-right">LTM Revenue</th>
                    <th className="text-right">LTM EBITDA</th>
                    <th className="text-right">EV/EBITDA</th>
                    <th className="text-right">EV/Revenue</th>
                    <th className="text-right">EBITDA Margin</th>
                    <th className="text-right">Rev Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Subject company row */}
                  {results.target && (() => {
                    const t = results.target as any;
                    return (
                      <>
                        <tr className="bg-primary/5 border-l-2 border-primary">
                          <td className="font-bold text-primary">{t.name}</td>
                          <td className="font-bold text-primary">{t.ticker}</td>
                          <td className="num font-bold text-primary">{t.totalRevenue}</td>
                          <td className="num font-bold text-primary">{t.ebitda}</td>
                          <td className="num font-bold text-primary">{t.evEbitda}</td>
                          <td className="num font-bold text-primary">{t.evRevenue}</td>
                          <td className={`num font-bold ${parseFloat(t.ebitdaMargin) >= 0 ? "text-success" : "text-destructive"}`}>{t.ebitdaMargin}</td>
                          <td className={`num font-bold ${parseFloat(t.revenueGrowth) >= 0 ? "text-success" : "text-destructive"}`}>{t.revenueGrowth}</td>
                        </tr>
                        <tr>
                          <td colSpan={8} className="py-1 px-3">
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                              <div className="flex-1 h-px bg-border" />
                              Peer Set
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                  {peers.map((c, i) => (
                    <tr key={i}>
                      <td className="font-medium text-foreground">{c.name}</td>
                      <td className="text-muted-foreground">{c.ticker}</td>
                      <td className="num">{c.totalRevenue}</td>
                      <td className="num">{c.ebitda}</td>
                      <td className="num">{c.evEbitda}</td>
                      <td className="num">{c.evRevenue}</td>
                      <td className={`num ${parseFloat(c.ebitdaMargin) >= 0 ? "text-success" : "text-destructive"}`}>{c.ebitdaMargin}</td>
                      <td className={`num ${parseFloat(c.revenueGrowth) >= 0 ? "text-success" : "text-destructive"}`}>{c.revenueGrowth}</td>
                    </tr>
                  ))}
                  {summaryStats && (
                    <>
                      <tr className="border-t-2 border-border">
                        <td colSpan={2} className="font-semibold text-foreground text-xs uppercase tracking-wide">25th %ile</td>
                        <td className="num font-medium text-muted-foreground">—</td>
                        <td className="num font-medium text-muted-foreground">—</td>
                        <td className="num font-medium">{summaryStats.evEbitda.p25}</td>
                        <td className="num font-medium">{summaryStats.evRevenue.p25}</td>
                        <td className="num font-medium">{summaryStats.ebitdaMargin.p25}</td>
                        <td className="num font-medium">{summaryStats.revGrowth.p25}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="font-semibold text-foreground text-xs uppercase tracking-wide">Median</td>
                        <td className="num font-medium text-muted-foreground">—</td>
                        <td className="num font-medium text-muted-foreground">—</td>
                        <td className="num font-medium">{summaryStats.evEbitda.median}</td>
                        <td className="num font-medium">{summaryStats.evRevenue.median}</td>
                        <td className="num font-medium">{summaryStats.ebitdaMargin.median}</td>
                        <td className="num font-medium">{summaryStats.revGrowth.median}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="font-semibold text-foreground text-xs uppercase tracking-wide">75th %ile</td>
                        <td className="num font-medium text-muted-foreground">—</td>
                        <td className="num font-medium text-muted-foreground">—</td>
                        <td className="num font-medium">{summaryStats.evEbitda.p75}</td>
                        <td className="num font-medium">{summaryStats.evRevenue.p75}</td>
                        <td className="num font-medium">{summaryStats.ebitdaMargin.p75}</td>
                        <td className="num font-medium">{summaryStats.revGrowth.p75}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* EV/EBITDA peer chart — subject company shown as reference line */}
            {(() => {
              const allRows: FFRow[] = peers
                .map((p: any) => {
                  const v = parseMultiple(p.evEbitda);
                  if (v === null) return null;
                  const label = p.ticker ?? "—";
                  return { label, value: v, displayValue: p.evEbitda, color: "#4263eb" } as FFRow;
                })
                .filter((r): r is FFRow => r !== null)
                .sort((a, b) => b.value - a.value);

              if (allRows.length === 0) return null;

              // Outlier filtering: exclude values > Q3 + 2.5 * IQR
              const sortedVals = [...allRows.map(r => r.value)].sort((a, b) => a - b);
              const q1   = sortedVals[Math.floor(sortedVals.length * 0.25)] ?? 0;
              const q3   = sortedVals[Math.floor(sortedVals.length * 0.75)] ?? 0;
              const fence = q3 + 2.5 * (q3 - q1);
              const rows     = allRows.filter(r => r.value <= fence);
              const outliers = allRows.filter(r => r.value > fence);

              const p25 = summaryStats ? parseMultiple(summaryStats.evEbitda.p25)    : null;
              const med = summaryStats ? parseMultiple(summaryStats.evEbitda.median)  : null;
              const p75 = summaryStats ? parseMultiple(summaryStats.evEbitda.p75)     : null;
              const subjectVal = results.target ? parseMultiple((results.target as any).evEbitda) : null;

              const refLines: FFRefLine[] = [
                p25 ? { value: p25, label: "P25",    color: "#94a3b8" } : null,
                med ? { value: med, label: "Median",  color: "#4263eb" } : null,
                p75 ? { value: p75, label: "P75",    color: "#94a3b8" } : null,
                subjectVal ? { value: subjectVal, label: results.target?.ticker ?? "Subject", color: "#e03131" } : null,
              ].filter((r): r is FFRefLine => r !== null);

              return (
                <FootballFieldChart
                  title="EV / EBITDA — Peer Set"
                  subtitle={`Sorted descending · dashed lines: P25 / Median / P75 / Subject${outliers.length > 0 ? ` · outliers excluded: ${outliers.map(r => `${r.label} (${r.displayValue})`).join(", ")}` : ""}`}
                  rows={rows}
                  referenceLines={refLines}
                  formatTick={(v) => `${v.toFixed(1)}x`}
                  yAxisWidth={64}
                />
              );
            })()}
          </section>

          <hr className="border-border" />

          {/* Section B: Selection Rationale */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">B. Comp Selection Rationale</h3>
            <AISection label="Selection Rationale" content={results.rationale || "Rationale unavailable."} />
          </section>

          <hr className="border-border" />

          {/* Section C: Damodaran Reference */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">C. Damodaran Reference</h3>
            <div className="data-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium text-foreground">Industry Classification</td>
                    <td className="num">{damodaranRow.industry}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">Unlevered Beta (Industry)</td>
                    <td className="num">{damodaranRow.beta.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">
                      Relevered Beta (Est.)
                      <span className="text-[11px] text-muted-foreground ml-1.5 font-normal">
                        D/E {deRatio > 0 ? `${(deRatio * 100).toFixed(0)}%` : "0% (net cash)"}
                      </span>
                    </td>
                    <td className="num">{releveredBeta.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">Risk-Free Rate (10Y UST)</td>
                    <td className="num">{RF.toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">Equity Risk Premium (US Market)</td>
                    <td className="num">{damodaranRow.erp.toFixed(1)}%</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="font-semibold text-foreground">Implied Cost of Equity (Relevered)</td>
                    <td className="num font-semibold">{releveredCoE.toFixed(2)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Source:{" "}
              <a
                href="https://pages.stern.nyu.edu/~adamodar/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Damodaran Online, NYU Stern School of Business
              </a>
              {" "}· ERP as of Jan 2026 · β relevered using target D/E at 25% tax rate (capped at 200%)
            </p>
          </section>
        </div>
      )}
    </div>
  );
};

export default CompsEngine;
