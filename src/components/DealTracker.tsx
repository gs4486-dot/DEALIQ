import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";

interface DealMetrics {
  premiumPaid?: string;
  targetRevenue?: string;
  revenueGrowth?: string;
  ebitdaMargin?: string;
  evRevenue?: string;
  evEbitda?: string;
  specialNote?: string;
}

interface Deal {
  id: number;
  acquirer: string;
  target: string;
  value: string;
  sector: string;
  date: string;
  status: "Closed" | "Pending";
  type: "Strategic" | "Financial";
  rationale: string;
  metrics: DealMetrics;
}

const deals: Deal[] = [
  {
    id: 1,
    acquirer: "Google (Alphabet)",
    target: "Wiz",
    value: "$32.0B",
    sector: "Technology",
    date: "Mar 2025",
    status: "Closed",
    type: "Strategic",
    rationale: "Alphabet's largest-ever acquisition, adding a leading cloud security platform to strengthen Google Cloud against AWS and Azure in the fast-growing CNAPP market.",
    metrics: {
      targetRevenue: "~$1B ARR",
      revenueGrowth: ">100%",
      evRevenue: "~32x ARR",
      specialNote: "Private company. No public trading multiples.",
    },
  },
  {
    id: 2,
    acquirer: "Mars",
    target: "Kellanova",
    value: "$35.9B",
    sector: "Consumer Goods",
    date: "Mar 2025",
    status: "Closed",
    type: "Strategic",
    rationale: "Mars acquired the maker of Pringles, Cheez-It, and Pop-Tarts to diversify beyond confectionery and build a global snacking platform with over $50B in combined revenue.",
    metrics: {
      premiumPaid: "33%",
      targetRevenue: "$13.0B",
      revenueGrowth: "3.0%",
      ebitdaMargin: "15.2%",
      evEbitda: "~16x",
    },
  },
  {
    id: 3,
    acquirer: "Capital One",
    target: "Discover Financial",
    value: "$35.3B",
    sector: "Financial Services",
    date: "May 2025",
    status: "Closed",
    type: "Strategic",
    rationale: "Created the sixth-largest US bank and the only major card issuer with its own proprietary payments network, enabling Capital One to route transactions internally and compete directly with Visa and Mastercard.",
    metrics: {
      premiumPaid: "26%",
      specialNote: "Financial services deal valued on price-to-book. Discover book value ~$11B at announcement.",
    },
  },
  {
    id: 4,
    acquirer: "HP Enterprise",
    target: "Juniper Networks",
    value: "$14.0B",
    sector: "Technology",
    date: "Mar 2025",
    status: "Closed",
    type: "Strategic",
    rationale: "Combined HPE's server and storage infrastructure with Juniper's AI-driven networking and Mist AI platform to build a full-stack enterprise offering and compete with Cisco.",
    metrics: {
      premiumPaid: "32%",
      targetRevenue: "$5.1B",
      revenueGrowth: "3.0%",
      ebitdaMargin: "16.0%",
      evRevenue: "2.7x",
    },
  },
  {
    id: 5,
    acquirer: "ConocoPhillips",
    target: "Marathon Oil",
    value: "$22.5B",
    sector: "Energy",
    date: "Nov 2024",
    status: "Closed",
    type: "Strategic",
    rationale: "Added approximately 2 billion barrels of resource across the Eagle Ford, Bakken, and Permian at a sub-$30,000 per flowing barrel entry cost, well below replacement economics.",
    metrics: {
      premiumPaid: "14.7%",
      targetRevenue: "$6.5B",
      ebitdaMargin: "55.0%",
      evEbitda: "~5x",
      specialNote: "E&P deal. Valued primarily on resource base and production metrics.",
    },
  },
  {
    id: 6,
    acquirer: "Diamondback Energy",
    target: "Endeavor Energy Resources",
    value: "$26.0B",
    sector: "Energy",
    date: "Sep 2024",
    status: "Closed",
    type: "Strategic",
    rationale: "Formed the largest pure-play Permian Basin operator, with the most contiguous acreage in the Midland Basin and significant low-cost drilling inventory that underpins returns for over a decade.",
    metrics: {
      evEbitda: "~4x",
      specialNote: "Private company. No premium or public trading multiples available.",
    },
  },
  {
    id: 7,
    acquirer: "Exxon Mobil",
    target: "Pioneer Natural Resources",
    value: "$59.5B",
    sector: "Energy",
    date: "May 2024",
    status: "Closed",
    type: "Strategic",
    rationale: "Transformed Exxon into the largest unconventional oil producer in the US, doubling its Permian Basin footprint to over 1.4 million net acres and adding ~700,000 BOE/day of production.",
    metrics: {
      premiumPaid: "18%",
      targetRevenue: "$19.4B",
      ebitdaMargin: "60.0%",
      evEbitda: "5.4x",
    },
  },
  {
    id: 8,
    acquirer: "Cisco Systems",
    target: "Splunk",
    value: "$28.0B",
    sector: "Technology",
    date: "Mar 2024",
    status: "Closed",
    type: "Strategic",
    rationale: "Added AI-driven observability and security analytics to Cisco's networking portfolio, accelerating its transition from hardware to recurring software and subscription revenue.",
    metrics: {
      premiumPaid: "31%",
      targetRevenue: "$3.7B",
      revenueGrowth: "17.0%",
      ebitdaMargin: "8.0%",
      evRevenue: "7.7x",
    },
  },
  {
    id: 9,
    acquirer: "Broadcom",
    target: "VMware",
    value: "$61.0B",
    sector: "Technology",
    date: "Nov 2023",
    status: "Closed",
    type: "Strategic",
    rationale: "Combined semiconductor leadership with enterprise virtualization to bet on hybrid cloud infrastructure as the dominant architecture. Broadcom immediately moved VMware to a subscription model, compressing ARR conversion.",
    metrics: {
      premiumPaid: "44%",
      targetRevenue: "$13.3B",
      revenueGrowth: "3.0%",
      ebitdaMargin: "20.0%",
      evRevenue: "4.6x",
      evEbitda: "22x",
    },
  },
  {
    id: 10,
    acquirer: "Microsoft",
    target: "Activision Blizzard",
    value: "$68.7B",
    sector: "Technology",
    date: "Oct 2023",
    status: "Closed",
    type: "Strategic",
    rationale: "Microsoft's largest acquisition ever, securing Call of Duty, World of Warcraft, and Candy Crush to anchor Game Pass and gain scale in mobile gaming. Cleared after 20 months of global regulatory scrutiny.",
    metrics: {
      premiumPaid: "45%",
      targetRevenue: "$7.5B",
      revenueGrowth: "2.0%",
      ebitdaMargin: "35.0%",
      evRevenue: "8.8x",
      evEbitda: "25x",
    },
  },
  {
    id: 11,
    acquirer: "Pfizer",
    target: "Seagen",
    value: "$43.0B",
    sector: "Healthcare",
    date: "Dec 2023",
    status: "Closed",
    type: "Strategic",
    rationale: "Acquired a leading antibody-drug conjugate oncology platform with four approved drugs and a deep clinical pipeline, replenishing Pfizer's revenue base following the expected decline of COVID-related products.",
    metrics: {
      premiumPaid: "33%",
      targetRevenue: "$2.2B",
      revenueGrowth: "25.0%",
      evRevenue: "19x",
      specialNote: "Biotech premium reflects pipeline value, not current earnings.",
    },
  },
  {
    id: 12,
    acquirer: "Silver Lake",
    target: "Qualtrics",
    value: "$12.5B",
    sector: "Technology",
    date: "Jun 2023",
    status: "Closed",
    type: "Financial",
    rationale: "Take-private with a thesis on margin expansion and operational focus away from public market pressure. Qualtrics had strong net revenue retention and a defensible position in enterprise experience management.",
    metrics: {
      premiumPaid: "60%",
      targetRevenue: "$1.65B",
      revenueGrowth: "19.0%",
      ebitdaMargin: "-5.0%",
      evRevenue: "7.6x",
    },
  },
];

