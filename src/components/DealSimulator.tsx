import { useState, useEffect } from "react";
import { Building2, Crosshair, Loader2, AlertTriangle } from "lucide-react";
import type { ViewMode } from "@/pages/Index";
import AISection from "@/components/AISection";
import SkeletonBlock from "@/components/SkeletonBlock";

interface DealSimulatorProps {
  viewMode: ViewMode;
  prefill: { acquirer: string; target: string } | null;
  onClearPrefill: () => void;
}

// Mock data for demo purposes
// TODO: Replace with FMP API calls using FMP_API_KEY
const mockCompanyData = (name: string, isTarget: boolean) => ({
  name: name || "Company",
  ticker: name?.toUpperCase().slice(0, 4) || "TICK",
  marketCap: isTarget ? "$42.8B" : "$185.2B",
  ev: isTarget ? "$48.1B" : "$192.7B",
  evEbitda: isTarget ? "14.2x" : "18.7x",
  evRevenue: isTarget ? "5.8x" : "7.2x",
  revenueGrowth: isTarget ? "12.4%" : "8.1%",
  ebitdaMargin: isTarget ? "40.8%" : "38.5%",
});

const DealSimulator = ({ viewMode, prefill, onClearPrefill }: DealSimulatorProps) => {
  const [acquirer, setAcquirer] = useState("");
  const [target, setTarget] = useState("");
  const [dealStructure, setDealStructure] = useState("all-cash");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (prefill) {
      setAcquirer(prefill.acquirer);
      setTarget(prefill.target);
      onClearPrefill();
    }
  }, [prefill, onClearPrefill]);

  const runAnalysis = async () => {
    if (!acquirer || !target) return;
    setIsAnalyzing(true);
    setResults(null);

    // Simulate API delay
    // TODO: Wire to FMP API for financial data and Claude API (ANTHROPIC_API_KEY) for AI sections
    await new Promise((r) => setTimeout(r, 2000));

    setResults({
      acquirerData: mockCompanyData(acquirer, false),
      targetData: mockCompanyData(target, true),
    });
    setIsAnalyzing(false);
  };

  const toneLabel = viewMode === "ib-analyst" ? "IB Analyst" : "PE Associate";

  // AI content adapts to viewMode
  // TODO: System prompt injection point — adapt tone based on viewMode toggle
  const strategicRationale =
    viewMode === "ib-analyst"
      ? `The proposed acquisition of ${target || "Target"} by ${acquirer || "Acquirer"} represents a compelling strategic combination that would create a market leader with enhanced scale and product diversification. The transaction offers significant revenue synergy potential through cross-selling opportunities across complementary customer bases. The combined entity would benefit from improved competitive positioning in a rapidly consolidating market landscape. Management teams have expressed alignment on long-term strategic vision and operational integration priorities.`
      : `From an investment perspective, the acquisition of ${target || "Target"} presents an attractive entry point at current valuation multiples. The target's strong EBITDA margins and recurring revenue profile provide downside protection while offering meaningful upside through operational improvements. The deal structure supports a leveraged return profile consistent with mid-market buyout parameters. Key value creation levers include margin expansion through procurement optimization and accelerated organic growth via the acquirer's distribution capabilities.`;

  const synergies =
    viewMode === "ib-analyst"
      ? {
          items: [
            `Cost synergies of approximately $280–340M annually through elimination of redundant corporate overhead and procurement optimization`,
            `Revenue synergies of $150–200M from cross-selling into ${acquirer || "Acquirer"}'s enterprise customer base within 24 months`,
            `Technology integration savings of $60–80M through platform consolidation and shared R&D infrastructure`,
          ],
          risks: [
            `Customer overlap in the mid-market segment could result in 8–12% revenue attrition during integration`,
            `Cultural integration risks given differing organizational structures and compensation frameworks`,
            `Regulatory review timeline may extend to 9–12 months given combined market share in key verticals`,
          ],
        }
      : {
          items: [
            `Run-rate EBITDA enhancement of $300–380M achievable by Year 3 through headcount rationalization and vendor consolidation`,
            `Revenue uplift of $120–180M via pricing optimization and expansion into adjacent verticals leveraging combined capabilities`,
            `Working capital improvements of $40–60M through inventory management optimization and payment term renegotiation`,
          ],
          risks: [
            `Integration execution risk — management bandwidth constraints during first 18 months post-close`,
            `Key person retention critical for top 15 revenue-generating relationships at target`,
            `Leverage profile at close requires disciplined deleveraging trajectory to maintain covenant compliance`,
          ],
        };

  const riskFlags = [
    `${target || "Target"}'s customer concentration: top 3 clients represent 34% of revenue, creating single-point-of-failure risk`,
    `Acquirer's current leverage ratio of 3.2x EBITDA limits debt capacity for the transaction without equity co-investment`,
    `Declining gross margins at target (down 180bps YoY) suggest competitive pricing pressure that may persist post-acquisition`,
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h2 className="text-[22px] font-semibold text-foreground mb-6">Deal Simulator</h2>

      {/* Input Section */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Acquirer</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={acquirer}
                onChange={(e) => setAcquirer(e.target.value)}
                placeholder="Enter company name or ticker"
                className="w-full h-[42px] pl-10 pr-4 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Target</label>
            <div className="relative">
              <Crosshair className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Enter company name or ticker"
                className="w-full h-[42px] pl-10 pr-4 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Deal Structure</label>
          <select
            value={dealStructure}
            onChange={(e) => setDealStructure(e.target.value)}
            className="h-[42px] px-4 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
          >
            <option value="all-cash">All Cash</option>
            <option value="all-stock">All Stock</option>
            <option value="mixed">Mixed (50/50)</option>
          </select>
        </div>

        <button
          onClick={runAnalysis}
          disabled={!acquirer || !target || isAnalyzing}
          className="w-full h-[42px] bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Run Deal Analysis"
          )}
        </button>
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="space-y-6">
          <SkeletonBlock height="h-48" />
          <SkeletonBlock height="h-32" />
          <SkeletonBlock height="h-40" />
        </div>
      )}

      {/* Results */}
      {results && !isAnalyzing && (
        <div className="space-y-8">
          {/* Section A: Deal Overview */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">A. Deal Overview</h3>
            <div className="data-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Acquirer</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Company Name", results.acquirerData.name, results.targetData.name],
                    ["Ticker", results.acquirerData.ticker, results.targetData.ticker],
                    ["Market Cap", results.acquirerData.marketCap, results.targetData.marketCap],
                    ["Enterprise Value", results.acquirerData.ev, results.targetData.ev],
                    ["EV/EBITDA", results.acquirerData.evEbitda, results.targetData.evEbitda],
                    ["EV/Revenue", results.acquirerData.evRevenue, results.targetData.evRevenue],
                    ["Revenue Growth", results.acquirerData.revenueGrowth, results.targetData.revenueGrowth],
                    ["EBITDA Margin", results.acquirerData.ebitdaMargin, results.targetData.ebitdaMargin],
                  ].map(([metric, acq, tgt], i) => (
                    <tr key={i} className={i >= 2 ? "" : ""}>
                      <td className="font-medium text-foreground">{metric}</td>
                      <td className="num">{acq}</td>
                      <td className="num font-medium">{tgt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-border" />

          {/* Section B: Implied Valuation */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">B. Implied Valuation</h3>
            <div className="data-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>Implied EV</th>
                    <th>Implied Equity/Share</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium text-foreground">Low (25th %ile)</td>
                    <td className="num">$38.2B</td>
                    <td className="num">$142.50</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">Mid (Median)</td>
                    <td className="num">$48.1B</td>
                    <td className="num">$179.25</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">High (75th %ile)</td>
                    <td className="num">$58.4B</td>
                    <td className="num">$217.80</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-border" />

          {/* Section C: Strategic Rationale */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">C. Strategic Rationale</h3>
            {/* TODO: System prompt for Claude API injected here. Tone: {toneLabel}. Key: ANTHROPIC_API_KEY */}
            <AISection label="Strategic Rationale" content={strategicRationale} />
          </section>

          <hr className="border-border" />

          {/* Section D: Synergies & Integration */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">D. Synergies & Integration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AISection label="Estimated Synergies">
                <ul className="space-y-2">
                  {synergies.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </AISection>
              <AISection label="Key Integration Risks">
                <ul className="space-y-2">
                  {synergies.risks.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </AISection>
            </div>
          </section>

          <hr className="border-border" />

          {/* Section E: Key Risk Flags */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">E. Key Risk Flags</h3>
            <AISection label="Risk Flags">
              <ul className="space-y-3">
                {riskFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </AISection>
          </section>

          {/* Attribution */}
          <p className="text-xs text-muted-foreground pt-4">
            Financial data sourced from Financial Modeling Prep. Discount rates and industry risk premiums sourced from Damodaran Online (NYU Stern). AI analysis generated by Claude.
          </p>
        </div>
      )}
    </div>
  );
};

export default DealSimulator;
