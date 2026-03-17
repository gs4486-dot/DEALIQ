import { BarChart3, Target, Search } from "lucide-react";
import type { TabId } from "@/pages/Index";

interface LandingPageProps {
  onNavigate: (tab: TabId) => void;
}

const tools = [
  {
    id: "simulator" as TabId,
    title: "Deal Simulator",
    description: "Model any M&A transaction between two US public companies with real financial data.",
    icon: BarChart3,
  },
  {
    id: "tracker" as TabId,
    title: "Deal Tracker",
    description: "Monitor announced transactions above $1B across US public markets.",
    icon: Target,
  },
  {
    id: "comps" as TabId,
    title: "Comps Engine",
    description: "Generate peer sets with live trading multiples and summary statistics.",
    icon: Search,
  },
];

const stats = [
  "US Public Markets",
  "Transactions Above $1B",
  "AI-Powered Analysis",
];

const steps = [
  { num: "1", text: "Enter two companies." },
  { num: "2", text: "We pull live financial data." },
  { num: "3", text: "AI generates institutional-grade analysis." },
];

const LandingPage = ({ onNavigate }: LandingPageProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero */}
      <div className="hero-curve bg-hero pt-28 pb-32 px-6">
        <div className="flex flex-col items-center text-center relative z-10">
          <h1 className="text-[72px] font-extrabold text-white tracking-tight leading-none">
            DEALIQ
          </h1>
          <p className="text-[22px] text-hero-muted mt-4 font-medium">
            Institutional-grade deal intelligence
          </p>
          <div className="mt-6 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-indigo-500/30 text-white/90 border border-white/10 backdrop-blur-sm">
            Powered by Claude AI
          </div>

          {/* Stat labels */}
          <div className="flex items-center gap-8 mt-12">
            {stats.map((stat) => (
              <span key={stat} className="text-xs font-medium tracking-wide uppercase text-white/60">
                {stat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tool Cards */}
      <div className="flex-1 flex flex-col items-center px-6 -mt-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-card border border-border rounded-2xl shadow-card p-7 flex flex-col items-start hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-xl bg-accent-bg flex items-center justify-center mb-5">
                <tool.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{tool.title}</h3>
              <p className="text-sm text-muted-foreground mb-7 flex-1">{tool.description}</p>
              <button
                onClick={() => onNavigate(tool.id)}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors duration-100"
              >
                Launch
              </button>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <p className="text-sm text-muted-foreground mt-10 tracking-wide">
          Built for IB analysts, PE associates, and finance students.
        </p>
      </div>

      {/* How It Works */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-10">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.num} className="flex flex-col items-center text-center">
              <span className="text-3xl font-extrabold text-primary mb-3">{step.num}</span>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-hero text-center py-8 text-xs text-white/50 mt-12">
        Financial data: Alpha Vantage. Industry benchmarks: Damodaran Online, NYU Stern. AI analysis: Claude by Anthropic.
      </footer>
    </div>
  );
};

export default LandingPage;