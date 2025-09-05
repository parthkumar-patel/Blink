"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import {
  getMapboxLocation,
  getCurrentLocation,
  filterEventsByDistance,
} from "@/lib/utils/location";
import { api } from "../../../convex/_generated/api";
import { EventCard } from "./event-card";
import { EventFilters } from "../filters/event-filters";
import { Button } from "@/components/ui/button";

interface EventFeedProps {
  showPersonalized?: boolean;
  limit?: number;
  showFilters?: boolean;
  showRecommendationScores?: boolean;
  viewMode?: "list" | "grid";
}

export function EventFeed({
  showPersonalized = true,
  limit = 20,
  showFilters = true,
  showRecommendationScores = false,
  viewMode = "grid",
}: EventFeedProps) {
  const { user } = useUser();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">(
    "all"
  );
  const [locationFilter, setLocationFilter] = useState<
    "all" | "virtual" | "in-person"
  >("all");
  const [distanceFilter, setDistanceFilter] = useState<number>(1); // Default 1km for campus
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loadedEvents, setLoadedEvents] = useState<number>(limit);

  // Get user profile for personalized events
  const userProfile = useQuery(api.users.getCurrentUser, user ? {} : "skip");

  // Get events based on personalization preference
  const events = useQuery(
    showPersonalized && userProfile?.clerkId
      ? api.ai.getEnhancedRecommendations
      : api.events.getEvents,
    showPersonalized && userProfile?.clerkId
      ? {
          clerkId: userProfile.clerkId,
          limit: loadedEvents,
        }
      : {
          limit: loadedEvents,
          categories:
            selectedCategories.length > 0 ? selectedCategories : undefined,
        }
  );

  // Get user RSVPs
  const userRSVPs = useQuery(
    api.rsvps.getUserRSVPs,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  // Get favorite statuses for all events
  const favoriteStatuses = useQuery(
    api.favorites.getFavoriteStatuses,
    userProfile?._id && events && events.length > 0
      ? {
          userId: userProfile._id,
          eventIds: events.map((e) => e._id),
        }
      : "skip"
  );

  // RSVP mutation
  const createRSVP = useMutation(api.rsvps.createRSVP);
  const updateRSVP = useMutation(api.rsvps.updateRSVP);

  // Favorites mutation
  const toggleFavorite = useMutation(api.favorites.toggleFavorite);

  // Location mutation
  const updateUserLocation = useMutation(api.users.updateUserLocation);

  // Location detection function
  const handleLocationDetect = async () => {
    try {
      // Try Mapbox location first for higher accuracy
      let location;
      try {
        location = await getMapboxLocation();
        console.log("Using Mapbox high-precision location");
      } catch (mapboxError) {
        console.log(
          "Mapbox location failed, falling back to browser geolocation"
        );
        location = await getCurrentLocation();
      }

      setUserLocation(location);

      // Update user profile with location if they have one
      if (userProfile?.clerkId) {
        try {
          // Create a more descriptive address with accuracy info
          const accuracyText = location.accuracy
            ? ` (±${Math.round(location.accuracy)}m accuracy)`
            : "";
          const address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}${accuracyText}`;

          await updateUserLocation({
            clerkId: userProfile.clerkId,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              address: address,
            },
          });

          console.log("High-precision location saved to profile", {
            accuracy: location.accuracy,
            coordinates: [location.latitude, location.longitude],
          });
        } catch (error) {
          console.error("Error saving location to profile:", error);
        }
      }
    } catch (error) {
      console.error("Error getting location:", error);

      // More specific error messages
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to get your location. Please check your browser permissions and ensure you're using HTTPS.";

      alert(errorMessage);
    }
  };

  // Load user location from profile if available
  useEffect(() => {
    if (userProfile?.location && !userLocation) {
      setUserLocation({
        latitude: userProfile.location.latitude,
        longitude: userProfile.location.longitude,
      });
    }
  }, [userProfile, userLocation]);

  // Get all available categories for filtering
  const allCategories = useMemo(() => {
    if (!events) return [];
    const categorySet = new Set<string>();
    events.forEach((event) => {
      event.categories.forEach((category) => categorySet.add(category));
    });
    return Array.from(categorySet).sort();
  }, [events]);

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    let filtered = events.filter((event) => {
      // Date filter
      if (dateRange.start || dateRange.end) {
        const eventDate = new Date(event.startDate);
        if (dateRange.start && eventDate < dateRange.start) return false;
        if (dateRange.end && eventDate > dateRange.end) return false;
      }

      // Price filter
      if (priceFilter === "free" && !event.price.isFree) return false;
      if (priceFilter === "paid" && event.price.isFree) return false;

      // Location filter
      if (locationFilter === "virtual" && !event.location.isVirtual)
        return false;
      if (locationFilter === "in-person" && event.location.isVirtual)
        return false;

      return true;
    });

    // Apply distance filter if user location is available
    if (userLocation && distanceFilter) {
      filtered = filterEventsByDistance(filtered, userLocation, distanceFilter);
    }

    return filtered;
  }, [
    events,
    dateRange,
    priceFilter,
    locationFilter,
    userLocation,
    distanceFilter,
  ]);

  // Create RSVP status map
  const rsvpStatusMap = useMemo(() => {
    if (!userRSVPs) return {};
    const map: Record<string, "going" | "interested"> = {};
    userRSVPs.forEach((rsvp) => {
      if (rsvp.status === "going" || rsvp.status === "interested") {
        map[rsvp.eventId] = rsvp.status;
      }
    });
    return map;
  }, [userRSVPs]);

  const handleRSVP = async (
    eventId: string,
    status: "going" | "interested"
  ) => {
    if (!userProfile?._id) return;

    try {
      const existingRSVP = userRSVPs?.find((rsvp) => rsvp.eventId === eventId);

      if (existingRSVP) {
        if (existingRSVP.status === status) {
          // If clicking the same status, remove RSVP (toggle off)
          await updateRSVP({
            rsvpId: existingRSVP._id,
            status: "not_going",
          });
        } else {
          // Update to new status
          await updateRSVP({
            rsvpId: existingRSVP._id,
            status,
          });
        }
      } else {
        // Create new RSVP
        await createRSVP({
          eventId: eventId as any,
          status,
        });
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
    }
  };

  const handleToggleFavorite = async (eventId: string) => {
    if (!userProfile?._id) return;

    try {
      await toggleFavorite({
        userId: userProfile._id,
        eventId: eventId as any,
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const loadMoreEvents = () => {
    setLoadedEvents((prev) => prev + limit);
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No events found
        </h3>
        <p className="text-gray-600 mb-4">
          {selectedCategories.length > 0 ||
          dateRange.start ||
          priceFilter !== "all" ||
          locationFilter !== "all" ||
          (userLocation && distanceFilter !== 25)
            ? "Try adjusting your filters to see more events."
            : "There are no events available at the moment. Check back later!"}
        </p>
        {(selectedCategories.length > 0 ||
          dateRange.start ||
          priceFilter !== "all" ||
          locationFilter !== "all" ||
          (userLocation && distanceFilter !== 25)) && (
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCategories([]);
              setDateRange({});
              setPriceFilter("all");
              setLocationFilter("all");
              setDistanceFilter(25);
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
            {showPersonalized ? "Recommended for You" : "All Events"}
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredEvents.length} event
            {filteredEvents.length !== 1 ? "s" : ""} found
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
          distanceFilter={distanceFilter}
          onDistanceFilterChange={setDistanceFilter}
          userLocation={userLocation || undefined}
          onLocationDetect={handleLocationDetect}
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen(!filtersOpen)}
        />
      )}

      {/* Event Grid/List */}
      <div
        className={
          viewMode === "list"
            ? "space-y-4"
            : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        }
      >
        {filteredEvents.map((event) => (
          <EventCard
            key={event._id}
            event={event}
            onRSVP={handleRSVP}
            userRSVPStatus={rsvpStatusMap[event._id] || null}
            onToggleFavorite={handleToggleFavorite}
            isFavorited={favoriteStatuses?.[event._id] || false}
            showRecommendationScore={showRecommendationScores}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Load More */}
      {filteredEvents.length >= loadedEvents && (
        <div className="text-center pt-6">
          <Button variant="outline" onClick={loadMoreEvents} className="px-8">
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
              <h4 className="font-medium text-blue-900">
                Get Personalized Recommendations
              </h4>
              <p className="text-blue-700 text-sm mt-1">
                Complete your profile to see events tailored to your interests
                and preferences.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => (window.location.href = "/profile")}
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
