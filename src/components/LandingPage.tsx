import { BarChart3, Target, Search } from "lucide-react";
import type { TabId } from "@/pages/Index";

interface LandingPageProps {
  onNavigate: (tab: TabId) => void;
}

const tools = [
  {
    id: "simulator" as TabId,
    title: "Deal Simulator",
    description: "Simulate any M&A transaction between two US public companies",
    icon: BarChart3,
  },
  {
    id: "tracker" as TabId,
    title: "Deal Tracker",
    description: "Track live deals above $1B across US public markets",
    icon: Target,
  },
  {
    id: "comps" as TabId,
    title: "Comps Engine",
    description: "AI-selected comparable companies with live multiples",
    icon: Search,
  },
];

const stats = [
  "US Public Markets",
  "Deals Above $1B Tracked",
  "AI-Powered Analysis",
];

const LandingPage = ({ onNavigate }: LandingPageProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero — deep navy */}
      <div className="hero-curve bg-hero pt-24 pb-28 px-6">
        <div className="flex flex-col items-center text-center relative z-10">
          <h1 className="text-[72px] font-extrabold text-white tracking-tight leading-none">
            DEALIQ
          </h1>
          <p className="text-[22px] text-hero-muted mt-3 font-medium">
            Institutional-grade deal intelligence
          </p>
          <div className="mt-5 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-indigo-500/30 text-white/90 border border-white/10 backdrop-blur-sm">
            Powered by Claude AI
          </div>

          {/* Stat labels */}
          <div className="flex items-center gap-8 mt-10">
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
              className="bg-card border border-border rounded-2xl shadow-card p-6 flex flex-col items-start hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-11 h-11 rounded-xl bg-accent-bg flex items-center justify-center mb-4">
                <tool.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{tool.title}</h3>
              <p className="text-sm text-muted-foreground mb-6 flex-1">{tool.description}</p>
              <button
                onClick={() => onNavigate(tool.id)}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors duration-100"
              >
                Launch
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer — deep navy */}
      <footer className="bg-hero text-center py-6 text-xs text-white/50 mt-16">
        Financial data: Financial Modeling Prep. Discount rates: Damodaran Online, NYU Stern. AI: Claude by Anthropic.
      </footer>
    </div>
  );
};

export default LandingPage;
