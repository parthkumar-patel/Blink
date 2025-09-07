"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Calendar } from "lucide-react";

interface EventAnalyticsCardProps {
  analytics?: {
    viewsThisMonth?: number;
    rsvpsThisMonth?: number;
    totalViews?: number;
    totalRSVPs?: number;
    topEvents?: Array<{ id: string; title: string; views: number; rsvps: number }>;
  };
  isLoading: boolean;
}

export function EventAnalyticsCard({ analytics, isLoading }: EventAnalyticsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mock data for now
  const mockAnalytics = {
    viewsThisMonth: 485,
    rsvpsThisMonth: 67,
    totalViews: 1240,
    totalRSVPs: 156,
    topEvents: [
      { id: "1", title: "Tech Meetup: AI in Education", views: 234, rsvps: 45 },
      { id: "2", title: "Study Group: Computer Networks", views: 189, rsvps: 32 },
      { id: "3", title: "Career Fair Preparation Workshop", views: 156, rsvps: 28 },
    ]
  };

  const displayAnalytics = analytics || mockAnalytics;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analytics Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">This Month</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{displayAnalytics.viewsThisMonth?.toLocaleString() || "0"}</p>
              <p className="text-xs text-gray-500">Views</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">RSVPs</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{displayAnalytics.rsvpsThisMonth?.toLocaleString() || "0"}</p>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600">Growth</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">+12%</p>
              <p className="text-xs text-gray-500">vs Last Month</p>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">Conversion</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {displayAnalytics.totalViews && displayAnalytics.totalRSVPs 
                  ? `${Math.round((displayAnalytics.totalRSVPs / displayAnalytics.totalViews) * 100)}%`
                  : "12%"
                }
              </p>
              <p className="text-xs text-gray-500">View to RSVP</p>
            </div>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="text-center text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Detailed charts coming soon</p>
            <p className="text-xs">View engagement and RSVP trends over time</p>
          </div>
        </div>

        {/* Top Performing Events */}
        {displayAnalytics.topEvents && displayAnalytics.topEvents.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Top Performing Events</h3>
            <div className="space-y-2">
              {displayAnalytics.topEvents.slice(0, 3).map((event: { id: string; title: string; views: number; rsvps: number }, index: number) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium truncate">{event.title}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{event.views} views</p>
                    <p className="text-xs text-gray-500">{event.rsvps} RSVPs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
