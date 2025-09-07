"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Heart, Calendar, MapPin, Users, ExternalLink } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function FavoritesPage() {
  const { user } = useUser();
  
  // Get current user profile first
  const userProfile = useQuery(
    api.users.getCurrentUser,
    user ? {} : "skip"
  );
  
  // Get user's favorite events
  const favorites = useQuery(
    api.favorites.getFavoritedEvents,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
              Favorite Events
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Keep track of events you&apos;re interested in and never miss out on the good stuff
          </p>
        </div>

        {/* Favorites List */}
        {favorites && favorites.length > 0 ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {favorites.filter(Boolean).map((event) => {
              if (!event) return null;
              
              return (
                <Card key={event._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2 line-clamp-2">
                          {event.title}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(event.startDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location?.address || 'Location TBD'}
                          </div>
                        </div>
                      </div>
                      <Badge variant={event.categories?.includes("Academic") ? "default" : "secondary"}>
                        {event.categories?.[0] || 'Event'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {event.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>
                          {event.rsvpCount || 0} attending
                        </span>
                      </div>
                      
                      <Link href={`/events/${event._id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          View Event
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        Added to favorites on {new Date(event._creationTime).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              No favorites yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start exploring events and click the heart icon to save them to your favorites
            </p>
            <Link href="/events">
              <Button className="bg-pink-600 hover:bg-pink-700 text-white gap-2">
                <Calendar className="w-4 h-4" />
                Browse Events
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
