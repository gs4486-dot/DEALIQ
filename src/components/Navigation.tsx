import type { TabId, ViewMode } from "@/pages/Index";

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: "simulator", label: "Deal Simulator" },
  { id: "tracker", label: "Deal Tracker" },
  { id: "comps", label: "Comps Engine" },
];

const Navigation = ({ activeTab, onTabChange, viewMode, onViewModeChange }: NavigationProps) => {
  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
        <button
          onClick={() => onTabChange("landing")}
          className="text-xl font-bold text-primary tracking-tight"
        >
          DEALIQ
        </button>

        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-4 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium mr-1">View As</span>
          <div className="relative flex bg-secondary-bg rounded-full p-0.5">
            <button
              onClick={() => onViewModeChange("ib-analyst")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                viewMode === "ib-analyst"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              IB Analyst
            </button>
            <button
              onClick={() => onViewModeChange("pe-associate")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                viewMode === "pe-associate"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              PE Associate
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
