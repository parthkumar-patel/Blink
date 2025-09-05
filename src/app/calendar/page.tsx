"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { EventCalendar } from "@/components/calendar/event-calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Download, 
  Filter,
  Settings,
  Info
} from "lucide-react";
import { Views, View } from "react-big-calendar";

export default function CalendarPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);

  const handleEventClick = (event: any) => {
    // Navigate to event details page
    router.push(`/events/${event._id}`);
  };

  const handleDateClick = (date: Date) => {
    // Navigate to create event page with pre-selected date
    const dateParam = date.toISOString().split('T')[0];
    router.push(`/create-event?date=${dateParam}`);
  };

  const handleEventCreate = (eventData: { start: Date; end: Date; title: string }) => {
    // Navigate to create event page with pre-filled data
    const params = new URLSearchParams({
      title: eventData.title,
      startDate: eventData.start.toISOString(),
      endDate: eventData.end.toISOString(),
    });
    router.push(`/create-event?${params.toString()}`);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Event Calendar"
          description="View and manage your events in calendar format"
          showBreadcrumb={false}
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button size="sm" onClick={() => handleDateClick(new Date())} className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                Add Event
              </Button>
            </div>
          }
        />

        {/* Info banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                Interactive Calendar Features
              </h4>
              <div className="text-blue-700 text-sm space-y-1">
                <p>• <strong>Click any date</strong> to create a new event</p>
                <p>• <strong>Click events</strong> to view details and RSVP</p>
                <p>• <strong>Drag events</strong> to reschedule (if you&apos;re the organizer)</p>
                <p>• <strong>Export calendar</strong> to import your RSVP&apos;d events into other calendar apps</p>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Total events</p>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Going</p>
                <p className="text-2xl font-bold text-green-600">5</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Confirmed attendance</p>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Interested</p>
                <p className="text-2xl font-bold text-amber-600">3</p>
              </div>
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Maybe attending</p>
          </div>

          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-blue-600">4</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">No RSVP yet</p>
          </div>
        </div>

        {/* Main Calendar */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <EventCalendar
            height={700}
            showToolbar={true}
            defaultView={Views.MONTH}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onEventCreate={handleEventCreate}
          />
        </div>

        {/* Tips section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Calendar Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Switch between Month, Week, and Day views using the toolbar</li>
              <li>• Events are color-coded based on your RSVP status</li>
              <li>• Use the Export button to download your calendar as an .ics file</li>
              <li>• Click and drag to select time ranges for new events</li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              Export & Sync
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Export your calendar to sync with:
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Google Calendar</Badge>
                <Badge variant="outline">Apple Calendar</Badge>
                <Badge variant="outline">Outlook</Badge>
                <Badge variant="outline">Any iCal app</Badge>
              </div>
              <p className="text-xs text-gray-500">
                Only events you&apos;ve RSVP&apos;d to will be included in the export.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
