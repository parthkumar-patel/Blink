// Core data types for the events finder application

export interface User {
  id: string;
  email: string;
  name: string;
  university: string;
  year: "freshman" | "sophomore" | "junior" | "senior" | "graduate";
  interests: string[];
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  preferences: {
    maxDistance: number; // km
    notificationSettings: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacySettings: {
      profileVisible: boolean;
      showInBuddyMatching: boolean;
    };
    buddyMatchingEnabled: boolean;
  };
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  aiSummary?: string;
  startDate: Date;
  endDate: Date;
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    isVirtual: boolean;
  };
  organizer: {
    name: string;
    type: "club" | "university" | "external" | "student";
    verified: boolean;
    contactInfo: string;
  };
  categories: string[];
  tags: string[];
  capacity?: number;
  price: {
    amount: number;
    currency: "CAD";
    isFree: boolean;
  };
  images: string[];
  externalLinks: {
    registration?: string;
    website?: string;
    social?: string[];
  };
  source: {
    platform: string;
    originalId: string;
    url: string;
  };
  rsvpCount: number;
  attendanceCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RSVP {
  id: string;
  userId: string;
  eventId: string;
  status: "going" | "interested" | "not_going";
  buddyMatchingEnabled: boolean;
  createdAt: Date;
}

export interface EventFilters {
  categories: string[];
  dateRange: {
    start?: Date;
    end?: Date;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // km
  };
  priceRange?: {
    min: number;
    max: number;
  };
  isFree?: boolean;
  isVirtual?: boolean;
}

export interface SearchParams {
  query?: string;
  filters?: EventFilters;
  sortBy?: "date" | "relevance" | "distance" | "popularity";
  limit?: number;
  offset?: number;
}

// Event categories for filtering and interests
export const EVENT_CATEGORIES = [
  "tech",
  "music", 
  "sports",
  "volunteering",
  "career",
  "academic",
  "social",
  "cultural",
  "food",
  "arts",
  "networking",
  "workshop"
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];

// University year options
export const UNIVERSITY_YEARS = [
  "freshman",
  "sophomore", 
  "junior",
  "senior",
  "graduate"
] as const;

export type UniversityYear = typeof UNIVERSITY_YEARS[number];