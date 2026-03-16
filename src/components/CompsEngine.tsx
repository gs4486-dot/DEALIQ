import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import type { ViewMode } from "@/pages/Index";
import AISection from "@/components/AISection";
import SkeletonBlock from "@/components/SkeletonBlock";
import damodaranData from "@/data/damodaran.json";

interface CompsEngineProps {
  viewMode: ViewMode;
}

// Mock comparable companies
// TODO: Claude selects peers via ANTHROPIC_API_KEY, then FMP_API_KEY pulls live multiples
const mockComps = [
  { company: "Datadog", ticker: "DDOG", evEbitda: "62.3x", evRevenue: "18.4x", pe: "85.2x", revGrowth: "26.1%", ebitdaMargin: "29.5%", marketCap: "$38.2B" },
  { company: "CrowdStrike", ticker: "CRWD", evEbitda: "58.7x", evRevenue: "17.1x", pe: "78.4x", revGrowth: "33.4%", ebitdaMargin: "29.1%", marketCap: "$62.1B" },
  { company: "Zscaler", ticker: "ZS", evEbitda: "71.2x", evRevenue: "19.8x", pe: "94.1x", revGrowth: "34.7%", ebitdaMargin: "27.8%", marketCap: "$27.4B" },
  { company: "Palo Alto Networks", ticker: "PANW", evEbitda: "45.8x", evRevenue: "12.6x", pe: "52.3x", revGrowth: "19.8%", ebitdaMargin: "27.5%", marketCap: "$105.3B" },
  { company: "Fortinet", ticker: "FTNT", evEbitda: "35.2x", evRevenue: "10.4x", pe: "42.8x", revGrowth: "18.2%", ebitdaMargin: "29.6%", marketCap: "$55.8B" },
  { company: "Dynatrace", ticker: "DT", evEbitda: "42.1x", evRevenue: "11.2x", pe: "56.7x", revGrowth: "22.5%", ebitdaMargin: "26.6%", marketCap: "$14.2B" },
  { company: "Elastic", ticker: "ESTC", evEbitda: "55.4x", evRevenue: "9.8x", pe: "68.9x", revGrowth: "17.6%", ebitdaMargin: "17.7%", marketCap: "$10.8B" },
  { company: "SentinelOne", ticker: "S", evEbitda: "N/A", evRevenue: "12.1x", pe: "N/A", revGrowth: "40.2%", ebitdaMargin: "-8.2%", marketCap: "$7.5B" },
  { company: "Splunk", ticker: "SPLK", evEbitda: "38.9x", evRevenue: "7.5x", pe: "48.2x", revGrowth: "14.1%", ebitdaMargin: "19.3%", marketCap: "$22.6B" },
  { company: "Varonis Systems", ticker: "VRNS", evEbitda: "N/A", evRevenue: "10.8x", pe: "N/A", revGrowth: "28.9%", ebitdaMargin: "-5.4%", marketCap: "$4.8B" },
];

const summaryStats = {
  evEbitda: { p25: "38.9x", median: "49.0x", p75: "60.5x" },
  evRevenue: { p25: "10.1x", median: "11.7x", p75: "17.8x" },
  pe: { p25: "48.2x", median: "56.7x", p75: "82.8x" },
  revGrowth: { p25: "18.0%", median: "24.3%", p75: "33.9%" },
  ebitdaMargin: { p25: "18.5%", median: "27.7%", p75: "29.5%" },
};

const revenueRanges = ["Any", "Under $100M", "$100M–$500M", "$500M–$2B", "Above $2B"];

const CompsEngine = ({ viewMode }: CompsEngineProps) => {
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [geography, setGeography] = useState("United States");
  const [revenueRange, setRevenueRange] = useState("Any");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<boolean>(false);

  const findComps = async () => {
    if (!company) return;
    setIsLoading(true);
    setResults(false);
    await new Promise((r) => setTimeout(r, 1800));
    setResults(true);
    setIsLoading(false);
  };

  // Find matching Damodaran industry
  const matchedIndustry = damodaranData.industries.find(
    (ind) => ind.industry.toLowerCase().includes((industry || "software").toLowerCase())
  ) || damodaranData.industries[0];

  const selectionRationale =
    viewMode === "ib-analyst"
      ? `The comparable set was selected based on sector alignment (enterprise cybersecurity and observability software), similar business models (SaaS/subscription-based revenue), and comparable revenue scale ($500M–$5B). The peer group reflects a mix of high-growth pure-play security vendors and established platform companies to capture the full valuation spectrum. Companies with fundamentally different delivery models (hardware-centric or services-heavy) were excluded to maintain comparability.`
      : `Peers were selected to reflect the investable universe of scaled SaaS security and infrastructure software businesses with recurring revenue profiles. The comp set emphasizes companies with demonstrated paths to profitability and strong net retention metrics, consistent with a growth equity evaluation framework. Outliers in the peer set (SentinelOne, Varonis) are included to represent earlier-stage comparables with higher growth but pre-profitability unit economics.`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h2 className="text-[22px] font-semibold text-foreground mb-6">Comps Engine</h2>

      {/* Input */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">
        <div className="mb-4">
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Company</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Enter company name or ticker"
              className="w-full h-[42px] pl-10 pr-4 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
            />
          </div>
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
                  {mockComps.map((c, i) => (
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
                  {/* Summary stats */}
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
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-border" />

          {/* Section B: Selection Rationale */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">B. Comp Selection Rationale</h3>
            <AISection label="Selection Rationale" content={selectionRationale} />
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
