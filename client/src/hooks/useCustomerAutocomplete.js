import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

export function useCustomerAutocomplete(externalQuery, debounceTime = 250) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);


  const cache = useRef(new Map());

  const fetchSuggestions = useCallback(async (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }


    if (cache.current.has(trimmed)) {
      setSuggestions(cache.current.get(trimmed));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/customers/suggestions?query=${encodeURIComponent(trimmed)}`);
      const data = res.data.data || [];


      cache.current.set(trimmed, data);
      setSuggestions(data);
    } catch (err) {
      console.error('[Autocomplete] Failed:', err);
      setError('حدث خطأ');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {

    if (externalQuery.trim().length >= 2) {
        setIsLoading(true);
    }

    const handler = setTimeout(() => {
      fetchSuggestions(externalQuery);
    }, debounceTime);


    return () => clearTimeout(handler);
  }, [externalQuery, fetchSuggestions, debounceTime]);

  return {
    suggestions,
    isLoading,
    error
  };
}