const METRIC_LABELS: Record<keyof DealMetrics, string> = {
  premiumPaid: "Premium Paid",
  targetRevenue: "Target Revenue",
  revenueGrowth: "Revenue Growth",
  ebitdaMargin: "EBITDA Margin",
  evRevenue: "EV / Revenue",
  evEbitda: "EV / EBITDA",
  specialNote: "",
};

const sectors = ["All Sectors", "Technology", "Healthcare", "Energy", "Financial Services", "Consumer Goods"];
const dealTypes = ["All Types", "Strategic", "Financial"];
const statuses = ["All Status", "Closed", "Pending"];

const statusStyle: Record<string, string> = {
  Closed: "bg-success/10 text-success",
  Pending: "bg-yellow-100 text-yellow-700",
};

const DealTracker = (_props: DealTrackerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All Sectors");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      !searchQuery ||
      [deal.acquirer, deal.target, deal.sector].some((f) =>
        f.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return (
      matchesSearch &&
      (sectorFilter === "All Sectors" || deal.sector === sectorFilter) &&
      (typeFilter === "All Types" || deal.type === typeFilter) &&
      (statusFilter === "All Status" || deal.status === statusFilter)
    );
  });

  const metricKeys = (["premiumPaid", "targetRevenue", "revenueGrowth", "ebitdaMargin", "evRevenue", "evEbitda"] as const);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h2 className="text-[32px] font-bold text-foreground mb-1">Deal Tracker</h2>
      <p className="text-muted-foreground text-sm mb-10">
        Major M&A transactions above $1B with deal metrics at time of announcement
      </p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by company name or sector"
          className="w-full h-12 pl-12 pr-6 border border-input rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow bg-background"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {[
          { value: sectorFilter, onChange: setSectorFilter, options: sectors },
          { value: typeFilter, onChange: setTypeFilter, options: dealTypes },
          { value: statusFilter, onChange: setStatusFilter, options: statuses },
        ].map((f, i) => (
          <select
            key={i}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            className="h-[38px] px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {f.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Deal Cards */}
      <div className="space-y-4">
        {filteredDeals.map((deal) => {
          const availableMetrics = metricKeys.filter((k) => deal.metrics[k]);
          return (
            <div key={deal.id} className="bg-card border border-border rounded-xl shadow-card p-6">

              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-foreground text-base">{deal.acquirer}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-bold text-primary text-base">{deal.target}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-accent-bg text-accent-foreground">{deal.sector}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary-bg text-muted-foreground">{deal.type}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyle[deal.status]}`}>{deal.status}</span>
                    <span className="text-xs text-muted-foreground">{deal.date}</span>
                  </div>
                </div>
                <span className="text-xl font-bold text-primary tabular-nums shrink-0">{deal.value}</span>
              </div>

              {/* Metrics grid (only fields with values) */}
              {availableMetrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4 p-4 bg-secondary-bg rounded-lg">
                  {availableMetrics.map((key) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
                        {METRIC_LABELS[key]}
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {deal.metrics[key]}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Special note */}
              {deal.metrics.specialNote && (
                <p className="text-xs text-muted-foreground italic mb-3">{deal.metrics.specialNote}</p>
              )}

              {/* Rationale */}
              <p className="text-sm text-muted-foreground leading-relaxed">{deal.rationale}</p>
            </div>
          );
        })}

        {filteredDeals.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">No deals match your filters.</p>
        )}
      </div>
    </div>
  );
};

interface DealTrackerProps {
  onSimulateDeal?: (acquirer: string, target: string) => void;
}

export default DealTracker;
