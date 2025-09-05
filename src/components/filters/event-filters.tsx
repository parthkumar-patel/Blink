"use client";

import { useState } from "react";
import { Calendar, Filter, MapPin, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EventFiltersProps {
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  dateRange: { start?: Date; end?: Date };
  onDateRangeChange: (range: { start?: Date; end?: Date }) => void;
  priceFilter: "all" | "free" | "paid";
  onPriceFilterChange: (filter: "all" | "free" | "paid") => void;
  locationFilter: "all" | "virtual" | "in-person";
  onLocationFilterChange: (filter: "all" | "virtual" | "in-person") => void;
  distanceFilter?: number;
  onDistanceFilterChange?: (distance: number) => void;
  userLocation?: { latitude: number; longitude: number };
  onLocationDetect?: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function EventFilters({
  categories,
  selectedCategories,
  onCategoryChange,
  dateRange,
  onDateRangeChange,
  priceFilter,
  onPriceFilterChange,
  locationFilter,
  onLocationFilterChange,
  distanceFilter,
  onDistanceFilterChange,
  userLocation,
  onLocationDetect,
  isOpen,
  onToggle,
}: EventFiltersProps) {
  const [tempDateRange, setTempDateRange] = useState(dateRange);

  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    onCategoryChange(newCategories);
  };

  const clearAllFilters = () => {
    onCategoryChange([]);
    onDateRangeChange({});
    onPriceFilterChange("all");
    onLocationFilterChange("all");
    if (onDistanceFilterChange) {
      onDistanceFilterChange(1); // Reset to default distance (1km for campus)
    }
    setTempDateRange({});
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    dateRange.start ||
    dateRange.end ||
    priceFilter !== "all" ||
    locationFilter !== "all" ||
    (distanceFilter && distanceFilter !== 1);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  if (!isOpen) {
    return (
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant="outline"
          onClick={onToggle}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {selectedCategories.length +
                (dateRange.start ? 1 : 0) +
                (priceFilter !== "all" ? 1 : 0) +
                (locationFilter !== "all" ? 1 : 0) +
                (distanceFilter && distanceFilter !== 1 ? 1 : 0)}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCategories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                {category}
                <button
                  onClick={() => handleCategoryToggle(category)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}

            {dateRange.start && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(dateRange.start)}
                {dateRange.end && ` - ${formatDate(dateRange.end)}`}
                <button
                  onClick={() => onDateRangeChange({})}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {priceFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {priceFilter === "free" ? "Free events" : "Paid events"}
                <button
                  onClick={() => onPriceFilterChange("all")}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {locationFilter !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {locationFilter === "virtual" ? "Virtual" : "In-person"}
                <button
                  onClick={() => onLocationFilterChange("all")}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {distanceFilter && distanceFilter !== 1 && userLocation && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Within {distanceFilter} km
                <button
                  onClick={() =>
                    onDistanceFilterChange && onDistanceFilterChange(1)
                  }
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear all
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Categories */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Categories
          </h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedCategories.includes(category)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Date Range
          </h4>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={
                tempDateRange.start
                  ? tempDateRange.start.toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => {
                const date = e.target.value
                  ? new Date(e.target.value)
                  : undefined;
                const newRange = { ...tempDateRange, start: date };
                setTempDateRange(newRange);
                onDateRangeChange(newRange);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={
                tempDateRange.end
                  ? tempDateRange.end.toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) => {
                const date = e.target.value
                  ? new Date(e.target.value)
                  : undefined;
                const newRange = { ...tempDateRange, end: date };
                setTempDateRange(newRange);
                onDateRangeChange(newRange);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        {/* Price Filter */}
        <div>
          <h4 className="font-medium mb-3">Price</h4>
          <div className="flex gap-2">
            {[
              { value: "all", label: "All Events" },
              { value: "free", label: "Free Only" },
              { value: "paid", label: "Paid Only" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => onPriceFilterChange(option.value as any)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  priceFilter === option.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location Filter */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </h4>
          <div className="flex gap-2">
            {[
              { value: "all", label: "All Events" },
              { value: "virtual", label: "Virtual Only" },
              { value: "in-person", label: "In-Person Only" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => onLocationFilterChange(option.value as any)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  locationFilter === option.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Distance Filter */}
        {onDistanceFilterChange && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Distance from me
            </h4>
            <div className="space-y-3">
              {!userLocation && onLocationDetect && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="font-medium text-blue-900 mb-1">
                        Enable Precise Location
                      </h5>
                      <p className="text-sm text-blue-800 mb-3">
                        Get high-accuracy location using Mapbox GPS to find
                        events near you with precise distance filtering
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onLocationDetect}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Enable Location Services
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                        <span>High accuracy GPS</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                        <span>Secure & private</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {userLocation && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Within{" "}
                      {distanceFilter && distanceFilter < 1
                        ? `${Math.round(distanceFilter * 1000)}m`
                        : `${distanceFilter || 1}km`}
                    </span>
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Location enabled
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={distanceFilter || 1}
                    onChange={(e) =>
                      onDistanceFilterChange(parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>100m</span>
                    <span>1.5km</span>
                    <span>3km</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
