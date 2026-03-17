import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import type { ViewMode } from "@/pages/Index";
import AISection from "@/components/AISection";
import SkeletonBlock from "@/components/SkeletonBlock";
import damodaranData from "@/data/damodaran.json";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompsEngineProps {
  viewMode: ViewMode;
}

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

const revenueRanges = ["Any", "Under $100M", "$100M–$500M", "$500M–$2B", "Above $2B"];

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
      p25: `${q(0.25).toFixed(1)}x`,
      median: `${q(0.5).toFixed(1)}x`,
      p75: `${q(0.75).toFixed(1)}x`,
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
      p25: `${q(0.25).toFixed(1)}%`,
      median: `${q(0.5).toFixed(1)}%`,
      p75: `${q(0.75).toFixed(1)}%`,
    };
  };

  const evEbitdaVals = peers.map(p => parseNum(p.evEbitda)).filter((n): n is number => n !== null);
  const evRevVals = peers.map(p => parseNum(p.evRevenue)).filter((n): n is number => n !== null);
  const peVals = peers.map(p => parseNum(p.pe)).filter((n): n is number => n !== null);
  const rgVals = peers.map(p => parseNum(p.revGrowth)).filter((n): n is number => n !== null);
  const emVals = peers.map(p => parseNum(p.ebitdaMargin)).filter((n): n is number => n !== null);

  return {
    evEbitda: getPercentiles(evEbitdaVals),
    evRevenue: getPercentiles(evRevVals),
    pe: getPercentiles(peVals),
    revGrowth: getPercentilesPct(rgVals),
    ebitdaMargin: getPercentilesPct(emVals),
  };
}

const CompsEngine = ({ viewMode }: CompsEngineProps) => {
  const [ticker, setTicker] = useState("");
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("United States");
  const [revenueRange, setRevenueRange] = useState("Any");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ peers: PeerData[]; rationale: string; target: PeerData | null } | null>(null);

  const findComps = async () => {
    if (!ticker.trim()) {
      toast.error("Please enter a ticker symbol");
      return;
    }
    setIsLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("comps-engine", {
        body: { ticker, sector: industry, revenueRange },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data);
    } catch (e: any) {
      console.error("Comps engine error:", e);
      toast.error(e.message || "Failed to find comparables. Check your API keys.");
    } finally {
      setIsLoading(false);
    }
  };

  const peers = results?.peers || [];
  const summaryStats = peers.length > 0 ? calcStats(peers) : null;

  // Find matching Damodaran industry
  const matchedIndustry = damodaranData.industries.find(
    (ind) => ind.industry.toLowerCase().includes((industry || "software").toLowerCase())
  ) || damodaranData.industries[0];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h2 className="text-[32px] font-bold text-foreground mb-1">Comps Engine</h2>
      <p className="text-muted-foreground text-sm mb-8">AI-selected comparable companies with live multiples</p>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">
        <div className="mb-4">
          <CompanyAutocomplete
            value={company}
            onChange={setCompany}
            onTickerSelect={setTicker}
            placeholder="Enter company name or ticker"
            icon={<Search className="w-4 h-4" />}
            label="Company"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Industry / Sector</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Cybersecurity"
              className="w-full h-[42px] px-4 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Geography</label>
            <input
              type="text"
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              className="w-full h-[42px] px-4 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Revenue Range</label>
            <select
              value={revenueRange}
              onChange={(e) => setRevenueRange(e.target.value)}
              className="w-full h-[42px] px-4 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {revenueRanges.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={findComps}
          disabled={!company || isLoading}
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
        <div className="space-y-8">
          {/* Section A: Comparable Companies Table */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">A. Comparable Companies</h3>
            <div className="data-table overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Ticker</th>
                    <th className="text-right">EV/EBITDA</th>
                    <th className="text-right">EV/Revenue</th>
                    <th className="text-right">P/E</th>
                    <th className="text-right">Rev Growth</th>
                    <th className="text-right">EBITDA Margin</th>
                    <th className="text-right">Market Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {peers.map((c, i) => (
                    <tr key={i}>
                      <td className="font-medium text-foreground">{c.company}</td>
                      <td className="text-muted-foreground">{c.ticker}</td>
                      <td className="num">{c.evEbitda}</td>
                      <td className="num">{c.evRevenue}</td>
                      <td className="num">{c.pe}</td>
                      <td className={`num ${parseFloat(c.revGrowth) >= 0 ? "text-success" : "text-destructive"}`}>{c.revGrowth}</td>
                      <td className={`num ${parseFloat(c.ebitdaMargin) >= 0 ? "text-success" : "text-destructive"}`}>{c.ebitdaMargin}</td>
                      <td className="num">{c.marketCap}</td>
                    </tr>
                  ))}
                  {summaryStats && (
                    <>
                      <tr className="border-t-2 border-border">
                        <td colSpan={2} className="font-semibold text-foreground text-xs uppercase tracking-wide">25th %ile</td>
                        <td className="num font-medium">{summaryStats.evEbitda.p25}</td>
                        <td className="num font-medium">{summaryStats.evRevenue.p25}</td>
                        <td className="num font-medium">{summaryStats.pe.p25}</td>
                        <td className="num font-medium">{summaryStats.revGrowth.p25}</td>
                        <td className="num font-medium">{summaryStats.ebitdaMargin.p25}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="font-semibold text-foreground text-xs uppercase tracking-wide">Median</td>
                        <td className="num font-medium">{summaryStats.evEbitda.median}</td>
                        <td className="num font-medium">{summaryStats.evRevenue.median}</td>
                        <td className="num font-medium">{summaryStats.pe.median}</td>
                        <td className="num font-medium">{summaryStats.revGrowth.median}</td>
                        <td className="num font-medium">{summaryStats.ebitdaMargin.median}</td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="font-semibold text-foreground text-xs uppercase tracking-wide">75th %ile</td>
                        <td className="num font-medium">{summaryStats.evEbitda.p75}</td>
                        <td className="num font-medium">{summaryStats.evRevenue.p75}</td>
                        <td className="num font-medium">{summaryStats.pe.p75}</td>
                        <td className="num font-medium">{summaryStats.revGrowth.p75}</td>
                        <td className="num font-medium">{summaryStats.ebitdaMargin.p75}</td>
                        <td></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
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
                    <td className="font-medium text-foreground">Industry</td>
                    <td className="num">{matchedIndustry.industry}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">Industry Beta (Unlevered)</td>
                    <td className="num">{matchedIndustry.beta.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">Equity Risk Premium</td>
                    <td className="num">{matchedIndustry.erp.toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">Implied Cost of Equity</td>
                    <td className="num">{matchedIndustry.costOfEquity.toFixed(2)}%</td>
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
            </p>
          </section>
        </div>
      )}
    </div>
  );
};

export default CompsEngine;
