"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function MatchNotificationBadge() {
  const matchSuggestions = useQuery(api.matches.getMatchSuggestions, { limit: 50 });
  
  const pendingCount = matchSuggestions?.length || 0;
  
  if (pendingCount === 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-full ml-2 animate-pulse">
      {pendingCount > 9 ? '9+' : pendingCount}
    </span>
  );
}
