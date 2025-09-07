"use client";

import { useState, useMemo, useCallback } from "react";
// @ts-expect-error - react-big-calendar has no types in this project; shim provided in src/types
import { Calendar, momentLocalizer, Views, View } from "react-big-calendar";
import moment from "moment";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Grid,
  List,
  Plus
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-styles.css";

// Setup moment localizer
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: unknown; // The full event object from Convex
  allDay?: boolean;
}

interface EventCalendarProps {
  height?: number;
  showToolbar?: boolean;
  defaultView?: View;
  onEventClick?: (event: unknown) => void;
  onDateClick?: (date: Date) => void;
  onEventCreate?: (event: { start: Date; end: Date; title: string }) => void;
}

export function EventCalendar({
  height = 600,
  showToolbar = true,
  defaultView = Views.MONTH,
  onEventClick,
  onDateClick,
  onEventCreate,
}: EventCalendarProps) {
  const { user } = useUser();
  const [currentView, setCurrentView] = useState<View>(defaultView);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get user profile for RSVP status
  const userProfile = useQuery(api.users.getCurrentUser, user ? {} : "skip");

  // Get all events for calendar display
  const events = useQuery(api.events.getEvents, { 
    limit: 500,
    startDate: moment(currentDate).startOf('month').subtract(1, 'month').valueOf(),
    endDate: moment(currentDate).endOf('month').add(1, 'month').valueOf(),
  });

  // Get user RSVPs for highlighting
  const userRSVPs = useQuery(
    api.rsvps.getUserRSVPs,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  // Mutations for RSVP and event updates
  // const createRSVP = useMutation(api.rsvps.createRSVP);
  // const updateRSVP = useMutation(api.rsvps.updateRSVP);
  const updateEvent = useMutation(api.events.updateEvent);

  // Convert events to calendar format
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!events) return [];

    return events.map((event) => ({
      id: event._id,
      title: event.title,
      start: new Date(event.startDate),
      end: new Date(event.endDate),
      resource: event,
      allDay: false,
    }));
  }, [events]);

  // Create RSVP status map
  const rsvpStatusMap = useMemo(() => {
    if (!userRSVPs) return {};
    const map: Record<string, "going" | "interested"> = {};
    userRSVPs.forEach((rsvp) => {
      if (rsvp.status === "going" || rsvp.status === "interested") {
        map[rsvp.eventId] = rsvp.status;
      }
    });
    return map;
  }, [userRSVPs]);

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    onEventClick?.(event.resource);
  }, [onEventClick]);

  // Handle date selection
  const handleDateSelect = useCallback((slotInfo: { start: Date; end: Date }) => {
    const { start, end } = slotInfo;
    onDateClick?.(start);
    
    // If onEventCreate is provided, prompt for event creation
    if (onEventCreate) {
      const title = prompt("Enter event title:");
      if (title) {
        onEventCreate({ start, end, title });
      }
    }
  }, [onDateClick, onEventCreate]);

  // Handle event drag and drop
  const handleEventDrop = useCallback(async (info: { event: { id: string }, start: Date, end: Date }) => {
    const { event, start, end } = info;
    
    if (!userProfile?.clerkId) {
      alert("You must be logged in to move events");
      return;
    }

    try {
      await updateEvent({
        eventId: event.id as Id<"events">,
        clerkId: userProfile.clerkId,
        startDate: start.getTime(),
        endDate: end.getTime(),
      });
    } catch (error) {
      console.error("Error updating event:", error);
      alert("You don't have permission to modify this event");
    }
  }, [updateEvent, userProfile]);

  // Handle event resize
  const handleEventResize = useCallback(async (info: { event: { id: string }, start: Date, end: Date }) => {
    const { event, start, end } = info;
    
    if (!userProfile?.clerkId) {
      alert("You must be logged in to resize events");
      return;
    }

    try {
      await updateEvent({
        eventId: event.id as Id<"events">,
        clerkId: userProfile.clerkId,
        startDate: start.getTime(),
        endDate: end.getTime(),
      });
    } catch (error) {
      console.error("Error updating event:", error);
      alert("You don't have permission to modify this event");
    }
  }, [updateEvent, userProfile]);

  // Custom event style getter
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const rsvpStatus = rsvpStatusMap[event.id];
    
    let backgroundColor = '#3174ad'; // Default blue
    let borderColor = '#3174ad';
    
    if (rsvpStatus === 'going') {
      backgroundColor = '#10b981'; // Green
      borderColor = '#10b981';
    } else if (rsvpStatus === 'interested') {
      backgroundColor = '#f59e0b'; // Amber
      borderColor = '#f59e0b';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        borderWidth: '2px',
        borderStyle: 'solid',
        fontSize: '12px',
        fontWeight: '500',
      }
    };
  }, [rsvpStatusMap]);

  // Custom toolbar component
  const CustomToolbar = ({ date, view, onView, onNavigate }: { date: Date, view: View, onView: (v: View) => void, onNavigate: (action: 'PREV' | 'TODAY' | 'NEXT') => void }) => (
    <div className="flex items-center justify-between mb-4 p-4 bg-white border rounded-lg shadow-sm">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('PREV')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('TODAY')}
        >
          Today
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('NEXT')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Date/Title */}
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-5 h-5 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          {moment(date).format('MMMM YYYY')}
        </h2>
      </div>

      {/* View selector and actions */}
      <div className="flex items-center gap-2">
        {/* View buttons */}
        <div className="flex items-center border rounded-lg">
          <Button
            variant={view === Views.MONTH ? "default" : "ghost"}
            size="sm"
            onClick={() => onView(Views.MONTH)}
            className="rounded-r-none"
          >
            <Grid className="w-4 h-4 mr-1" />
            Month
          </Button>
          <Button
            variant={view === Views.WEEK ? "default" : "ghost"}
            size="sm"
            onClick={() => onView(Views.WEEK)}
            className="rounded-none"
          >
            <List className="w-4 h-4 mr-1" />
            Week
          </Button>
          <Button
            variant={view === Views.DAY ? "default" : "ghost"}
            size="sm"
            onClick={() => onView(Views.DAY)}
            className="rounded-l-none"
          >
            Day
          </Button>
        </div>

        {/* Export button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCalendar()}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>

        {/* Create event button */}
        <Button
          size="sm"
          onClick={() => onDateClick?.(new Date())}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </Button>
      </div>
    </div>
  );

  // Export calendar functionality
  const exportCalendar = useCallback(() => {
    if (!events) return;

    // Create iCal content
    const icalContent = generateICalContent(events, userRSVPs || []);
    
    // Create and download file
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `events-${moment().format('YYYY-MM-DD')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [events, userRSVPs]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full">
        {/* RSVP Legend */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Going</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span className="text-sm text-gray-600">Interested</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Available</span>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-lg border shadow-sm">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height }}
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectEvent={handleEventClick}
            onSelectSlot={handleDateSelect}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            selectable
            resizable
            dragFromOutsideItem={null}
            eventPropGetter={eventStyleGetter}
            components={{
              toolbar: showToolbar ? CustomToolbar : () => null,
            }}
            popup
            popupOffset={30}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            step={60}
            showMultiDayTimes
            messages={{
              next: "Next",
              previous: "Previous", 
              today: "Today",
              month: "Month",
              week: "Week",
              day: "Day",
              agenda: "Agenda",
              date: "Date",
              time: "Time",
              event: "Event",
              noEventsInRange: "No events in this range",
              showMore: (total: number) => `+${total} more`,
            }}
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: (
                { start, end }: { start: Date; end: Date },
                culture: unknown,
                localizer: { format: (d: Date, f: string, c?: unknown) => string }
              ) =>
                localizer?.format(start, 'HH:mm', culture) + ' – ' + localizer?.format(end, 'HH:mm', culture),
              agendaTimeFormat: 'HH:mm',
              agendaTimeRangeFormat: (
                { start, end }: { start: Date; end: Date },
                culture: unknown,
                localizer: { format: (d: Date, f: string, c?: unknown) => string }
              ) =>
                localizer?.format(start, 'HH:mm', culture) + ' – ' + localizer?.format(end, 'HH:mm', culture),
            }}
          />
        </div>
      </div>
    </DndProvider>
  );
}

// Helper function to generate iCal content
function generateICalContent(events: Array<{ _id: string; title: string; description: string; startDate: number; endDate: number; location: { address: string }; organizer: { name: string }; source: { url: string } }>, userRSVPs: Array<{ eventId: string }>): string {
  const rsvpEventIds = new Set(userRSVPs.map(rsvp => rsvp.eventId));
  
  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Student Events Finder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach((event) => {
    const isRsvped = rsvpEventIds.has(event._id);
    
    if (isRsvped) {
      const startDate = moment(event.startDate).utc().format('YYYYMMDDTHHmmss[Z]');
      const endDate = moment(event.endDate).utc().format('YYYYMMDDTHHmmss[Z]');
      const createdDate = moment().utc().format('YYYYMMDDTHHmmss[Z]');

      ical.push(
        'BEGIN:VEVENT',
        `UID:${event._id}@studentevents.ca`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `DTSTAMP:${createdDate}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
        `LOCATION:${event.location.address}`,
        `ORGANIZER:CN=${event.organizer.name}`,
        `URL:${event.source.url}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    }
  });

  ical.push('END:VCALENDAR');
  return ical.join('\r\n');
}
