"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { EventFeed } from "@/components/events/event-feed";
import { Button } from "@/components/ui/button";
import { Filter, Grid, List, Map, Plus } from "lucide-react";

export default function EventsPage() {
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
              <Button variant="outline" size="sm">
                <Map className="w-4 h-4 mr-2" />
                Map View
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>
          }
        />

        {/* All Events Feed */}
        <EventFeed 
          showPersonalized={false}
          showFilters={true}
          showRecommendationScores={false}
          limit={24}
        />
      </div>
    </AppLayout>
  );
}