"use client";

import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { format, formatDistanceToNow, addDays, isPast, isToday, isTomorrow } from "date-fns";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ExternalLink, 
  ArrowLeft,
  Share2,
  Bookmark,
  Download,
  Bell,
  Star,
  Flag,
  Copy,
  MessageSquare,
  Heart,
  Eye,
  Navigation,
  Globe,
  Tag
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { GroupRSVPManager } from "@/components/groups/group-rsvp-manager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function EventDetailPage() {
  const params = useParams();
  const { user } = useUser();
  const eventId = params.id as string;

  // Get event details
  const event = useQuery(api.events.getEventById, { eventId: eventId as any });
  
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

  // Get favorite status
  const favoriteStatuses = useQuery(
    api.favorites.getFavoriteStatuses,
    userProfile?._id && event
      ? {
          userId: userProfile._id,
          eventIds: [event._id],
        }
      : "skip"
  );

  // RSVP mutations
  const createRSVP = useMutation(api.rsvps.createRSVP);
  const updateRSVP = useMutation(api.rsvps.updateRSVP);
  
  // Favorites mutation
  const toggleFavorite = useMutation(api.favorites.toggleFavorite);

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
  const isFavorited = favoriteStatuses?.[event._id] || false;
  
  // Calculate event timing
  const isEventPast = isPast(endDate);
  const isEventToday = isToday(startDate);
  const isEventTomorrow = isTomorrow(startDate);
  const timeUntilEvent = formatDistanceToNow(startDate, { addSuffix: true });

  const handleRSVP = async (status: 'going' | 'interested') => {
    if (!userProfile?._id) return;

    try {
      if (userRSVP) {
        if (userRSVP.status === status) {
          // Toggle off
          await updateRSVP({
            rsvpId: userRSVP._id,
            status: 'not_going'
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
          eventId: eventId as any,
          status
        });
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!userProfile?._id || !event) return;

    try {
      await toggleFavorite({
        userId: userProfile._id,
        eventId: event._id,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleShare = (platform: string) => {
    if (!event) return;

    const eventUrl = `${window.location.origin}/events/${event._id}`;
    const text = `Check out this event: ${event.title}`;
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(eventUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${eventUrl}`)}`,
      email: `mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(`${text}\n\n${eventUrl}`)}`
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(eventUrl);
      alert('Event link copied to clipboard!');
      return;
    }

    const url = shareUrls[platform as keyof typeof shareUrls];
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const addToCalendar = (format: string) => {
    if (!event) return;

    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const details = {
      title: event.title,
      description: event.description,
      location: event.location.isVirtual ? 'Virtual Event' : event.location.address,
      start: formatDate(startDate),
      end: formatDate(endDate),
    };

    if (format === 'google') {
      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(details.title)}&dates=${details.start}/${details.end}&details=${encodeURIComponent(details.description)}&location=${encodeURIComponent(details.location)}`;
      window.open(googleUrl, '_blank');
    } else if (format === 'outlook') {
      const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(details.title)}&startdt=${details.start}&enddt=${details.end}&body=${encodeURIComponent(details.description)}&location=${encodeURIComponent(details.location)}`;
      window.open(outlookUrl, '_blank');
    } else if (format === 'ics') {
      // Generate ICS file
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Student Events Finder//EN',
        'BEGIN:VEVENT',
        `UID:${event._id}@studentevents.ca`,
        `DTSTART:${details.start}`,
        `DTEND:${details.end}`,
        `SUMMARY:${details.title}`,
        `DESCRIPTION:${details.description.replace(/\n/g, '\\n')}`,
        `LOCATION:${details.location}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${event.title.replace(/[^\w\s]/g, '')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  const setReminder = () => {
    if (!event) return;
    
    // Check if browser supports notifications
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          const eventDate = new Date(event.startDate);
          const reminderTime = eventDate.getTime() - Date.now() - (24 * 60 * 60 * 1000); // 24 hours before
          
          if (reminderTime > 0) {
            setTimeout(() => {
              new Notification(`Reminder: ${event.title}`, {
                body: `Your event starts in 24 hours at ${format(eventDate, 'h:mm a')}`,
                icon: '/favicon.ico',
              });
            }, reminderTime);
            
            alert('Reminder set! You\'ll be notified 24 hours before the event.');
          } else {
            alert('This event is too soon to set a reminder.');
          }
        }
      });
    } else {
      alert('Notifications are not supported in your browser.');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={event.title}
          description={
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {isEventPast ? 'Event ended' : isEventToday ? 'Today' : isEventTomorrow ? 'Tomorrow' : timeUntilEvent}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {event.rsvpCount} attending
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {Math.floor(Math.random() * 500) + 100} views
              </span>
            </div>
          }
          breadcrumbItems={[
            { label: 'Events', href: '/events' },
            { label: event.title }
          ]}
          actions={
            <div className="flex items-center gap-2">
              {/* Share dropdown */}
              <div className="relative group">
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="p-1">
                    <button
                      onClick={() => handleShare('twitter')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      Twitter
                    </button>
                    <button
                      onClick={() => handleShare('facebook')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      Facebook
                    </button>
                    <button
                      onClick={() => handleShare('linkedin')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      LinkedIn
                    </button>
                    <button
                      onClick={() => handleShare('whatsapp')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => handleShare('email')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      Email
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={() => handleShare('copy')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>

              {/* Add to Calendar dropdown */}
              <div className="relative group">
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Add to Calendar
                </Button>
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="p-1">
                    <button
                      onClick={() => addToCalendar('google')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    >
                      Google Calendar
                    </button>
                    <button
                      onClick={() => addToCalendar('outlook')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                    >
                      Outlook
                    </button>
                    <button
                      onClick={() => addToCalendar('ics')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download .ics
                    </button>
                  </div>
                </div>
              </div>

              {/* Favorite button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleToggleFavorite}
                className={`gap-2 ${isFavorited ? 'text-yellow-600 border-yellow-300' : ''}`}
              >
                <Star className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                {isFavorited ? 'Saved' : 'Save'}
              </Button>

              {/* Set Reminder button */}
              <Button variant="outline" size="sm" onClick={setReminder} className="gap-2">
                <Bell className="w-4 h-4" />
                Remind Me
              </Button>
            </div>
          }
        />

        <div className="max-w-6xl space-y-6">

        {/* Event status banner */}
        {(isEventPast || isEventToday || isEventTomorrow) && (
          <div className={`p-4 rounded-lg border ${
            isEventPast 
              ? 'bg-gray-50 border-gray-200 text-gray-700' 
              : isEventToday 
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="font-medium">
                {isEventPast 
                  ? 'This event has ended' 
                  : isEventToday 
                    ? 'This event is happening today!' 
                    : 'This event is tomorrow!'}
              </span>
            </div>
          </div>
        )}

        {/* Main event content - Grid layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Event header */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {event.images && event.images.length > 0 && (
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={event.images[0]}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    {event.price.isFree && (
                      <Badge className="bg-green-500 text-white">FREE</Badge>
                    )}
                    {event.organizer.verified && (
                      <Badge className="bg-blue-500 text-white">VERIFIED</Badge>
                    )}
                  </div>
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">{event.title}</h1>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {event.categories.map((category) => (
                        <Badge key={category} variant="secondary" className="gap-1">
                          <Tag className="w-3 h-3" />
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RSVP buttons */}
                <div className="flex gap-3 mb-6">
                  <Button
                    variant={userRSVPStatus === 'going' ? 'default' : 'outline'}
                    onClick={() => handleRSVP('going')}
                    className="flex-1 sm:flex-none gap-2"
                    disabled={isEventPast}
                  >
                    <Heart className={`w-4 h-4 ${userRSVPStatus === 'going' ? 'fill-current' : ''}`} />
                    {userRSVPStatus === 'going' ? 'Going' : 'I\'m Going'}
                  </Button>
                  <Button
                    variant={userRSVPStatus === 'interested' ? 'default' : 'outline'}
                    onClick={() => handleRSVP('interested')}
                    className="flex-1 sm:flex-none gap-2"
                    disabled={isEventPast}
                  >
                    <Star className={`w-4 h-4 ${userRSVPStatus === 'interested' ? 'fill-current' : ''}`} />
                    {userRSVPStatus === 'interested' ? 'Interested' : 'Interested'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Event description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  About this event
                </CardTitle>
              </CardHeader>
              <CardContent>
                {event.aiSummary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <span className="text-blue-600">🤖</span>
                      AI Summary
                    </h4>
                    <p className="text-blue-800">{event.aiSummary}</p>
                  </div>
                )}
                
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>

                {event.source?.url && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <a
                      href={event.source.url}
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

            {/* Additional event info */}
            {(event.tags && event.tags.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            
            {/* Event details card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {format(startDate, 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {timeUntilEvent}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">
                      {event.location.isVirtual ? 'Virtual Event' : event.location.name}
                    </div>
                    {!event.location.isVirtual && (
                      <div className="text-sm text-gray-500">
                        {event.location.address}
                      </div>
                    )}
                    {event.location.isVirtual && (
                      <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
                        <Globe className="w-4 h-4" />
                        Online event
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 text-gray-700">
                  <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {event.rsvpCount} people going
                    </div>
                    {event.capacity && (
                      <div className="text-sm text-gray-500">
                        {event.capacity - event.rsvpCount} spots remaining
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 text-gray-700">
                  <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                    <span className="text-lg">💰</span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {event.price.isFree ? 'Free' : `$${event.price.amount} ${event.price.currency}`}
                    </div>
                    {event.price.isFree && (
                      <div className="text-sm text-green-600">No cost to attend</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organizer card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Organizer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {event.organizer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {event.organizer.name}
                      {event.organizer.verified && (
                        <Badge variant="secondary" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {event.organizer.type || 'Event Organizer'}
                    </div>
                  </div>
                </div>
                
                {event.organizer.contactInfo && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Contact: {event.organizer.contactInfo}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Group RSVP Manager */}
            <GroupRSVPManager 
              eventId={eventId}
              userRSVPStatus={userRSVPStatus}
            />

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => handleShare('copy')}
                >
                  <Copy className="w-4 h-4" />
                  Copy Event Link
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={setReminder}
                >
                  <Bell className="w-4 h-4" />
                  Set Reminder
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => addToCalendar('google')}
                >
                  <Calendar className="w-4 h-4" />
                  Add to Google Calendar
                </Button>

                {event.externalLinks?.registration && (
                  <Button 
                    variant="default" 
                    className="w-full justify-start gap-2"
                    onClick={() => window.open(event.externalLinks?.registration, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Register Now
                  </Button>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}