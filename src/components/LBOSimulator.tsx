import { useState } from "react";
import { Crosshair, Loader2, AlertTriangle, TrendingUp, DoorOpen } from "lucide-react";
import { API_URL } from "@/lib/api";
import TickerSearchInput from "@/components/TickerSearchInput";
import AISection from "@/components/AISection";
import SkeletonBlock from "@/components/SkeletonBlock";
import FootballFieldChart, { type FFRow } from "@/components/FootballFieldChart";
import { toast } from "sonner";

interface Assumption {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  hint: string;
  step: number;
  min: number;
}

const NumberInput = ({ label, value, onChange, unit, hint, step, min }: Assumption) => (
  <div>
    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5 block">
      {label}
    </label>
    <div className="flex items-center border border-input rounded-lg overflow-hidden bg-background focus-within:ring-2 focus-within:ring-primary transition-shadow">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className="flex-1 h-9 px-3 text-sm font-mono tabular-nums bg-transparent focus:outline-none"
      />
      <span className="px-2.5 text-xs font-semibold text-muted-foreground bg-secondary-bg border-l border-input h-9 flex items-center shrink-0">
        {unit}
      </span>
    </div>
    <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>
  </div>
);

const irrColor = (irr: string) => {
  const n = parseFloat(irr);
  if (isNaN(n)) return "";
  if (n >= 20) return "text-success";
  if (n >= 15) return "text-amber-600";
  return "text-destructive";
};

