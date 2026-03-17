import { useState, useRef, useEffect } from "react";
import { useCompanySearch } from "@/hooks/useCompanySearch";

interface CompanyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onTickerSelect: (ticker: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  label: string;
}

const CompanyAutocomplete = ({ value, onChange, onTickerSelect, placeholder, icon, label }: CompanyAutocompleteProps) => {
  const { query, setQuery, results, isSearching, clearResults } = useCompanySearch();
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setQuery(val);
    setShowDropdown(true);
  };

  const handleSelect = (symbol: string, name: string) => {
    onChange(name);
    onTickerSelect(symbol);
    setShowDropdown(false);
    clearResults();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground">{icon}</div>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full h-[42px] pl-10 pr-4 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
        />
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => handleSelect(r.symbol, r.name)}
              className="w-full px-3 py-2.5 text-left hover:bg-accent-bg transition-colors flex items-center justify-between"
            >
              <div>
                <span className="text-sm font-medium text-foreground">{r.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{r.exchange}</span>
              </div>
              <span className="text-xs font-mono font-semibold text-primary">{r.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyAutocomplete;
