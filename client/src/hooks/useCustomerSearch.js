import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';





export function useCustomerSearch(initialData = []) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(Array.isArray(initialData) ? initialData : []);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const prevResultsRef = useRef(results);


  useEffect(() => {
    if (!searchTerm) {
      if (prevResultsRef.current !== initialData) {
        setResults(initialData);
        prevResultsRef.current = initialData;
      }
    }
  }, [initialData, searchTerm]);





  const performSearch = useCallback(async (query) => {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      setResults(initialData);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(trimmed)}`);
      const newResults = Array.isArray(res.data) ? res.data : [];
      setResults(newResults);
      prevResultsRef.current = newResults;
    } catch (err) {
      console.error('[useCustomerSearch] Search failed:', err.message);
      setError(err.response?.data?.error || err.message || 'حدث خطأ أثناء البحث');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [initialData]);


  useEffect(() => {
    if (!searchTerm) return;

    const delayDebounceFn = setTimeout(() => {
      performSearch(searchTerm);
    }, 400); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, performSearch]);

  return {
    searchTerm,
    setSearchTerm,
    results,
    isSearching,
    error
  };
}