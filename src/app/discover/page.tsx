"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { EventFeed } from "@/components/events/event-feed";
import EventMap from "@/components/map/event-map";
import { Button } from "@/components/ui/button";
import { Filter, Grid, List, Map, Database } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";

export default function DiscoverPage() {
  const [viewMode, setViewMode] = useState<"list" | "map" | "grid">("list");
  
  // Get events for map view
  const events = useQuery(api.events.getEvents, { limit: 50 });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Discover Events"
          description="Explore all events happening around campus and Vancouver"
          actions={
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <Database className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
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
                  className="rounded-none"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Map
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-l-none"
                >
                  <Grid className="w-4 h-4 mr-2" />
                  Grid
                </Button>
              </div>
            </div>
          }
        />

        {/* Show message if no events */}
        {events && events.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No events found</h3>
              <p className="text-sm">There are no events available at the moment. Check back later!</p>
            </div>
            <Link href="/admin">
              <Button className="mt-4">
                <Database className="w-4 h-4 mr-2" />
                Add Sample Events
              </Button>
            </Link>
          </div>
        )}

        {/* Content based on view mode */}
        {events && events.length > 0 && (
          <>
            {viewMode === "map" ? (
              <div className="space-y-6">
                <EventMap 
                  events={events || []} 
                  height="600px"
                  onEventClick={(event) => {
                    console.log("Event clicked:", event);
                    // TODO: Open event details modal or navigate to event page
                  }}
                />
                <div className="text-sm text-gray-600 text-center">
                  Showing {events.filter(e => !e.location.isVirtual).length} events on map 
                  ({events.filter(e => e.location.isVirtual).length} virtual events hidden)
                </div>
              </div>
            ) : (
              <EventFeed 
                showPersonalized={false}
                showFilters={true}
                showRecommendationScores={false}
                limit={20}
                viewMode={viewMode as "list" | "grid"}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}