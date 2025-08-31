"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { EventFeed } from "@/components/events/event-feed";
import EventMap from "@/components/map/event-map";
import { Button } from "@/components/ui/button";
import { Filter, Grid, List, Map, Plus } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function EventsPage() {
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
  // Get events for map view
  const events = useQuery(api.events.getEvents, { limit: 50 });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="All Events"
          description="Browse all upcoming events in Vancouver and UBC"
          showBreadcrumb={false}
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none"
                >
                  <List className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                  className="rounded-l-none"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Map
                </Button>
              </div>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>
          }
        />

        {/* Content based on view mode */}
        {viewMode === "list" ? (
          <EventFeed 
            showPersonalized={false}
            showFilters={true}
            showRecommendationScores={false}
            limit={24}
          />
        ) : (
          <div className="space-y-6">
            <EventMap 
              events={events || []} 
              height="600px"
              onEventClick={(event) => {
                console.log("Event clicked:", event);
                // TODO: Open event details modal or navigate to event page
              }}
            />
            {events && events.length > 0 && (
              <div className="text-sm text-gray-600 text-center">
                Showing {events.filter(e => !e.location.isVirtual).length} events on map 
                ({events.filter(e => e.location.isVirtual).length} virtual events hidden)
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}