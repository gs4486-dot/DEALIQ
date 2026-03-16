import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";

interface DealTrackerProps {
  onSimulateDeal: (acquirer: string, target: string) => void;
}

// Mock deal data
// TODO: Wire to SEC EDGAR full-text search API (EDGAR_API_KEY) and FMP M&A endpoint
// TODO: Claude generates one-line rationale per deal (ANTHROPIC_API_KEY), cached after first call
const mockDeals = [
  {
    id: 1,
    acquirer: "Microsoft",
    target: "Activision Blizzard",
    value: "$68.7B",
    sector: "Technology",
    date: "2024-10-13",
    type: "Strategic",
    rationale: "Expands gaming portfolio and cloud gaming infrastructure capabilities.",
  },
  {
    id: 2,
    acquirer: "Broadcom",
    target: "VMware",
    value: "$61.0B",
    sector: "Technology",
    date: "2024-09-22",
    type: "Strategic",
    rationale: "Combines semiconductor and enterprise software for hybrid cloud dominance.",
  },
  {
    id: 3,
    acquirer: "Exxon Mobil",
    target: "Pioneer Natural Resources",
    value: "$59.5B",
    sector: "Energy",
    date: "2024-08-15",
    type: "Strategic",
    rationale: "Consolidates Permian Basin acreage to become largest unconventional producer.",
  },
  {
    id: 4,
    acquirer: "Pfizer",
    target: "Seagen",
    value: "$43.0B",
    sector: "Healthcare",
    date: "2024-07-28",
    type: "Strategic",
    rationale: "Acquires leading antibody-drug conjugate oncology pipeline post-COVID revenue decline.",
  },
  {
    id: 5,
    acquirer: "Silver Lake Partners",
    target: "Qualtrics",
    value: "$12.5B",
    sector: "Technology",
    date: "2024-06-10",
    type: "Financial",
    rationale: "Take-private at 8x revenue; operational improvement thesis on margin expansion.",
  },
  {
    id: 6,
    acquirer: "Cisco Systems",
    target: "Splunk",
    value: "$28.0B",
    sector: "Technology",
    date: "2024-05-18",
    type: "Strategic",
    rationale: "Adds observability and security analytics to networking portfolio.",
  },
  {
    id: 7,
    acquirer: "Capital One",
    target: "Discover Financial",
    value: "$35.3B",
    sector: "Financial Services",
    date: "2024-04-20",
    type: "Strategic",
    rationale: "Creates sixth-largest US bank with proprietary payments network.",
  },
  {
    id: 8,
    acquirer: "Diamondback Energy",
    target: "Endeavor Energy Resources",
    value: "$26.0B",
    sector: "Energy",
    date: "2024-03-11",
    type: "Strategic",
    rationale: "Further Permian Basin consolidation drives scale efficiencies and inventory depth.",
  },
];

const sectors = ["All Sectors", "Technology", "Healthcare", "Energy", "Financial Services", "Industrials"];
const dealTypes = ["All Types", "Strategic", "Financial"];

const DealTracker = ({ onSimulateDeal }: DealTrackerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All Sectors");
  const [typeFilter, setTypeFilter] = useState("All Types");

  const filteredDeals = mockDeals.filter((deal) => {
    const matchesSearch =
      !searchQuery ||
      [deal.acquirer, deal.target, deal.sector].some((f) =>
        f.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesSector = sectorFilter === "All Sectors" || deal.sector === sectorFilter;
    const matchesType = typeFilter === "All Types" || deal.type === typeFilter;
    return matchesSearch && matchesSector && matchesType;
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h2 className="text-[22px] font-semibold text-foreground mb-6">Deal Tracker</h2>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by company name, ticker, or keyword"
          className="w-full h-12 pl-12 pr-6 border border-input rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-background"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="h-[38px] px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-[38px] px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {dealTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Deal Feed */}
      <div className="space-y-3">
        {filteredDeals.map((deal) => (
          <div
            key={deal.id}
            className="bg-card border border-border rounded-xl shadow-card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground text-sm">{deal.acquirer}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-primary text-sm">{deal.target}</span>
                  <span className="ml-2 text-sm font-semibold tabular-nums">{deal.value}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span>{deal.sector}</span>
                  <span>•</span>
                  <span>{deal.type}</span>
                  <span>•</span>
                  <span>{deal.date}</span>
                </div>
                <p className="text-xs text-muted-foreground italic">{deal.rationale}</p>
              </div>
              <button
                onClick={() => onSimulateDeal(deal.acquirer, deal.target)}
                className="shrink-0 px-3 py-1.5 border border-primary text-primary rounded-lg text-xs font-medium hover:bg-accent-bg transition-colors duration-100"
              >
                Simulate
              </button>
            </div>
          </div>
        ))}
        {filteredDeals.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">No deals match your search criteria.</p>
        )}
      </div>
    </div>
  );
};

export default DealTracker;
