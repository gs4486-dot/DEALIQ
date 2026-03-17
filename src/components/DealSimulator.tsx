import { useState, useEffect } from "react";
import { Building2, Crosshair, Loader2, AlertTriangle } from "lucide-react";
import type { ViewMode } from "@/pages/Index";
import AISection from "@/components/AISection";
import SkeletonBlock from "@/components/SkeletonBlock";
import CompanyAutocomplete from "@/components/CompanyAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DealSimulatorProps {
  viewMode: ViewMode;
  prefill: { acquirer: string; target: string } | null;
  onClearPrefill: () => void;
}

const DealSimulator = ({ viewMode, prefill, onClearPrefill }: DealSimulatorProps) => {
  const [acquirer, setAcquirer] = useState("");
  const [acquirerTicker, setAcquirerTicker] = useState("");
  const [target, setTarget] = useState("");
  const [targetTicker, setTargetTicker] = useState("");
  const [dealStructure, setDealStructure] = useState("all-cash");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (prefill) {
      setAcquirer(prefill.acquirer);
      setTarget(prefill.target);
      // When prefilled from deal tracker, use name as ticker fallback
      setAcquirerTicker(prefill.acquirer);
      setTargetTicker(prefill.target);
      onClearPrefill();
    }
  }, [prefill, onClearPrefill]);

  const runAnalysis = async () => {
    if (!acquirerTicker || !targetTicker) {
      toast.error("Please select both companies from the dropdown");
      return;
    }
    setIsAnalyzing(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("deal-simulator", {
        body: {
          acquirerTicker,
          targetTicker,
          dealStructure,
          viewMode,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data);
    } catch (e: any) {
      console.error("Deal analysis error:", e);
      toast.error(e.message || "Failed to run deal analysis. Check your API keys.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h2 className="text-[32px] font-bold text-foreground mb-1">Deal Simulator</h2>
      <p className="text-muted-foreground text-sm mb-8">Simulate any M&A transaction between two US public companies</p>

      {/* Input Section */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <CompanyAutocomplete
            value={acquirer}
            onChange={setAcquirer}
            onTickerSelect={setAcquirerTicker}
            placeholder="Enter company name or ticker"
            icon={<Building2 className="w-4 h-4" />}
            label="Acquirer"
          />
          <CompanyAutocomplete
            value={target}
            onChange={setTarget}
            onTickerSelect={setTargetTicker}
            placeholder="Enter company name or ticker"
            icon={<Crosshair className="w-4 h-4" />}
            label="Target"
          />
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
                    ["Company Name", results.acquirerData?.name, results.targetData?.name],
                    ["Ticker", results.acquirerData?.ticker, results.targetData?.ticker],
                    ["Market Cap", results.acquirerData?.marketCap, results.targetData?.marketCap],
                    ["Enterprise Value", results.acquirerData?.ev, results.targetData?.ev],
                    ["EV/EBITDA", results.acquirerData?.evEbitda, results.targetData?.evEbitda],
                    ["EV/Revenue", results.acquirerData?.evRevenue, results.targetData?.evRevenue],
                    ["Revenue Growth", results.acquirerData?.revenueGrowth, results.targetData?.revenueGrowth],
                    ["EBITDA Margin", results.acquirerData?.ebitdaMargin, results.targetData?.ebitdaMargin],
                  ].map(([metric, acq, tgt], i) => (
                    <tr key={i}>
                      <td className="font-medium text-foreground">{metric}</td>
                      <td className="num">{acq || "N/A"}</td>
                      <td className="num font-medium">{tgt || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Inline warning for missing data */}
            {(Object.values(results.acquirerData || {}).includes("N/A") ||
              Object.values(results.targetData || {}).includes("N/A")) && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Some financial data unavailable for this company. Analysis may be limited.
              </p>
            )}
          </section>

          <hr className="border-border" />

          {/* Section B: Implied Valuation (still using derived estimates) */}
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
                    <td className="num">{results.targetData?.ev || "N/A"}</td>
                    <td className="num">—</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">Mid (Median)</td>
                    <td className="num">{results.targetData?.ev || "N/A"}</td>
                    <td className="num">—</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">High (75th %ile)</td>
                    <td className="num">{results.targetData?.ev || "N/A"}</td>
                    <td className="num">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-border" />

          {/* Section C: Strategic Rationale */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">C. Strategic Rationale</h3>
            <AISection label="Strategic Rationale" content={results.rationale || "Analysis unavailable."} />
          </section>

          <hr className="border-border" />

          {/* Section D: Synergies & Integration */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">D. Synergies & Integration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AISection label="Estimated Synergies">
                <ul className="space-y-2">
                  {(results.synergies || []).map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </AISection>
              <AISection label="Key Integration Risks">
                <ul className="space-y-2">
                  {(results.integrationRisks || []).map((item: string, i: number) => (
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
                {(results.riskFlags || []).map((flag: string, i: number) => (
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
