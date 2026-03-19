import { useState, useEffect } from "react";
import { Building2, Crosshair, Loader2, AlertTriangle } from "lucide-react";
import { API_URL } from "@/lib/api";
import AISection from "@/components/AISection";
import SkeletonBlock from "@/components/SkeletonBlock";
import TickerSearchInput from "@/components/TickerSearchInput";
import FootballFieldChart, { parseToB, formatB, type FFRow } from "@/components/FootballFieldChart";
import { toast } from "sonner";

const GRADE_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  "A+": { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", label: "Exceptional" },
  "A":  { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", label: "Excellent" },
  "A-": { bg: "bg-emerald-50",  text: "text-emerald-600", border: "border-emerald-200", label: "Strong" },
  "B+": { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    label: "Solid" },
  "B":  { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    label: "Good" },
  "B-": { bg: "bg-blue-50",     text: "text-blue-600",    border: "border-blue-200",    label: "Above Average" },
  "C+": { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   label: "Average" },
  "C":  { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   label: "Mixed" },
  "C-": { bg: "bg-amber-50",    text: "text-amber-600",   border: "border-amber-200",   label: "Weak" },
  "D+": { bg: "bg-orange-50",   text: "text-orange-700",  border: "border-orange-200",  label: "Poor" },
  "D":  { bg: "bg-orange-50",   text: "text-orange-700",  border: "border-orange-200",  label: "Poor" },
  "D-": { bg: "bg-orange-50",   text: "text-orange-600",  border: "border-orange-200",  label: "Very Poor" },
  "F":  { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-200",     label: "Failing" },
};

const DealGradeCard = ({ grade, verdict }: { grade: string; verdict: string | null }) => {
  const cfg = GRADE_CONFIG[grade] ?? GRADE_CONFIG["C"];
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-6 flex items-start gap-6`}>
      <div className={`shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2 ${cfg.border} bg-white shadow-sm`}>
        <span className={`text-3xl font-extrabold leading-none ${cfg.text}`}>{grade}</span>
      </div>
      <div className="flex flex-col justify-center min-h-[80px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Deal Grade</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            {cfg.label}
          </span>
        </div>
        {verdict && (
          <p className="text-sm text-foreground leading-relaxed max-w-xl">{verdict}</p>
        )}
      </div>
    </div>
  );
};

interface DealSimulatorProps {
  prefill: { acquirer: string; target: string } | null;
  onClearPrefill: () => void;
}

const DealSimulator = ({ prefill, onClearPrefill }: DealSimulatorProps) => {
  const [acquirer, setAcquirer] = useState("");
  const [target, setTarget] = useState("");
  const [dealStructure, setDealStructure] = useState("all-cash");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefill) {
      setAcquirer(prefill.acquirer);
      setTarget(prefill.target);
      onClearPrefill();
    }
  }, [prefill, onClearPrefill]);

  const runAnalysis = async () => {
    if (!acquirer.trim() || !target.trim()) {
      toast.error("Please enter both ticker symbols");
      return;
    }
    setIsAnalyzing(true);
    setResults(null);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/deal-simulator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acquirerTicker: acquirer.trim().toUpperCase(),
          targetTicker: target.trim().toUpperCase(),
          dealStructure,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setResults(data);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || "Analysis failed. Make sure the server is running on port 3001.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h2 className="text-[32px] font-bold text-foreground mb-1">M&A Simulator</h2>
      <p className="text-muted-foreground text-sm mb-10">Model any M&A transaction between two US public companies</p>

      {/* Input Section */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <TickerSearchInput
            label="Acquirer"
            value={acquirer}
            onChange={setAcquirer}
            placeholder="Search by name or ticker..."
            icon={<Building2 className="w-4 h-4" />}
            hint="e.g. Microsoft or MSFT"
          />
          <TickerSearchInput
            label="Target"
            value={target}
            onChange={setTarget}
            placeholder="Search by name or ticker..."
            icon={<Crosshair className="w-4 h-4" />}
            hint="e.g. Salesforce or CRM"
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

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {isAnalyzing && (
        <div className="space-y-6">
          <SkeletonBlock height="h-48" />
          <SkeletonBlock height="h-32" />
          <SkeletonBlock height="h-40" />
        </div>
      )}

      {/* Results */}
      {results && !isAnalyzing && (
        <div className="space-y-10">

          {/* Deal Grade Card */}
          {results.dealGrade?.grade && (
            <DealGradeCard grade={results.dealGrade.grade} verdict={results.dealGrade.verdict} />
          )}

          {/* A. Deal Overview */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">A. Deal Overview</h3>
            <div className="data-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="text-right">Acquirer</th>
                    <th className="text-right">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Company",         results.acquirerData?.name,          results.targetData?.name],
                    ["Market Cap",      results.acquirerData?.marketCap,      results.targetData?.marketCap],
                    ["Enterprise Value",results.acquirerData?.ev,             results.targetData?.ev],
                    ["LTM Revenue",     results.acquirerData?.totalRevenue,   results.targetData?.totalRevenue],
                    ["LTM EBITDA",      results.acquirerData?.ebitda,         results.targetData?.ebitda],
                    ["EV / EBITDA",     results.acquirerData?.evEbitda,       results.targetData?.evEbitda],
                    ["EBITDA Margin",   results.acquirerData?.ebitdaMargin,   results.targetData?.ebitdaMargin],
                    ["Revenue Growth",  results.acquirerData?.revenueGrowth,  results.targetData?.revenueGrowth],
                  ].map(([metric, acq, tgt], i) => (
                    <tr key={i}>
                      <td className="font-medium text-foreground">{metric}</td>
                      <td className={`num ${acq === "N/A" ? "text-destructive font-medium" : ""}`}>{acq || "N/A"}</td>
                      <td className={`num font-medium ${tgt === "N/A" ? "text-destructive" : ""}`}>{tgt || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(Object.values(results.acquirerData || {}).includes("N/A") ||
              Object.values(results.targetData || {}).includes("N/A")) && (
              <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Some financial data unavailable for this company. Analysis may be limited.
              </p>
            )}
          </section>

          <hr className="border-border" />

          {/* B. Premiums Paid Analysis */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">B. Premiums Paid Analysis</h3>
            <div className="data-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th className="text-right">Acquisition Cost (EV)</th>
                    <th className="text-right">Implied Offer Price / Share</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium text-foreground">Low (+15% premium)</td>
                    <td className="num">{results.valuationLow || "N/A"}</td>
                    <td className="num">{results.valuationLowPerShare || "N/A"}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">Mid (+25% premium)</td>
                    <td className="num">{results.valuationMid || "N/A"}</td>
                    <td className="num">{results.valuationMidPerShare || "N/A"}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-foreground">High (+40% premium)</td>
                    <td className="num">{results.valuationHigh || "N/A"}</td>
                    <td className="num">{results.valuationHighPerShare || "N/A"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          {/* Acquisition premium chart */}
          {(() => {
            const currentEV = parseToB(results.targetData?.ev);
            if (currentEV === null) return null;
            const rows: FFRow[] = [
              { label: "Low (+15%)", val: results.valuationLow, color: "#94a3b8" },
              { label: "Mid (+25%)", val: results.valuationMid, color: "#4263eb" },
              { label: "High (+40%)", val: results.valuationHigh, color: "#2f9e44" },
            ].reduce((acc, { label, val, color }) => {
              const v = parseToB(val ?? "");
              if (v === null) return acc;
              const premium = v - currentEV;
              if (premium <= 0) return acc;
              acc.push({ label, value: premium, displayValue: `+${formatB(premium)}`, color });
              return acc;
            }, [] as FFRow[]);
            if (rows.length === 0) return null;
            return (
              <FootballFieldChart
                title="Acquisition Premium by Scenario"
                subtitle={`Premium paid above current target EV (${results.targetData?.ev})`}
                rows={rows}
                formatTick={formatB}
                yAxisWidth={110}
              />
            );
          })()}
          </section>

          <hr className="border-border" />

          {/* C. Strategic Rationale */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">C. Strategic Rationale</h3>
            <div className="ai-section">
              {results.rationale?.summary && (
                <p className="text-sm text-foreground font-medium mb-4 leading-relaxed">
                  {results.rationale.summary}
                </p>
              )}
              {results.rationale?.bullets?.length > 0 && (
                <ul className="space-y-2">
                  {results.rationale.bullets.map((bullet: string, i: number) => {
                    const html = bullet
                      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
                      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
                    return (
                      <li key={i} className="text-sm text-foreground leading-relaxed flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <span dangerouslySetInnerHTML={{ __html: html }} />
                      </li>
                    );
                  })}
                </ul>
              )}
              {!results.rationale?.summary && !results.rationale?.bullets?.length && (
                <p className="text-sm text-muted-foreground">Analysis unavailable.</p>
              )}
              <div className="ai-attribution">Generated by Claude</div>
            </div>
          </section>

          <hr className="border-border" />

          {/* D. Synergies & Integration */}
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

          {/* E. Accretion / Dilution Analysis */}
          {(results.accretionLow || results.accretionMid || results.accretionHigh) && (
            <>
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-1">E. Accretion / Dilution Analysis</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Based on trailing EPS · no synergies assumed (conservative) ·{" "}
                  {dealStructure === "all-cash"
                    ? "5.5% cost of debt, 25% tax rate"
                    : dealStructure === "all-stock"
                    ? "new shares issued at current acquirer price"
                    : "50/50 cash/stock — cash at 5.5% cost of debt, 25% tax rate"}
                </p>
                <div className="data-table">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th>Scenario</th>
                        <th className="text-right">Acquirer Standalone EPS</th>
                        <th className="text-right">Pro Forma EPS</th>
                        <th className="text-right">Accretion / (Dilution)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        ["Low (+15%)",  results.accretionLow],
                        ["Mid (+25%)",  results.accretionMid],
                        ["High (+40%)", results.accretionHigh],
                      ] as [string, any][]).map(([label, acc]) =>
                        acc ? (
                          <tr key={label}>
                            <td className="font-medium text-foreground">{label}</td>
                            <td className="num">${acc.standaloneEPS}</td>
                            <td className="num">${acc.proFormaEPS}</td>
                            <td className={`num font-bold ${acc.isAccretive ? "text-success" : "text-destructive"}`}>
                              {acc.accretionPct}
                            </td>
                          </tr>
                        ) : null
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              <hr className="border-border" />
            </>
          )}

          {/* F. Key Risk Flags */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">F. Key Risk Flags</h3>
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

          <p className="text-xs text-muted-foreground pt-4">
            Financial data sourced from Yahoo Finance. Discount rates and industry risk premiums sourced from Damodaran Online (NYU Stern). AI analysis generated by Claude.
          </p>
        </div>
      )}
    </div>
  );
};

export default DealSimulator;
