import type { TabId } from "@/pages/Index";

interface NavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: "simulator", label: "M&A Simulator" },
  { id: "tracker",   label: "Deal Tracker"  },
  { id: "comps",     label: "Comps Engine"  },
];

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
        <button
          onClick={() => onTabChange("landing")}
          className="text-2xl font-extrabold text-primary tracking-tight"
        >
          DEALIQ
        </button>

        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-4 text-sm transition-colors relative ${
                activeTab === tab.id
                  ? "text-primary font-bold"
                  : "text-muted-foreground font-medium hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Spacer to keep tabs centered */}
        <div className="w-[72px]" />
      </div>
    </nav>
  );
};

export default Navigation;
