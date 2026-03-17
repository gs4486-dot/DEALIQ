import { useState, useEffect, useRef, useCallback } from "react";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export function useCompanySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/company-search?query=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setResults(Array.isArray(json) ? json : []);
      }
    } catch (e) {
      console.error("Company search error:", e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  return { query, setQuery, results, isSearching, clearResults: () => setResults([]) };
}
