import { useState } from "react";
import Navigation from "@/components/Navigation";
import LandingPage from "@/components/LandingPage";
import DealSimulator from "@/components/DealSimulator";
import DealTracker from "@/components/DealTracker";
import CompsEngine from "@/components/CompsEngine";
export type TabId = "landing" | "simulator" | "tracker" | "comps";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>("landing");
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
        />
      )}
      {activeTab === "landing"   && <LandingPage onNavigate={setActiveTab} />}
      {activeTab === "simulator" && <DealSimulator prefill={simulatorPrefill} onClearPrefill={() => setSimulatorPrefill(null)} />}
      {activeTab === "tracker"   && <DealTracker onSimulateDeal={handleSimulateDeal} />}
      {activeTab === "comps"     && <CompsEngine />}
    </div>
  );
};

export default Index;
