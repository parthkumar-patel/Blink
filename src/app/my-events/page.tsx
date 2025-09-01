"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Calendar, Clock, MapPin, Star } from "lucide-react";
import { format } from "date-fns";
import { api } from "../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Download, Filter } from "lucide-react";
import Link from "next/link";

export default function MyEventsPage() {
  const { user } = useUser();
  
  // Get user profile
  const userProfile = useQuery(
    api.users.getCurrentUser,
    user ? {} : "skip"
  );

  // Get user RSVPs
  const userRSVPs = useQuery(
    api.rsvps.getUserRSVPs,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  // Get events for RSVPs
  const rsvpEvents = useQuery(
    api.rsvps.getEventsForUserRSVPs,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  // Get favorited events
  const favoriteEvents = useQuery(
    api.favorites.getFavoritedEvents,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Please sign in</h2>
            <p className="text-gray-600">You need to be signed in to view your events.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show loading state while profile is being fetched
  if (userProfile === undefined) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading your events...</h2>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If user profile doesn't exist, redirect to profile creation
  if (userProfile === null) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Setup Required</h2>
            <p className="text-gray-600 mb-4">Please complete your profile setup to view your events.</p>
            <Link href="/profile">
              <Button>Complete Profile Setup</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const goingEvents = rsvpEvents?.filter(event => {
    const rsvp = userRSVPs?.find(r => r.eventId === event._id);
    return rsvp?.status === 'going';
  }) || [];

  const interestedEvents = rsvpEvents?.filter(event => {
    const rsvp = userRSVPs?.find(r => r.eventId === event._id);
    return rsvp?.status === 'interested';
  }) || [];

  const EventList = ({ events, title }: { events: any[], title: string }) => {
    const getIcon = () => {
      switch (title) {
        case 'Favorites':
          return <Star className="w-5 h-5" />;
        default:
          return <Calendar className="w-5 h-5" />;
      }
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getIcon()}
            {title} ({events.length})
          </CardTitle>
        </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No events found</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Link key={event._id} href={`/events/${event._id}`}>
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 hover:text-blue-600">
                        {event.title}
                      </h3>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {event.categories.slice(0, 3).map((category: string) => (
                          <Badge key={category} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(event.startDate), 'MMM d, yyyy')}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(new Date(event.startDate), 'h:mm a')} - 
                            {format(new Date(event.endDate), 'h:mm a')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="line-clamp-1">
                            {event.location.isVirtual ? 'Virtual Event' : event.location.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {event.images && event.images.length > 0 && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={event.images[0]}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="My Events"
          description="Events you're attending or interested in"
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar View
              </Button>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <EventList events={goingEvents} title="Going" />
          <EventList events={interestedEvents} title="Interested" />
          <EventList events={favoriteEvents || []} title="Favorites" />
        </div>

        {goingEvents.length === 0 && interestedEvents.length === 0 && (favoriteEvents?.length || 0) === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600 mb-4">
              Start exploring events, RSVP, or add favorites to see them here.
            </p>
            <Link href="/dashboard">
              <Button>
                Discover Events
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}