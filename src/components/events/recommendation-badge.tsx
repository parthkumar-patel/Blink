"use client";

import { Star } from "lucide-react";
import { useState } from "react";

interface RecommendationBadgeProps {
  score: number;
  reasons?: string[];
  className?: string;
}

export function RecommendationBadge({ score, reasons = [], className = "" }: RecommendationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const percentage = Math.round(score * 100);
  
  // Color coding based on score
  const getBadgeColor = () => {
    if (percentage >= 85) return "bg-green-600"; // Excellent match
    if (percentage >= 70) return "bg-blue-600";  // Good match  
    if (percentage >= 55) return "bg-yellow-600"; // Okay match
    return "bg-gray-600"; // Poor match
  };

  const getMatchLabel = () => {
    if (percentage >= 85) return "Excellent match";
    if (percentage >= 70) return "Good match";
    if (percentage >= 55) return "Okay match";
    return "Low match";
  };

  return (
    <div className="relative">
      <div 
        className={`${getBadgeColor()} text-white px-2 py-1 rounded-full text-sm font-medium flex items-center gap-1 cursor-help ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={getMatchLabel()}
      >
        <Star className="w-3 h-3" />
        {percentage}%
      </div>
      
      {/* Tooltip with recommendation reasons */}
      {showTooltip && reasons.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-10">
          <div className="font-medium mb-2">{getMatchLabel()}</div>
          <ul className="space-y-1">
            {reasons.map((reason, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-blue-300">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          {/* Arrow */}
          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}
