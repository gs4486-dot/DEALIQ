import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase.functions.invoke("company-search", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: null,
      });

      // company-search uses GET with query params, so we need to call it differently
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
