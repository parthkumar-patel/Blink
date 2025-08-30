"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { EventFeed } from "@/components/events/event-feed";
import { Button } from "@/components/ui/button";
import { Filter, Grid, List, Map } from "lucide-react";

export default function DiscoverPage() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Discover Events"
          description="Explore all events happening around campus and Vancouver"
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Map className="w-4 h-4 mr-2" />
                Map View
              </Button>
              <Button variant="outline" size="sm">
                <List className="w-4 h-4 mr-2" />
                List View
              </Button>
              <Button variant="outline" size="sm">
                <Grid className="w-4 h-4 mr-2" />
                Grid View
              </Button>
            </div>
          }
        />

        {/* All Events Feed */}
        <EventFeed 
          showPersonalized={false}
          showFilters={true}
          showRecommendationScores={false}
          limit={20}
        />
      </div>
    </AppLayout>
  );
}