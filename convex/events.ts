import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all events with optional filtering
export const getAllEvents = query({
  args: {
    limit: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get events starting from now
    const events = await ctx.db
      .query("events")
      .filter((q) => q.gte(q.field("startDate"), now))
      .order("asc")
      .take(args.limit || 20);

    // Filter by categories in JavaScript if provided
    if (args.categories && args.categories.length > 0) {
      return events.filter((event) =>
        event.categories.some((category) => args.categories!.includes(category))
      );
    }

    return events;
  },
});

// Get all events with optional filtering (legacy function)
export const getEvents = query({
  args: {
    limit: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Start with basic query ordered by start date
    let events = await ctx.db
      .query("events")
      .withIndex("by_start_date")
      .collect();

    // Apply filters in JavaScript for now (simpler than complex Convex filters)
    if (args.startDate) {
      events = events.filter((event) => event.startDate >= args.startDate!);
    }

    if (args.endDate) {
      events = events.filter((event) => event.startDate <= args.endDate!);
    }

    if (args.categories && args.categories.length > 0) {
      events = events.filter((event) =>
        event.categories.some((category) => args.categories!.includes(category))
      );
    }

    // Apply limit
    const limit = args.limit || 50;
    return events.slice(0, limit);
  },
});

// Get a specific event by ID
export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    return event;
  },
});

// Search events by title and description
export const searchEvents = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("events")
      .withSearchIndex("search_events", (q) => q.search("title", args.query))
      .take(args.limit || 20);

    return results;
  },
});

// Create a new event (for organizers)
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    location: v.object({
      name: v.string(),
      address: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      isVirtual: v.boolean(),
    }),
    organizer: v.object({
      name: v.string(),
      type: v.union(
        v.literal("club"),
        v.literal("university"),
        v.literal("external"),
        v.literal("student")
      ),
      verified: v.boolean(),
      contactInfo: v.string(),
    }),
    categories: v.array(v.string()),
    tags: v.optional(v.array(v.string())),
    capacity: v.optional(v.number()),
    price: v.object({
      amount: v.number(),
      currency: v.string(),
      isFree: v.boolean(),
    }),
    images: v.optional(v.array(v.string())),
    externalLinks: v.optional(
      v.object({
        registration: v.optional(v.string()),
        website: v.optional(v.string()),
        social: v.optional(v.array(v.string())),
      })
    ),
    source: v.object({
      platform: v.string(),
      originalId: v.string(),
      url: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("events", {
      ...args,
      tags: args.tags || [],
      images: args.images || [],
      externalLinks: args.externalLinks || {},
      rsvpCount: 0,
    });

    return eventId;
  },
});

// Get personalized events for a user (basic version)
export const getEventById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

export const getPersonalizedEvents = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get events starting from now
    const now = Date.now();
    const events = await ctx.db
      .query("events")
      .filter((q) => q.gte(q.field("startDate"), now))
      .order("asc")
      .take(args.limit || 20);

    // Filter by categories in JavaScript if provided
    let filteredEvents = events;
    if (args.categories && args.categories.length > 0) {
      filteredEvents = events.filter((event) =>
        event.categories.some((category) => args.categories!.includes(category))
      );
    }

    // Enhanced interest-based scoring with multiple factors
    const scoredEvents = events.map((event) => {
      let score = 0;

      // Category match scoring (0-40 points)
      const categoryMatches = event.categories.filter((category) =>
        user.interests.includes(category)
      ).length;
      score += Math.min(40, categoryMatches * 15);

      // Recency bonus (0-20 points) - prefer events happening sooner
      const daysUntilEvent = (event.startDate - now) / (24 * 60 * 60 * 1000);
      if (daysUntilEvent <= 7) {
        score += 20 - daysUntilEvent * 2;
      } else if (daysUntilEvent <= 30) {
        score += 10 - daysUntilEvent * 0.3;
      }

      // Free event bonus (0-10 points)
      if (event.price.isFree) {
        score += 10;
      }

      // University/verified organizer bonus (0-10 points)
      if (event.organizer.verified || event.organizer.type === "university") {
        score += 10;
      }

      // Location preference (0-10 points)
      if (user.preferences?.maxDistance) {
        // Simple distance calculation - in production, you'd use proper geolocation
        const isNearby =
          event.location.address.toLowerCase().includes("ubc") ||
          event.location.isVirtual;
        if (isNearby) {
          score += 10;
        }
      }

      // RSVP popularity bonus (0-10 points)
      if (event.rsvpCount > 0) {
        score += Math.min(10, event.rsvpCount / 5);
      }

      return { ...event, recommendationScore: Math.round(score) };
    });

    // Sort by recommendation score
    const personalizedEvents = scoredEvents
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, args.limit || 20);

    return personalizedEvents;
  },
});

// Get events near a location
export const getEventsNearLocation = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusKm: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Note: This is a simplified location filter
    // In production, you'd want to use proper geospatial queries
    const events = await ctx.db
      .query("events")
      .filter((q) => q.gte(q.field("startDate"), Date.now()))
      .order("asc")
      .take(args.limit || 50);

    // Simple distance calculation (not accurate for large distances)
    const radiusKm = args.radiusKm || 25;
    const filteredEvents = events.filter((event) => {
      const lat1 = args.latitude;
      const lon1 = args.longitude;
      const lat2 = event.location.latitude;
      const lon2 = event.location.longitude;

      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance <= radiusKm;
    });

    return filteredEvents;
  },
});
