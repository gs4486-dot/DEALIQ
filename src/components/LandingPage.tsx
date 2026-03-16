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

const LandingPage = ({ onNavigate }: LandingPageProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-[56px] font-bold text-primary tracking-tight leading-tight">
            DEALIQ
          </h1>
          <p className="text-xl text-muted-foreground mt-3">
            Institutional-grade deal intelligence
          </p>
          <div className="mt-5 inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-accent-bg to-indigo-50 text-primary border border-accent">
            Powered by Claude AI
          </div>
        </div>

        {/* Tool Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="bg-card border border-border rounded-xl shadow-card p-6 flex flex-col items-start hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-bg flex items-center justify-center mb-4">
                <tool.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{tool.title}</h3>
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

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
        Financial data: Financial Modeling Prep. Discount rates: Damodaran Online, NYU Stern. AI: Claude by Anthropic.
      </footer>
    </div>
  );
};

export default LandingPage;
