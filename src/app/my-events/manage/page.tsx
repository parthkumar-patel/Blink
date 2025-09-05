"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ExternalLink,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

export default function ManageEventsPage() {
  const { user } = useUser();
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  // Get events created by this organizer
  const organizerEvents = useQuery(
    api.events.getEventsByOrganizer,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const deleteEvent = useMutation(api.events.deleteEvent);

  const handleDeleteEvent = async (eventId: string) => {
    if (!user?.id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This action cannot be undone and will remove all RSVPs and favorites."
    );

    if (!confirmed) return;

    setDeletingEventId(eventId);
    try {
      await deleteEvent({
        eventId: eventId as any,
        clerkId: user.id,
      });
      toast.success("Event deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete event:", error);
      toast.error(error.message || "Failed to delete event");
    } finally {
      setDeletingEventId(null);
    }
  };

  const getStatusBadge = (event: any) => {
    const now = Date.now();
    if (event.endDate < now) {
      return <Badge variant="secondary">Completed</Badge>;
    } else if (event.startDate <= now && event.endDate >= now) {
      return <Badge className="bg-green-500">Live</Badge>;
    } else {
      return <Badge className="bg-blue-500">Upcoming</Badge>;
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Please sign in to manage your events.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <PageHeader
            title="Manage Events"
            description="View and manage events you've created"
          />
          <Link href="/create-event">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New Event
            </Button>
          </Link>
        </div>

        {organizerEvents === undefined ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : organizerEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No events created yet
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Start by creating your first event to engage with the student
                community.
              </p>
              <Link href="/create-event">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Event
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {organizerEvents.map((event) => (
              <Card key={event._id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        {getStatusBadge(event)}
                      </div>
                      <p className="text-gray-600 line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/events/${event._id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteEvent(event._id)}
                        disabled={deletingEventId === event._id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingEventId === event._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <div>
                        <div className="font-medium">
                          {format(new Date(event.startDate), "MMM d, yyyy")}
                        </div>
                        <div>
                          {format(new Date(event.startDate), "h:mm a")} -{" "}
                          {format(new Date(event.endDate), "h:mm a")}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <div>
                        <div className="font-medium">
                          {event.location.isVirtual
                            ? "Virtual Event"
                            : event.location.name}
                        </div>
                        <div className="line-clamp-1">
                          {event.location.isVirtual
                            ? "Online"
                            : event.location.address}
                        </div>
                      </div>
                    </div>

                    {/* RSVPs */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <div>
                        <div className="font-medium">
                          {event.rsvpCount} RSVPs
                        </div>
                        <div>
                          {event.capacity
                            ? `of ${event.capacity} capacity`
                            : "No limit"}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <div>
                        <div className="font-medium">
                          {event.price.isFree
                            ? "Free"
                            : `$${event.price.amount}`}
                        </div>
                        <div>
                          {event.price.isFree
                            ? "No cost"
                            : event.price.currency}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {event.categories.map((category: string, index: number) => (
                      <Badge
                        key={`${event._id}-category-${index}`}
                        variant="outline"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <Link href={`/events/${event._id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Public Page
                        </Button>
                      </Link>
                      {event.externalLinks?.registration && (
                        <a
                          href={event.externalLinks.registration}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Registration Link
                          </Button>
                        </a>
                      )}
                    </div>

                    {/* Warnings */}
                    {event.startDate <= Date.now() && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">Event has started</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
