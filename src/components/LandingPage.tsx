import { BarChart3, Target, Search, TrendingUp, Zap, BrainCircuit, Database } from "lucide-react";
import type { TabId } from "@/pages/Index";

interface LandingPageProps {
  onNavigate: (tab: TabId) => void;
}

const tools = [
  {
    id: "simulator" as TabId,
    title: "M&A Simulator",
    description: "Pick any two public companies. Get a full M&A tearsheet with valuation scenarios, strategic rationale, synergy estimates, and risk flags in under a minute.",
    icon: BarChart3,
    cta: "Simulate a Deal",
  },
  {
    id: "tracker" as TabId,
    title: "Deal Tracker",
    description: "A curated feed of major M&A transactions above $1B with deal metrics at announcement. Filter by sector, type, and status.",
    icon: Target,
    cta: "Track Deals",
  },
  {
    id: "comps" as TabId,
    title: "Comps Engine",
    description: "Enter a ticker and get an AI-selected peer set with live EV/EBITDA, EV/Revenue, and margin multiples, ready for a comp table.",
    icon: Search,
    cta: "Run Comps",
  },
  {
    id: "lbo" as TabId,
    title: "LBO Simulator",
    description: "Model a leveraged buyout with custom entry multiple, leverage, and growth assumptions. Get IRR and cash-on-cash returns across bear, base, and bull scenarios.",
    icon: TrendingUp,
    cta: "Model an LBO",
  },
];

const pillars = [
  {
    icon: Zap,
    title: "Seconds, Not Hours",
    description: "What used to take an analyst hours of data pulling and formatting now happens instantly. Enter tickers, get a full tearsheet.",
  },
  {
    icon: BrainCircuit,
    title: "Analyst-Quality Output",
    description: "Powered by Claude AI with deep M&A context. The output reads like a senior analyst wrote it, structured the same way deals are actually presented.",
  },
  {
    icon: Database,
    title: "Live Market Data",
    description: "Real-time financials from Yahoo Finance: market cap, EV, EBITDA margins, and revenue growth, cross-referenced with Damodaran benchmarks.",
  },
];

const steps = [
  {
    num: "01",
    title: "Enter two tickers",
    description: "Type any two US-listed companies and pick a deal structure. No spreadsheets, no setup.",
  },
  {
    num: "02",
    title: "Live data is fetched",
    description: "Market cap, EV, EBITDA margins, and revenue growth pulled instantly from live market sources.",
  },
  {
    num: "03",
    title: "AI generates the tearsheet",
    description: "Strategic rationale, valuation scenarios, synergy estimates, and risk flags, structured the way analysts present them.",
  },
];

const LandingPage = ({ onNavigate }: LandingPageProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Hero */}
      <div className="hero-curve bg-hero pt-24 pb-36 px-6">
        <div className="flex flex-col items-center text-center relative z-10 max-w-3xl mx-auto">
          <div className="mb-6 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/15 backdrop-blur-sm tracking-wide uppercase">
            Powered by Claude AI &nbsp;·&nbsp; Live Market Data
          </div>

          <h1 className="text-5xl md:text-[64px] font-extrabold text-white tracking-tight leading-[1.05]">
            M&A Analysis.<br />In Seconds.
          </h1>

          <p className="text-lg text-white/60 mt-6 max-w-xl leading-relaxed">
            Institutional-grade deal intelligence for financial analysts. Model transactions, run comps, and generate structured tearsheets in the time it takes to open a spreadsheet.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-10">
            <button
              onClick={() => onNavigate("simulator")}
              className="px-7 py-3 bg-white text-gray-900 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors"
            >
              Try Deal Simulator
            </button>
            <button
              onClick={() => onNavigate("comps")}
              className="px-7 py-3 bg-white/10 text-white rounded-lg text-sm font-semibold border border-white/20 hover:bg-white/15 transition-colors"
            >
              Run a Comps Table
            </button>
          </div>

          <p className="text-xs text-white/35 mt-8 tracking-wide">
            Built for financial analysts · No account required
          </p>
        </div>
      </div>

      {/* Tool Cards */}
      <div className="flex-1 flex flex-col items-center px-6 -mt-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl w-full">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-card border border-border rounded-2xl shadow-card p-7 flex flex-col items-start hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-xl bg-accent-bg flex items-center justify-center mb-5">
                <tool.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{tool.title}</h3>
              <p className="text-sm text-muted-foreground mb-7 flex-1 leading-relaxed">{tool.description}</p>
              <button
                onClick={() => onNavigate(tool.id)}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors duration-100"
              >
                {tool.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Why DEALIQ */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-4 w-full">
        <h2 className="text-2xl font-bold text-foreground text-center mb-3">Why DEALIQ</h2>
        <p className="text-sm text-muted-foreground text-center mb-12 max-w-lg mx-auto">
          Analyst workflows, compressed into a tool anyone can use.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((p) => (
            <div key={p.title} className="flex flex-col items-start">
              <div className="w-10 h-10 rounded-lg bg-accent-bg flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-10 w-full">
        <h2 className="text-2xl font-bold text-foreground text-center mb-3">How It Works</h2>
        <p className="text-sm text-muted-foreground text-center mb-12 max-w-lg mx-auto">
          Three steps from idea to tearsheet.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step) => (
            <div key={step.num} className="flex flex-col items-start">
              <span className="text-4xl font-extrabold text-primary/20 mb-3 leading-none">{step.num}</span>
              <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-hero mt-16 py-16 px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to run your first deal?</h2>
        <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto">
          Pick any two public companies and see what DEALIQ produces in under 60 seconds.
        </p>
        <button
          onClick={() => onNavigate("simulator")}
          className="px-8 py-3 bg-white text-gray-900 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors"
        >
          Try Deal Simulator
        </button>
      </section>

      {/* Footer */}
      <footer className="bg-hero border-t border-white/5 text-center py-6 text-xs text-white/30">
        Financial data: Yahoo Finance. Industry benchmarks: Damodaran Online, NYU Stern. AI analysis: Claude by Anthropic.
      </footer>
    </div>
  );
};

export default LandingPage;
