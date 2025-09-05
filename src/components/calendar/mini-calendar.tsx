"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "../../../convex/_generated/api";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from "date-fns";

interface MiniCalendarProps {
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
  showEvents?: boolean;
  className?: string;
}

export function MiniCalendar({
  onDateSelect,
  selectedDate,
  showEvents = true,
  className = "",
}: MiniCalendarProps) {
  const { user } = useUser();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get user profile for RSVP status
  const userProfile = useQuery(api.users.getCurrentUser, user ? {} : "skip");

  // Get events for the current month
  const events = useQuery(
    showEvents ? api.events.getEvents : undefined,
    showEvents ? { 
      limit: 100,
      startDate: startOfMonth(currentMonth).getTime(),
      endDate: endOfMonth(currentMonth).getTime(),
    } : undefined
  );

  // Get user RSVPs for highlighting
  const userRSVPs = useQuery(
    api.rsvps.getUserRSVPs,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

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

  // Get events by date
  const eventsByDate = useMemo(() => {
    if (!events || !showEvents) return {};
    
    const eventsMap: Record<string, Array<{ event: any; rsvpStatus?: string }>> = {};
    
    events.forEach((event) => {
      const eventDate = format(new Date(event.startDate), 'yyyy-MM-dd');
      const rsvpStatus = rsvpStatusMap[event._id];
      
      if (!eventsMap[eventDate]) {
        eventsMap[eventDate] = [];
      }
      
      eventsMap[eventDate].push({ event, rsvpStatus });
    });
    
    return eventsMap;
  }, [events, rsvpStatusMap, showEvents]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days to make it start on Sunday
    const startDayOfWeek = start.getDay();
    const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => {
      const paddingDate = new Date(start);
      paddingDate.setDate(start.getDate() - startDayOfWeek + i);
      return paddingDate;
    });
    
    return [...paddingDays, ...days];
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    onDateSelect?.(date);
  };

  const getDayEvents = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  const getDayEventCount = (date: Date, status?: string) => {
    const dayEvents = getDayEvents(date);
    if (!status) return dayEvents.length;
    return dayEvents.filter(({ rsvpStatus }) => rsvpStatus === status).length;
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          className="p-1 h-auto"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900 text-sm">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          className="p-1 h-auto"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div
              key={index}
              className="text-center text-xs font-medium text-gray-500 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);
            const dayEvents = getDayEvents(date);
            const goingCount = getDayEventCount(date, 'going');
            const interestedCount = getDayEventCount(date, 'interested');

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                className={`
                  relative p-1 h-8 text-xs rounded transition-colors
                  ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                  ${isTodayDate ? 'bg-blue-100 text-blue-900 font-semibold' : ''}
                  ${isSelected ? 'bg-blue-600 text-white' : ''}
                  ${!isSelected && !isTodayDate ? 'hover:bg-gray-100' : ''}
                  ${dayEvents.length > 0 ? 'font-medium' : ''}
                `}
              >
                <span className="relative z-10">
                  {format(date, 'd')}
                </span>

                {/* Event indicators */}
                {showEvents && dayEvents.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5">
                    {goingCount > 0 && (
                      <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    )}
                    {interestedCount > 0 && (
                      <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
                    )}
                    {dayEvents.length > goingCount + interestedCount && (
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {showEvents && (
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Going</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span>Interested</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Available</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
