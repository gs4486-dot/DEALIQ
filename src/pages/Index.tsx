import { useState } from "react";
import Navigation from "@/components/Navigation";
import LandingPage from "@/components/LandingPage";
import DealSimulator from "@/components/DealSimulator";
import DealTracker from "@/components/DealTracker";
import CompsEngine from "@/components/CompsEngine";

export type ViewMode = "ib-analyst" | "pe-associate";
export type TabId = "landing" | "simulator" | "tracker" | "comps";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("landing");
  const [viewMode, setViewMode] = useState<ViewMode>("ib-analyst");
  const [simulatorPrefill, setSimulatorPrefill] = useState<{ acquirer: string; target: string } | null>(null);

  const handleSimulateDeal = (acquirer: string, target: string) => {
    setSimulatorPrefill({ acquirer, target });
    setActiveTab("simulator");
  };

  return (
    <div className="min-h-screen bg-background">
      {activeTab !== "landing" && (
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}
      {activeTab === "landing" && <LandingPage onNavigate={setActiveTab} />}
      {activeTab === "simulator" && (
        <DealSimulator viewMode={viewMode} prefill={simulatorPrefill} onClearPrefill={() => setSimulatorPrefill(null)} />
      )}
      {activeTab === "tracker" && <DealTracker onSimulateDeal={handleSimulateDeal} />}
      {activeTab === "comps" && <CompsEngine viewMode={viewMode} />}
    </div>
  );
};

export default Index;
