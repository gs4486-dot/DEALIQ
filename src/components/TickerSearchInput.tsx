import { useState, useRef, useEffect } from "react";
import { API_URL } from "@/lib/api";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

interface TickerSearchInputProps {
  value: string;
  onChange: (ticker: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  label?: string;
  hint?: string;
}

const TickerSearchInput = ({ value, onChange, placeholder, icon, label, hint }: TickerSearchInputProps) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep query in sync if parent resets value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/search?query=${encodeURIComponent(q)}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    search(q);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.symbol);
    onChange(result.symbol);
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        )}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder || "Search by name or ticker..."}
          className={`w-full h-[42px] ${icon ? "pl-10" : "pl-4"} pr-4 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow`}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {results.map((r) => (
            <li
              key={r.symbol}
              onMouseDown={() => handleSelect(r)}
              className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-accent-bg transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-bold text-primary font-mono shrink-0">{r.symbol}</span>
                <span className="text-sm text-foreground truncate">{r.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground ml-3 shrink-0">{r.exchange}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TickerSearchInput;