const LBOSimulator = () => {
  const [ticker, setTicker] = useState("");
  const [entryMultiple, setEntryMultiple] = useState(12.0);
  const [leverage, setLeverage] = useState(5.0);
  const [ebitdaGrowth, setEbitdaGrowth] = useState(8.0);
  const [exitMultiple, setExitMultiple] = useState(12.0);
  const [holdPeriod, setHoldPeriod] = useState(5);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!ticker.trim()) {
      toast.error("Please select a target company");
      return;
    }
    setIsAnalyzing(true);
    setResults(null);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/lbo-simulator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.trim().toUpperCase(),
          entryMultiple,
          leverage,
          ebitdaGrowth,
          exitMultiple,
          holdPeriod,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Analysis failed. Make sure the server is running on port 3001.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const assumptions: Assumption[] = [
    { label: "Entry EV / EBITDA", value: entryMultiple, onChange: setEntryMultiple, unit: "x", hint: "Purchase price multiple", step: 0.5, min: 1 },
    { label: "Debt / EBITDA", value: leverage, onChange: setLeverage, unit: "x", hint: "Leverage at close", step: 0.25, min: 0 },
    { label: "EBITDA Growth", value: ebitdaGrowth, onChange: setEbitdaGrowth, unit: "%", hint: "Annual base case", step: 0.5, min: -20 },
    { label: "Exit EV / EBITDA", value: exitMultiple, onChange: setExitMultiple, unit: "x", hint: "Exit multiple (base)", step: 0.5, min: 1 },
    { label: "Hold Period", value: holdPeriod, onChange: (v) => setHoldPeriod(Math.round(v)), unit: "yrs", hint: "Typical: 4–7 years", step: 1, min: 1 },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h2 className="text-[32px] font-bold text-foreground mb-1">LBO Simulator</h2>
      <p className="text-muted-foreground text-sm mb-10">
        Model a leveraged buyout with custom deal assumptions
      </p>

      {/* Input Card */}
      <div className="bg-card border border-border rounded-xl shadow-card p-6 mb-8">

        {/* Target */}
        <div className="mb-5">
          <TickerSearchInput
            label="Target Company"
            value={ticker}
            onChange={setTicker}
            placeholder="Search by name or ticker..."
            icon={<Crosshair className="w-4 h-4" />}
            hint="e.g. Dell Technologies or DELL"
          />
        </div>

        {/* Assumptions */}
        <div className="bg-secondary-bg border border-border/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Deal Assumptions</p>
            <p className="text-[10px] text-muted-foreground">Adjust before running analysis</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {assumptions.map((a) => (
              <NumberInput key={a.label} {...a} />
            ))}
          </div>
        </div>

        <button
          onClick={runAnalysis}
          disabled={!ticker.trim() || isAnalyzing}
          className="w-full mt-5 h-[42px] bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running Analysis...
            </>
          ) : (
            "Run LBO Analysis"
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {isAnalyzing && (
        <div className="space-y-6">
          <SkeletonBlock height="h-40" />
          <SkeletonBlock height="h-32" />
          <SkeletonBlock height="h-48" />
        </div>
      )}

      {/* Results */}
      {results && !isAnalyzing && (
        <div className="space-y-10">

          {/* A. Target Snapshot */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">A. Target Snapshot</h3>
            <div className="data-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Company", results.targetData?.name],
                    ["Market Cap", results.targetData?.marketCap],
                    ["Enterprise Value", results.targetData?.ev],
                    ["LTM EBITDA (implied)", results.impliedEbitda],
                    ["Market EV / EBITDA", results.targetData?.evEbitda],
                  ].map(([label, val], i) => (
                    <tr key={i}>
                      <td className="font-medium text-foreground">{label}</td>
                      <td className={`num ${val === "N/A" ? "text-destructive" : ""}`}>{val || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <hr className="border-border" />

          {/* B. Sources & Uses */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-1">B. Sources & Uses</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Entry at {results.entryMultiple} EV/EBITDA &nbsp;·&nbsp; {results.leverage} leverage &nbsp;·&nbsp; {results.holdPeriod || results.assumptions?.years}yr hold
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Uses */}
              <div className="data-table">
                <table className="w-full">
                  <thead><tr><th colSpan={2}>Uses of Funds</th></tr></thead>
                  <tbody>
                    <tr>
                      <td className="font-medium text-foreground">Purchase Price (Entry EV)</td>
                      <td className="num font-semibold">{results.entryEV}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Sources */}
              <div className="data-table">
                <table className="w-full">
                  <thead><tr><th colSpan={3}>Sources of Funds</th></tr></thead>
                  <tbody>
                    <tr>
                      <td className="font-medium text-foreground">Debt ({results.debtPct})</td>
                      <td className="num">{results.debt}</td>
                    </tr>
                    <tr>
                      <td className="font-medium text-foreground">Equity ({results.equityPct})</td>
                      <td className="num font-semibold text-primary">{results.equityCheck}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* C. Return Scenarios */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-1">C. Return Scenarios</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Bear: 0.5x growth, exit {results.assumptions?.exitMult - 2}x &nbsp;·&nbsp;
              Base: 1x growth, exit {results.assumptions?.exitMult}x &nbsp;·&nbsp;
              Bull: 1.5x growth, exit {results.assumptions?.exitMult + 2}x
            </p>
            <div className="data-table">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th className="text-right">Exit EBITDA</th>
                    <th className="text-right">Exit EV</th>
                    <th className="text-right">Exit Equity</th>
                    <th className="text-right">IRR</th>
                    <th className="text-right">Cash-on-Cash</th>
                  </tr>
                </thead>
                <tbody>
                  {(results.scenarios || []).map((s: any, i: number) => (
                    <tr key={i}>
                      <td className="font-medium text-foreground">{s.label}</td>
                      <td className="num">{s.exitEbitda}</td>
                      <td className="num">{s.exitEV}</td>
                      <td className="num">{s.exitEquity}</td>
                      <td className={`num font-bold text-base ${irrColor(s.irr)}`}>{s.irr}</td>
                      <td className="num font-semibold">{s.coc}</td>
                    </tr>
                  ))}
                  {(!results.scenarios || results.scenarios.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground text-sm py-4">
                        Return analysis unavailable — EBITDA data required
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* IRR range chart */}
            {(() => {
              const colors = ["#c92a2a", "#f08c00", "#2f9e44"];
              const rows = (results.scenarios || [])
                .map((s: any, i: number): FFRow | null => {
                  // irrRaw is the raw decimal (e.g. 0.224); multiply to get percentage points
                  if (s.irrRaw == null || s.irrRaw <= 0) return null;
                  const v = s.irrRaw * 100;
                  return { label: s.label, value: v, displayValue: s.irr, color: colors[i] ?? "#4263eb" };
                })
                .filter((r: FFRow | null): r is FFRow => r !== null);

              if (rows.length === 0) return null;
              return (
                <FootballFieldChart
                  title="IRR by Scenario"
                  subtitle="PE hurdle rates: 15% minimum · 20%+ strong return"
                  rows={rows}
                  referenceLines={[
                    { value: 15, label: "15%", color: "#f08c00" },
                    { value: 20, label: "20%", color: "#2f9e44" },
                  ]}
                  formatTick={(v) => `${v.toFixed(0)}%`}
                  yAxisWidth={60}
                />
              );
            })()}
          </section>

          <hr className="border-border" />

          {/* D. Value Creation */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">D. Value Creation Levers</h3>
            <AISection label="Operational Levers">
              <ul className="space-y-2">
                {(results.valueCreation || []).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <TrendingUp className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </AISection>
          </section>

          <hr className="border-border" />

          {/* E. Exit Paths */}
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-4">E. Exit Paths</h3>
            <AISection label="Exit Scenarios">
              <ul className="space-y-3">
                {(results.exitPaths || []).map((path: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <DoorOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {path}
                  </li>
                ))}
              </ul>
            </AISection>
          </section>

          <p className="text-xs text-muted-foreground pt-4">
            Financial data sourced from Yahoo Finance. LBO model assumes ~15% annual debt paydown. Bear/Bull scenarios apply 0.5x/1.5x growth multipliers and exit multiple compression/expansion of 2x. AI analysis generated by Claude.
          </p>
        </div>
      )}
    </div>
  );
};

export default LBOSimulator;
