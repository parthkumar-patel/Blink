"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, Eye, TrendingUp } from "lucide-react";

export function QuickStatsGrid() {
  // Mock data for now - will be replaced with real API calls
  const stats = [
    {
      title: "Total Events",
      value: 8,
      icon: <Calendar className="w-5 h-5 text-blue-500" />,
      trend: "6 approved",
      trendUp: true
    },
    {
      title: "Total Views",
      value: 1240,
      icon: <Eye className="w-5 h-5 text-green-500" />,
      trend: "Event page views",
      trendUp: true
    },
    {
      title: "Total RSVPs",
      value: 156,
      icon: <Users className="w-5 h-5 text-purple-500" />,
      trend: "Across all events",
      trendUp: true
    },
    {
      title: "Attendance Rate",
      value: "78%",
      icon: <TrendingUp className="w-5 h-5 text-orange-500" />,
      trend: "Good",
      trendUp: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className={`text-sm ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trend}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-full">
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
