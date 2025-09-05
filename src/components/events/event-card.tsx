"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Star,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { RecommendationBadge } from "./recommendation-badge";
import Link from "next/link";

interface EventCardProps {
  event: {
    _id: string;
    title: string;
    description: string;
    aiSummary?: string;
    startDate: number;
    endDate: number;
    location: {
      name: string;
      address: string;
      isVirtual: boolean;
    };
    organizer: {
      name: string;
      verified: boolean;
    };
    categories: string[];
    price: {
      isFree: boolean;
      amount?: number;
      currency?: string;
    };
    rsvpCount: number;
    maxCapacity?: number;
    imageUrl?: string;
    sourceUrl?: string;
    recommendationScore?: number;
    reasonsToAttend?: string[];
  };
  onRSVP?: (eventId: string, status: "going" | "interested") => void;
  userRSVPStatus?: "going" | "interested" | null;
  onToggleFavorite?: (eventId: string) => void;
  isFavorited?: boolean;
  showRecommendationScore?: boolean;
  viewMode?: "list" | "grid";
}

export function EventCard({
  event,
  onRSVP,
  userRSVPStatus,
  onToggleFavorite,
  isFavorited = false,
  showRecommendationScore = false,
  viewMode = "grid",
}: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isToday =
    format(startDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const isTomorrow =
    format(startDate, "yyyy-MM-dd") ===
    format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  const getDateLabel = () => {
    if (isToday) return "Today";
    if (isTomorrow) return "Tomorrow";
    return format(startDate, "MMM d, yyyy");
  };

  const getTimeLabel = () => {
    const startTime = format(startDate, "h:mm a");
    const endTime = format(endDate, "h:mm a");
    return `${startTime} - ${endTime}`;
  };

  const displayDescription = event.aiSummary || event.description;
  const shouldTruncate = displayDescription.length > 150;
  const truncatedDescription = shouldTruncate
    ? displayDescription.substring(0, 150) + "..."
    : displayDescription;

  const handleRSVP = (status: "going" | "interested") => {
    if (onRSVP) {
      onRSVP(event._id, status);
    }
  };

  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(event._id);
    }
  };

  if (viewMode === "list") {
    return (
      <Card className="w-full hover:shadow-lg transition-shadow duration-200 group">
        <div className="flex">
          {event.imageUrl && (
            <div className="relative w-48 h-32 overflow-hidden rounded-l-lg flex-shrink-0">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              {showRecommendationScore && event.recommendationScore && (
                <RecommendationBadge
                  score={event.recommendationScore}
                  reasons={event.reasonsToAttend}
                  className="absolute top-2 right-2"
                />
              )}
            </div>
          )}
          <div className="flex-1 p-4">
            <div className="flex justify-between items-start mb-2">
              <Link href={`/events/${event._id}`}>
                <h3 className="font-semibold text-lg leading-tight hover:text-blue-600 transition-colors cursor-pointer">
                  {event.title}
                </h3>
              </Link>
              {!event.imageUrl &&
                showRecommendationScore &&
                event.recommendationScore && (
                  <RecommendationBadge
                    score={event.recommendationScore}
                    reasons={event.reasonsToAttend}
                  />
                )}
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {event.categories.slice(0, 3).map((category, index) => (
                <Badge
                  key={`${event._id}-category-${index}`}
                  variant="secondary"
                  className="text-xs"
                >
                  {category}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{getDateLabel()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{getTimeLabel()}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>
                  {event.location.isVirtual ? "Virtual" : event.location.name}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-700 line-clamp-2 mb-3">
              {displayDescription}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{event.rsvpCount} going</span>
                </div>
                <span className="font-medium">
                  {event.price.isFree ? "Free" : `$${event.price.amount}`}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleFavorite}
                  className="p-2"
                >
                  <Star
                    className={`w-4 h-4 ${isFavorited ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`}
                  />
                </Button>
                <Button
                  variant={userRSVPStatus === "going" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRSVP("going")}
                >
                  {userRSVPStatus === "going" ? "Going" : "Going"}
                </Button>
                <Button
                  variant={
                    userRSVPStatus === "interested" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleRSVP("interested")}
                >
                  {userRSVPStatus === "interested"
                    ? "Interested"
                    : "Interested"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full hover:shadow-lg transition-shadow duration-200 group">
      {event.imageUrl && (
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          {showRecommendationScore && event.recommendationScore && (
            <RecommendationBadge
              score={event.recommendationScore}
              reasons={event.reasonsToAttend}
              className="absolute top-2 right-2"
            />
          )}
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Link href={`/events/${event._id}`}>
              <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer">
                {event.title}
              </h3>
            </Link>

            <div className="flex flex-wrap gap-1 mb-3">
              {event.categories.slice(0, 3).map((category, index) => (
                <Badge
                  key={`${event._id}-category-${index}`}
                  variant="secondary"
                  className="text-xs"
                >
                  {category}
                </Badge>
              ))}
              {event.categories.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{event.categories.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {!event.imageUrl &&
            showRecommendationScore &&
            event.recommendationScore && (
              <RecommendationBadge
                score={event.recommendationScore}
                reasons={event.reasonsToAttend}
              />
            )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">{getDateLabel()}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{getTimeLabel()}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">
              {event.location.isVirtual ? "Virtual Event" : event.location.name}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{event.rsvpCount} going</span>
              {event.maxCapacity && (
                <span className="text-gray-400">/ {event.maxCapacity}</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="font-medium">
                {event.price.isFree ? "Free" : `$${event.price.amount}`}
              </span>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-700">
          <p className={isExpanded ? "" : "line-clamp-3"}>
            {isExpanded ? displayDescription : truncatedDescription}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-800 font-medium mt-1"
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
          <span>
            by {event.organizer.name}
            {event.organizer.verified && (
              <span className="ml-1 text-blue-600">✓</span>
            )}
          </span>
          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-3 h-3" />
              View original
            </a>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex gap-2 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className="p-2"
          >
            <Star
              className={`w-4 h-4 ${isFavorited ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`}
            />
          </Button>
          <Button
            variant={userRSVPStatus === "going" ? "default" : "outline"}
            size="sm"
            onClick={() => handleRSVP("going")}
            className="flex-1"
          >
            {userRSVPStatus === "going" ? "Going" : "I'm Going"}
          </Button>
          <Button
            variant={userRSVPStatus === "interested" ? "default" : "outline"}
            size="sm"
            onClick={() => handleRSVP("interested")}
            className="flex-1"
          >
            {userRSVPStatus === "interested" ? "Interested" : "Interested"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
