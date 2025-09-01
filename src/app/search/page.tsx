"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Search, Filter, MapPin, Calendar, Clock, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { EventCard } from "@/components/events/event-card";
import { EventFilters } from "@/components/filters/event-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function SearchPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [locationFilter, setLocationFilter] = useState<'all' | 'virtual' | 'in-person'>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL when search query changes
  useEffect(() => {
    if (debouncedQuery) {
      router.replace(`/search?q=${encodeURIComponent(debouncedQuery)}`, { scroll: false });
    } else {
      router.replace('/search', { scroll: false });
    }
  }, [debouncedQuery, router]);

  // Get user profile
  const userProfile = useQuery(
    api.users.getCurrentUser,
    user ? {} : "skip"
  );

  // Search events
  const searchResults = useQuery(
    api.events.searchEvents,
    debouncedQuery.trim() 
      ? { query: debouncedQuery.trim(), limit: 50 }
      : "skip"
  );

  // Get all events if no search query
  const allEvents = useQuery(
    api.events.getAllEvents,
    !debouncedQuery.trim() ? { limit: 50 } : "skip"
  );

  // Get user RSVPs and favorites
  const userRSVPs = useQuery(
    api.rsvps.getUserRSVPs,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  const events = debouncedQuery.trim() ? searchResults : allEvents;

  const favoriteStatuses = useQuery(
    api.favorites.getFavoriteStatuses,
    userProfile?._id && events && events.length > 0 
      ? { 
          userId: userProfile._id, 
          eventIds: events.map(e => e._id) 
        } 
      : "skip"
  );

  // RSVP and favorites mutations
  const createRSVP = useMutation(api.rsvps.createRSVP);
  const updateRSVP = useMutation(api.rsvps.updateRSVP);
  const toggleFavorite = useMutation(api.favorites.toggleFavorite);

  // Get available categories for filtering
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
      // Category filter
      if (selectedCategories.length > 0) {
        if (!event.categories.some(category => selectedCategories.includes(category))) {
          return false;
        }
      }

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
  }, [events, selectedCategories, dateRange, priceFilter, locationFilter]);

  // Create RSVP status map
  const rsvpStatusMap = useMemo(() => {
    if (!userRSVPs) return {};
    const map: Record<string, 'going' | 'interested'> = {};
    userRSVPs.forEach(rsvp => {
      if (rsvp.status === 'going' || rsvp.status === 'interested') {
        map[rsvp.eventId] = rsvp.status;
      }
    });
    return map;
  }, [userRSVPs]);

  const handleRSVP = async (eventId: string, status: 'going' | 'interested') => {
    if (!userProfile?._id) return;

    try {
      const existingRSVP = userRSVPs?.find(rsvp => rsvp.eventId === eventId);
      
      if (existingRSVP) {
        if (existingRSVP.status === status) {
          await updateRSVP({
            rsvpId: existingRSVP._id,
            status: 'not_going'
          });
        } else {
          await updateRSVP({
            rsvpId: existingRSVP._id,
            status
          });
        }
      } else {
        await createRSVP({
          eventId: eventId as any,
          status
        });
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
    }
  };

  const handleToggleFavorite = async (eventId: string) => {
    if (!userProfile?._id) return;

    try {
      await toggleFavorite({
        userId: userProfile._id,
        eventId: eventId as any
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setDateRange({});
    setPriceFilter('all');
    setLocationFilter('all');
  };

  const hasActiveFilters = 
    selectedCategories.length > 0 ||
    dateRange.start ||
    dateRange.end ||
    priceFilter !== 'all' ||
    locationFilter !== 'all';

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Search Events"
          description="Find events that match your interests"
          showBreadcrumb={false}
        />

        {/* Search Input */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events by title, description, organizer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
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

        {/* Search Results */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {debouncedQuery ? 'Search Results' : 'All Events'}
              </h2>
              <p className="text-gray-600">
                {debouncedQuery && `Results for "${debouncedQuery}" • `}
                {filteredEvents?.length || 0} event{filteredEvents?.length !== 1 ? 's' : ''} found
              </p>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Quick filters for popular searches */}
          {!debouncedQuery && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-3">Popular searches:</p>
              <div className="flex flex-wrap gap-2">
                {['hackathon', 'workshop', 'career fair', 'networking', 'study group', 'tech talk'].map(term => (
                  <Button
                    key={term}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(term)}
                    className="text-sm"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {events === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Searching...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {debouncedQuery ? 'No events found' : 'No events available'}
            </h3>
            <p className="text-gray-600 mb-4">
              {debouncedQuery 
                ? `We couldn't find any events matching "${debouncedQuery}". Try different keywords or check your filters.`
                : 'There are no events available at the moment. Check back later!'
              }
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearAllFilters}
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                onRSVP={handleRSVP}
                userRSVPStatus={rsvpStatusMap[event._id] || null}
                onToggleFavorite={handleToggleFavorite}
                isFavorited={favoriteStatuses?.[event._id] || false}
                viewMode="grid"
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
