"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { EventCard } from "./event-card";
import { EventFilters } from "../filters/event-filters";
import { Button } from "@/components/ui/button";

interface EventFeedProps {
  showPersonalized?: boolean;
  limit?: number;
  showFilters?: boolean;
  showRecommendationScores?: boolean;
}

export function EventFeed({ 
  showPersonalized = true, 
  limit = 20,
  showFilters = true,
  showRecommendationScores = false
}: EventFeedProps) {
  const { user } = useUser();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'virtual' | 'in-person'>('all');
  const [loadedEvents, setLoadedEvents] = useState<number>(limit);

  // Get user profile for personalized events
  const userProfile = useQuery(
    api.users.getCurrentUser,
    user ? {} : "skip"
  );

  // Get events based on personalization preference
  const events = useQuery(
    showPersonalized && userProfile?._id
      ? api.events.getPersonalizedEvents
      : api.events.getEvents,
    showPersonalized && userProfile?._id
      ? {
          userId: userProfile._id,
          limit: loadedEvents,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        }
      : {
          limit: loadedEvents,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        }
  );

  // Get user RSVPs
  const userRSVPs = useQuery(
    api.rsvps.getUserRSVPs,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  // RSVP mutation
  const createRSVP = useMutation(api.rsvps.createRSVP);
  const updateRSVP = useMutation(api.rsvps.updateRSVP);

  // Get all available categories for filtering
  const allCategories = useMemo(() => {
    if (!events) return [];
    const categorySet = new Set<string>();
    events.forEach(event => {
      event.categories.forEach(category => categorySet.add(category));
    });
    return Array.from(categorySet).sort();
  }, [events]);

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    return events.filter(event => {
      // Date filter
      if (dateRange.start || dateRange.end) {
        const eventDate = new Date(event.startDate);
        if (dateRange.start && eventDate < dateRange.start) return false;
        if (dateRange.end && eventDate > dateRange.end) return false;
      }

      // Price filter
      if (priceFilter === 'free' && !event.price.isFree) return false;
      if (priceFilter === 'paid' && event.price.isFree) return false;

      // Location filter
      if (locationFilter === 'virtual' && !event.location.isVirtual) return false;
      if (locationFilter === 'in-person' && event.location.isVirtual) return false;

      return true;
    });
  }, [events, dateRange, priceFilter, locationFilter]);

  // Create RSVP status map
  const rsvpStatusMap = useMemo(() => {
    if (!userRSVPs) return {};
    const map: Record<string, 'going' | 'interested'> = {};
    userRSVPs.forEach(rsvp => {
      map[rsvp.eventId] = rsvp.status;
    });
    return map;
  }, [userRSVPs]);

  const handleRSVP = async (eventId: string, status: 'going' | 'interested') => {
    if (!userProfile?._id) return;

    try {
      const existingRSVP = userRSVPs?.find(rsvp => rsvp.eventId === eventId);
      
      if (existingRSVP) {
        if (existingRSVP.status === status) {
          // If clicking the same status, remove RSVP (toggle off)
          await updateRSVP({
            rsvpId: existingRSVP._id,
            status: 'not_going'
          });
        } else {
          // Update to new status
          await updateRSVP({
            rsvpId: existingRSVP._id,
            status
          });
        }
      } else {
        // Create new RSVP
        await createRSVP({
          eventId,
          status
        });
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
    }
  };

  const loadMoreEvents = () => {
    setLoadedEvents(prev => prev + limit);
  };

  const refreshEvents = () => {
    setLoadedEvents(limit);
    // The query will automatically refetch
  };

  if (!events) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading events...</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
        <p className="text-gray-600 mb-4">
          {selectedCategories.length > 0 || dateRange.start || priceFilter !== 'all' || locationFilter !== 'all'
            ? "Try adjusting your filters to see more events."
            : "There are no events available at the moment. Check back later!"}
        </p>
        {(selectedCategories.length > 0 || dateRange.start || priceFilter !== 'all' || locationFilter !== 'all') && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCategories([]);
              setDateRange({});
              setPriceFilter('all');
              setLocationFilter('all');
            }}
          >
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {showPersonalized ? 'Recommended for You' : 'All Events'}
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={refreshEvents}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <EventFilters
          categories={allCategories}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          priceFilter={priceFilter}
          onPriceFilterChange={setPriceFilter}
          locationFilter={locationFilter}
          onLocationFilterChange={setLocationFilter}
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen(!filtersOpen)}
        />
      )}

      {/* Event Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => (
          <EventCard
            key={event._id}
            event={event}
            onRSVP={handleRSVP}
            userRSVPStatus={rsvpStatusMap[event._id] || null}
            showRecommendationScore={showRecommendationScores}
          />
        ))}
      </div>

      {/* Load More */}
      {filteredEvents.length >= loadedEvents && (
        <div className="text-center pt-6">
          <Button
            variant="outline"
            onClick={loadMoreEvents}
            className="px-8"
          >
            Load More Events
          </Button>
        </div>
      )}

      {/* Personalization Notice */}
      {showPersonalized && !userProfile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Get Personalized Recommendations</h4>
              <p className="text-blue-700 text-sm mt-1">
                Complete your profile to see events tailored to your interests and preferences.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => window.location.href = '/profile'}
              >
                Complete Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}