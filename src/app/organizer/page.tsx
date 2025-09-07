"use client";

import { useUser } from "@clerk/nextjs";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  Star,
  DollarSign,
  Settings,
  Award,
  BarChart3,
  UserCheck,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { VerificationCard } from "@/components/organizer/verification-card";
import { EventAnalyticsCard } from "@/components/organizer/analytics-card";
import { QuickStatsGrid } from "@/components/organizer/quick-stats";
import { RecentEventsTable } from "@/components/organizer/recent-events";

export default function OrganizerDashboard() {
  const { user } = useUser();

  // Mock analytics data for now
  const analyticsData = {
    totalEvents: 8,
    approvedEvents: 6,
    totalRSVPs: 156,
    totalViews: 1240,
    viewsThisMonth: 485,
    rsvpsThisMonth: 67,
    attendanceRate: 78,
    topEvents: [
      { id: "1", title: "Tech Meetup: AI in Education", views: 234, rsvps: 45 },
      { id: "2", title: "Study Group: Computer Networks", views: 189, rsvps: 32 },
      { id: "3", title: "Career Fair Preparation Workshop", views: 156, rsvps: 28 },
    ],
    recentEvents: [
      { id: "1", title: "Tech Meetup: AI in Education", status: "approved" as const, rsvpCount: 45, startDate: Date.now() + 86400000 },
      { id: "2", title: "Study Group: Computer Networks", status: "pending" as const, rsvpCount: 32, startDate: Date.now() + 172800000 },
      { id: "3", title: "Career Fair Preparation Workshop", status: "approved" as const, rsvpCount: 28, startDate: Date.now() + 259200000 },
    ]
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to access the organizer dashboard</h1>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Organizer Dashboard"
          description="Manage your events and grow your audience"
        />

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/create-event" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Event
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/my-events/manage" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Manage Events
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/organizer/settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </Button>
        </div>

        {/* Verification Status */}
        <VerificationCard />        {/* Quick Stats */}
        <QuickStatsGrid />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Analytics Overview */}
          <div className="lg:col-span-2 space-y-6">
            <EventAnalyticsCard 
              analytics={analyticsData}
              isLoading={false}
            />
            
            <RecentEventsTable 
              events={analyticsData.recentEvents || []}
              isLoading={false}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Event Views</span>
                  <span className="font-semibold">
                    {analyticsData?.totalViews?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total RSVPs</span>
                  <span className="font-semibold">
                    {analyticsData?.totalRSVPs?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">
                      4.5
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organizer Level */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Organizer Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    Bronze
                  </Badge>
                  <p className="text-sm text-gray-600">
                    {analyticsData?.totalEvents || 0} events hosted
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(((analyticsData?.totalEvents || 0) % 10) * 10, 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {10 - ((analyticsData?.totalEvents || 0) % 10)} more events to next level
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tools */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/organizer/analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Detailed Analytics
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/organizer/attendees">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Manage Attendees
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/organizer/promote">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Promote Events
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
