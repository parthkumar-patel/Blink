"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { 
  CheckCircle, 
  Star, 
  MessageSquare, 
  Calendar,
  MapPin,
  Clock,
  X,
  ThumbsUp
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface AttendanceConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AttendanceConfirmation({ isOpen, onClose }: AttendanceConfirmationProps) {
  const { user } = useUser();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user profile
  const userProfile = useQuery(api.users.getCurrentUser, user ? {} : "skip");

  // Get events that need attendance confirmation
  const eventsToConfirm = useQuery(api.attendance.getEventsForAttendanceConfirmation);

  // Confirm attendance mutation
  const confirmAttendance = useMutation(api.attendance.confirmAttendance);

  const handleConfirmAttendance = async (event: any) => {
    if (!event) return;
    
    setIsSubmitting(true);
    try {
      await confirmAttendance({
        eventId: event._id,
        rating: rating > 0 ? rating : undefined,
        feedback: feedback.trim() || undefined,
        wouldRecommend: wouldRecommend !== null ? wouldRecommend : undefined,
      });

      // Reset form
      setSelectedEvent(null);
      setRating(0);
      setFeedback("");
      setWouldRecommend(null);
      
      toast.success("Attendance confirmed! Thank you for your feedback.");
    } catch (error) {
      console.error("Error confirming attendance:", error);
      toast.error("Failed to confirm attendance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEventSelect = (event: any) => {
    setSelectedEvent(event);
    setRating(0);
    setFeedback("");
    setWouldRecommend(null);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {!selectedEvent ? (
          // Event selection view
          <div>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Confirm Your Attendance
                </h2>
                <p className="text-gray-600 mt-1">
                  Which events did you attend? Your feedback helps improve future events.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {!eventsToConfirm || eventsToConfirm.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    All caught up!
                  </h3>
                  <p className="text-gray-600">
                    No recent events need attendance confirmation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    You RSVP'd to these events that recently ended. Confirm which ones you actually attended:
                  </p>
                  
                  {eventsToConfirm.map((event) => (
                    <Card 
                      key={event._id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleEventSelect(event)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2">
                              {event.title}
                            </h3>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(event.startDate), 'EEEE, MMM d, yyyy')}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {format(new Date(event.startDate), 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {event.location.isVirtual ? 'Virtual Event' : event.location.name}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant={event.rsvpStatus === 'going' ? 'default' : 'secondary'}>
                                RSVP: {event.rsvpStatus === 'going' ? 'Going' : 'Interested'}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              Ended {format(new Date(event.endDate), 'MMM d')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Feedback form view
          <div>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Confirm Attendance
                </h2>
                <p className="text-gray-600 mt-1">
                  {selectedEvent.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  How would you rate this event? (Optional)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                    >
                      <Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    {rating === 1 && "Poor"}
                    {rating === 2 && "Fair"}
                    {rating === 3 && "Good"}
                    {rating === 4 && "Very Good"}
                    {rating === 5 && "Excellent"}
                  </p>
                )}
              </div>

              {/* Recommendation */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Would you recommend this event to friends? (Optional)
                </label>
                <div className="flex gap-3">
                  <Button
                    variant={wouldRecommend === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWouldRecommend(true)}
                    className="gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Yes
                  </Button>
                  <Button
                    variant={wouldRecommend === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWouldRecommend(false)}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    No
                  </Button>
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Any feedback for the organizers? (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What did you like? What could be improved?"
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {feedback.length}/500 characters
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleConfirmAttendance(selectedEvent)}
                  disabled={isSubmitting}
                  className="flex-1 gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isSubmitting ? "Confirming..." : "Confirm Attendance"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedEvent(null)}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              </div>

              <p className="text-xs text-gray-500">
                Confirming attendance helps event organizers improve future events and builds your event history.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
