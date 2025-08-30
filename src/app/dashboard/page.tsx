"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { EventFeed } from "@/components/events/event-feed";
import { Button } from "@/components/ui/button";
import { Plus, Filter } from "lucide-react";

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Dashboard"
          description="Discover amazing events happening around campus and connect with fellow students."
          showBreadcrumb={false}
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>
          }
        />

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-8">
          <h2 className="text-xl font-bold mb-2">Welcome back!</h2>
          <p className="text-blue-100">
            Here are your personalized event recommendations based on your interests.
          </p>
        </div>

        {/* Main Event Feed */}
        <EventFeed 
          showPersonalized={true}
          showFilters={true}
          showRecommendationScores={true}
          limit={12}
        />
      </div>
    </AppLayout>
  );
}