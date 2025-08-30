"use client";

import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ExternalLink, 
  ArrowLeft,
  Share2,
  Bookmark
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function EventDetailPage() {
  const params = useParams();
  const { user } = useUser();
  const eventId = params.id as string;

  // Get event details
  const event = useQuery(api.events.getEventById, { eventId });
  
  // Get user profile
  const userProfile = useQuery(
    api.users.getCurrentUser,
    user ? {} : "skip"
  );

  // Get user RSVP status
  const userRSVPs = useQuery(
    api.rsvps.getUserRSVPs,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  // RSVP mutations
  const createRSVP = useMutation(api.rsvps.createRSVP);
  const updateRSVP = useMutation(api.rsvps.updateRSVP);

  if (!event) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h2>
              <p className="text-gray-600 mb-4">The event you're looking for doesn't exist.</p>
              <Link href="/dashboard">
                <Button>Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  
  const userRSVP = userRSVPs?.find(rsvp => rsvp.eventId === eventId);
  const userRSVPStatus = userRSVP?.status;

  const handleRSVP = async (status: 'going' | 'interested') => {
    if (!userProfile?._id) return;

    try {
      if (userRSVP) {
        if (userRSVP.status === status) {
          // Toggle off
          await updateRSVP({
            rsvpId: userRSVP._id,
            status: 'cancelled'
          });
        } else {
          // Update status
          await updateRSVP({
            rsvpId: userRSVP._id,
            status
          });
        }
      } else {
        // Create new RSVP
        await createRSVP({
          eventId,
          status
        });
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={event.title}
          breadcrumbItems={[
            { label: 'Events', href: '/dashboard' },
            { label: event.title }
          ]}
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Bookmark className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          }
        />

        <div className="max-w-4xl space-y-6">

        {/* Event header */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {event.imageUrl && (
            <div className="h-64 overflow-hidden">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {event.categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Bookmark className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* RSVP buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                variant={userRSVPStatus === 'going' ? 'default' : 'outline'}
                onClick={() => handleRSVP('going')}
                className="flex-1 sm:flex-none"
              >
                {userRSVPStatus === 'going' ? 'Going' : 'I\'m Going'}
              </Button>
              <Button
                variant={userRSVPStatus === 'interested' ? 'default' : 'outline'}
                onClick={() => handleRSVP('interested')}
                className="flex-1 sm:flex-none"
              >
                {userRSVPStatus === 'interested' ? 'Interested' : 'Interested'}
              </Button>
            </div>

            {/* Event details grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {format(startDate, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {event.location.isVirtual ? 'Virtual Event' : event.location.name}
                    </div>
                    {!event.location.isVirtual && (
                      <div className="text-sm text-gray-500">
                        {event.location.address}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {event.rsvpCount} people going
                    </div>
                    {event.maxCapacity && (
                      <div className="text-sm text-gray-500">
                        {event.maxCapacity - event.rsvpCount} spots remaining
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <span className="text-lg">💰</span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {event.price.isFree ? 'Free' : `$${event.price.amount} ${event.price.currency}`}
                    </div>
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Organizer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {event.organizer.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {event.organizer.name}
                        {event.organizer.verified && (
                          <span className="text-blue-600">✓</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {event.organizer.type || 'Event Organizer'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Event description */}
        <Card>
          <CardHeader>
            <CardTitle>About this event</CardTitle>
          </CardHeader>
          <CardContent>
            {event.aiSummary && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">AI Summary</h4>
                <p className="text-blue-800">{event.aiSummary}</p>
              </div>
            )}
            
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            {event.sourceUrl && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  View original event page
                </a>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </AppLayout>
  );
}