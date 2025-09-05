"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { 
  Search, 
  X, 
  Clock, 
  Trash2, 
  Star,
  TrendingUp,
  History,
  BookmarkPlus
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AutocompleteSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  showHistory?: boolean;
  showSuggestions?: boolean;
  autoFocus?: boolean;
}

export function AutocompleteSearch({
  value,
  onChange,
  onSearch,
  placeholder = "Search events...",
  className = "",
  showHistory = true,
  showSuggestions = true,
  autoFocus = false,
}: AutocompleteSearchProps) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get user profile
  const userProfile = useQuery(api.users.getCurrentUser, user ? {} : "skip");

  // Debounce the search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Get autocomplete suggestions
  const suggestions = useQuery(
    api.events.getSearchSuggestions,
    showSuggestions && debouncedValue.length >= 2 && isOpen
      ? { query: debouncedValue, limit: 6 }
      : "skip"
  );

  // Get search history
  const searchHistory = useQuery(
    api.search.getSearchHistory,
    showHistory && userProfile?._id && isOpen
      ? { userId: userProfile._id, limit: 5 }
      : "skip"
  );

  // Get popular searches
  const popularSearches = useQuery(
    api.events.getPopularSearches,
    isOpen && (!value || value.length < 2) ? {} : "skip"
  );

  // Get saved searches
  const savedSearches = useQuery(
    api.search.getSavedSearches,
    userProfile?._id && isOpen ? { userId: userProfile._id } : "skip"
  );

  // Mutations
  const addToHistory = useMutation(api.search.addSearchToHistory);
  const clearHistory = useMutation(api.search.clearSearchHistory);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle search submission
  const handleSearch = useCallback((query: string) => {
    if (query.trim() && userProfile?._id) {
      addToHistory({
        userId: userProfile._id,
        query: query.trim(),
        resultsCount: 0, // Will be updated after search results are available
      });
    }
    onSearch?.(query.trim());
    setIsOpen(false);
  }, [userProfile, addToHistory, onSearch]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    handleSearch(suggestion);
  };

  // Handle history item click
  const handleHistoryClick = (query: string) => {
    onChange(query);
    handleSearch(query);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(value);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Clear search history
  const handleClearHistory = async () => {
    if (userProfile?._id) {
      await clearHistory({ userId: userProfile._id });
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus={autoFocus}
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          
          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <Search className="w-3 h-3" />
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm"
                >
                  <span className="font-medium">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search History */}
          {showHistory && searchHistory && searchHistory.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <History className="w-3 h-3" />
                  Recent Searches
                </div>
                <button
                  onClick={handleClearHistory}
                  className="text-gray-400 hover:text-gray-600"
                  title="Clear history"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              {searchHistory.map((item) => (
                <button
                  key={item._id}
                  onClick={() => handleHistoryClick(item.query)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm flex items-center justify-between group"
                >
                  <span>{item.query}</span>
                  <Clock className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {/* Saved Searches */}
          {savedSearches && savedSearches.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <BookmarkPlus className="w-3 h-3" />
                Saved Searches
              </div>
              {savedSearches.slice(0, 3).map((saved) => (
                <button
                  key={saved._id}
                  onClick={() => handleHistoryClick(saved.query)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm flex items-center justify-between group"
                >
                  <div>
                    <div className="font-medium">{saved.name}</div>
                    <div className="text-xs text-gray-500">{saved.query}</div>
                  </div>
                  <Star className="w-3 h-3 text-yellow-500" />
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {popularSearches && popularSearches.length > 0 && (!value || value.length < 2) && (
            <div className="p-2">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <TrendingUp className="w-3 h-3" />
                Popular Searches
              </div>
              <div className="flex flex-wrap gap-1 px-2 py-1">
                {popularSearches.slice(0, 8).map((popular) => (
                  <Badge
                    key={popular.query}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-50 text-xs"
                    onClick={() => handleSuggestionClick(popular.query)}
                  >
                    {popular.query}
                    <span className="ml-1 text-gray-400">
                      {popular.count}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!suggestions || suggestions.length === 0) &&
           (!searchHistory || searchHistory.length === 0) &&
           (!savedSearches || savedSearches.length === 0) &&
           (!popularSearches || popularSearches.length === 0) && (
            <div className="p-4 text-center text-gray-500 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Start typing to see suggestions
            </div>
          )}
        </div>
      )}
    </div>
  );
}
