import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Helper to resolve image storage IDs into temporary signed URLs
async function resolveImageUrls(
  ctx: QueryCtx | MutationCtx,
  event: Doc<"events">
): Promise<Doc<"events">> {
  if (event?.imageStorageIds && event.imageStorageIds.length > 0) {
    const urls: string[] = [];
    for (const sid of event.imageStorageIds) {
      const u = await ctx.storage.getUrl(sid);
      if (u) urls.push(u);
    }
    return { ...event, images: urls.length > 0 ? urls : event.images };
  }
  return event;
}

// Get all events with optional filtering and efficient pagination
export const getAllEvents = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Get more events than needed to account for filtering
    const extraBuffer = args.categories ? Math.max(50, limit * 3) : limit;
    
    // Get events starting from now
    const events = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), now),
          // Only approved or legacy events
          q.or(q.eq(q.field("status"), "approved"), q.eq(q.field("status"), undefined))
        )
      )
      .order("asc")
      .take(offset + extraBuffer);

    // Filter by categories in JavaScript if provided
    let filteredEvents = events;
    if (args.categories && args.categories.length > 0) {
      filteredEvents = events.filter((event) =>
        event.categories.some((category) => args.categories!.includes(category))
      );
    }

    // Resolve first image URL if needed to keep list performant
    const page = filteredEvents.slice(offset, offset + limit);
    const withThumbs = await Promise.all(
      page.map(async (ev) => {
        if (ev.imageStorageIds && ev.imageStorageIds.length > 0) {
          const u = await ctx.storage.getUrl(ev.imageStorageIds[0]);
          return { ...ev, images: u ? [u, ...(ev.images || [])] : ev.images };
        }
        return ev;
      })
    );

    return withThumbs;
  },
});

// Get all events with optional filtering and pagination (legacy function - enhanced)
export const getEvents = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    
    // Start with basic query ordered by start date
    let events = await ctx.db
      .query("events")
      .withIndex("by_start_date")
      .collect();

    // Only approved or legacy events for public listings
    events = events.filter((e) => !e.status || e.status === "approved");

    // Apply filters in JavaScript for now
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

    // Resolve first image URL if stored as storageId
    const slice = events.slice(offset, offset + limit);
    const resolved = await Promise.all(slice.map((ev) => resolveImageUrls(ctx, ev)));

    return resolved;
  },
});

// Get a specific event by ID (resolves image storage IDs)
export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const ev = await ctx.db.get(args.eventId);
    if (!ev) return ev;
    return await resolveImageUrls(ctx, ev);
  },
});

// Alias used by detail page
export const getEventById = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const ev = await ctx.db.get(args.eventId);
    if (!ev) return ev;
    return await resolveImageUrls(ctx, ev);
  },
});

// Enhanced search events by title and description
export const searchEvents = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Search in titles first (most relevant)
    const titleResults = await ctx.db
      .query("events")
      .withSearchIndex("search_events", (q) => q.search("title", args.query))
      .take(limit * 2);

    // Search in descriptions for additional results
    const descriptionResults = await ctx.db
      .query("events")
      .withSearchIndex("search_events_full", (q) => q.search("description", args.query))
      .take(limit * 2);

    // Combine and deduplicate results
    const merged: Doc<"events">[] = [];
    const seen = new Set<Id<"events">>();
    [...titleResults, ...descriptionResults].forEach((e) => {
      if (!seen.has(e._id) && (!e.status || e.status === "approved")) {
        merged.push(e);
        seen.add(e._id);
      }
    });

    // Resolve first image for up to `limit` results
    const resolved = await Promise.all(merged.slice(0, limit).map((ev) => resolveImageUrls(ctx, ev)));
    return resolved;
  },
});

// Get autocomplete suggestions based on search query
export const getSearchSuggestions = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 8;
    
    if (args.query.length < 2) {
      return [] as string[];
    }

    // Get events that match the query
    const events = await ctx.db
      .query("events")
      .withSearchIndex("search_events", (q) => q.search("title", args.query))
      .take(limit * 2);

    // Extract unique suggestions from event titles and categories
    const suggestions = new Set<string>();
    
    events.forEach((event) => {
      if (event.status && event.status !== "approved") return;
      const words = event.title.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (word.startsWith(args.query.toLowerCase()) && word.length > args.query.length) {
          suggestions.add(word);
        }
      });
      event.categories.forEach((category) => {
        if (category.toLowerCase().includes(args.query.toLowerCase())) {
          suggestions.add(category);
        }
      });
    });

    const popularTerms = [
      "hackathon", "workshop", "career fair", "networking", "study group", 
      "tech talk", "conference", "seminar", "competition", "volunteer",
      "club meeting", "social event", "academic", "research", "internship",
      "job fair", "startup", "entrepreneurship", "coding", "design"
    ];
    
    popularTerms.forEach((term) => {
      if (term.toLowerCase().includes(args.query.toLowerCase())) {
        suggestions.add(term);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  },
});

// Get popular searches and trending terms
export const getPopularSearches = query({
  args: {},
  handler: async (ctx) => {
    const recentSearches = await ctx.db
      .query("searchHistory")
      .withIndex("by_user_date")
      .order("desc")
      .take(1000);

    const searchCounts = new Map<string, number>();
    recentSearches.forEach((search) => {
      if (search.query.trim()) {
        const normalized = search.query.toLowerCase().trim();
        searchCounts.set(normalized, (searchCounts.get(normalized) || 0) + 1);
      }
    });

    const sortedSearches = Array.from(searchCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    if (sortedSearches.length < 5) {
      return [
        { query: "hackathon", count: 45 },
        { query: "workshop", count: 38 },
        { query: "career fair", count: 32 },
        { query: "networking", count: 28 },
        { query: "study group", count: 24 },
        { query: "tech talk", count: 22 },
        { query: "conference", count: 18 },
        { query: "competition", count: 15 },
      ];
    }

    return sortedSearches;
  },
});

// Create a new event (Organizer submission)
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
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
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
    // Identify current user for submittedBy
    const identity = await ctx.auth.getUserIdentity();
    let submittedBy: Id<"users"> | undefined = undefined;
    if (identity) {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
      submittedBy = currentUser?._id;
    }

    const now = Date.now();

    const eventId = await ctx.db.insert("events", {
      ...args,
      tags: args.tags || [],
      images: args.images || [],
      externalLinks: args.externalLinks || {},
      rsvpCount: 0,
      status: "pending",
      submittedBy,
      createdAt: now,
      updatedAt: now,
    });

    return eventId;
  },
});

// Update an existing event (for organizers) – unchanged except we bump updatedAt
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(), // For authorization
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    location: v.optional(
      v.object({
        name: v.string(),
        address: v.string(),
        latitude: v.number(),
        longitude: v.number(),
        isVirtual: v.boolean(),
      })
    ),
    organizer: v.optional(
      v.object({
        name: v.string(),
        type: v.union(
          v.literal("club"),
          v.literal("university"),
          v.literal("external"),
          v.literal("student")
        ),
        verified: v.boolean(),
        contactInfo: v.string(),
      })
    ),
    categories: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    capacity: v.optional(v.number()),
    price: v.optional(
      v.object({
        amount: v.number(),
        currency: v.string(),
        isFree: v.boolean(),
      })
    ),
    images: v.optional(v.array(v.string())),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    externalLinks: v.optional(
      v.object({
        registration: v.optional(v.string()),
        website: v.optional(v.string()),
        social: v.optional(v.array(v.string())),
      })
    ),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const canUpdate =
      event.organizer.contactInfo === user.email ||
      event.organizer.name === user.name ||
      (event.organizer.type === "student" && event.organizer.contactInfo === user.email) ||
      user.preferences?.privacySettings?.profileVisible === true; // Simple admin check

    if (!canUpdate) {
      throw new Error("You don't have permission to update this event");
    }

    const updateData: Partial<Doc<"events">> & { updatedAt: number } = { updatedAt: Date.now() };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.startDate !== undefined) updateData.startDate = args.startDate;
    if (args.endDate !== undefined) updateData.endDate = args.endDate;
    if (args.location !== undefined) updateData.location = args.location as Doc<"events">["location"];
    if (args.organizer !== undefined) updateData.organizer = args.organizer as Doc<"events">["organizer"];
    if (args.categories !== undefined) updateData.categories = args.categories;
    if (args.tags !== undefined) updateData.tags = args.tags;
    if (args.capacity !== undefined) updateData.capacity = args.capacity;
    if (args.price !== undefined) updateData.price = args.price as Doc<"events">["price"];
    if (args.images !== undefined) updateData.images = args.images;
    if (args.imageStorageIds !== undefined) updateData.imageStorageIds = args.imageStorageIds as Id<"_storage">[];
    if (args.externalLinks !== undefined) updateData.externalLinks = args.externalLinks as Doc<"events">["externalLinks"];
    if (args.status !== undefined) updateData.status = args.status as Doc<"events">["status"];

    await ctx.db.patch(args.eventId, updateData);

    return { success: true, eventId: args.eventId };
  },
});

// Generate upload URL for organizer image uploads
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// List events submitted by the current user
export const getMySubmissions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as Doc<"events">[];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!currentUser) return [] as Doc<"events">[];

    const events = await ctx.db
      .query("events")
      .withIndex("by_status")
      .order("desc")
      .take(200); // filter in JS for now

    const mine = events.filter((e) => e.submittedBy === currentUser._id);
    const resolved = await Promise.all(mine.map((ev) => resolveImageUrls(ctx, ev)));
    return resolved.slice(0, args.limit || 50);
  },
});

// Admin: list pending submissions
export const getPendingSubmissions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .take(args.limit || 100);
    return await Promise.all(events.map((ev) => resolveImageUrls(ctx, ev)));
  },
});

// Admin: approve event
export const approveEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const reviewer = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!reviewer) throw new Error("Reviewer not found");

    await ctx.db.patch(args.eventId, {
      status: "approved",
      reviewerId: reviewer._id,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Admin: reject event
export const rejectEvent = mutation({
  args: { eventId: v.id("events"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const reviewer = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!reviewer) throw new Error("Reviewer not found");

    await ctx.db.patch(args.eventId, {
      status: "rejected",
      reviewerId: reviewer._id,
      reviewedAt: Date.now(),
      rejectionReason: args.reason,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Existing: getEventById, getPersonalizedEvents, getEventsNearLocation, deleteEvent, getEventsByOrganizer, canEditEvent remain – but we adjusted getEventById earlier
// Note: We keep other existing exports unchanged below

// Get personalized events for a user (basic version)

// Get personalized events for a user (basic version)
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
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), now),
          q.or(q.eq(q.field("status"), "approved"), q.eq(q.field("status"), undefined))
        )
      )
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
    const scoredEvents = filteredEvents.map((event) => {
      let score = 0;

      const categoryMatches = event.categories.filter((category) =>
        user.interests.includes(category)
      ).length;
      score += Math.min(40, categoryMatches * 15);

      const daysUntilEvent = (event.startDate - now) / (24 * 60 * 60 * 1000);
      if (daysUntilEvent <= 7) {
        score += 20 - daysUntilEvent * 2;
      } else if (daysUntilEvent <= 30) {
        score += 10 - daysUntilEvent * 0.3;
      }

      if (event.price.isFree) {
        score += 10;
      }

      if (event.organizer.verified || event.organizer.type === "university") {
        score += 10;
      }

      if (user.preferences?.maxDistance) {
        const isNearby =
          event.location.address.toLowerCase().includes("ubc") ||
          event.location.isVirtual;
        if (isNearby) {
          score += 10;
        }
      }

      if (event.rsvpCount > 0) {
        score += Math.min(10, event.rsvpCount / 5);
      }

      return { ...event, recommendationScore: Math.round(score) } as Doc<"events"> & {
        recommendationScore: number;
      };
    });

    const personalizedEvents = scoredEvents
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, args.limit || 20);

    // Resolve possible image storage IDs
    return await Promise.all(personalizedEvents.map((ev) => resolveImageUrls(ctx, ev)));
  },
});

export const getEventsNearLocation = query({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    radiusKm: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.gte(q.field("startDate"), Date.now()),
          q.or(q.eq(q.field("status"), "approved"), q.eq(q.field("status"), undefined))
        )
      )
      .order("asc")
      .take(args.limit || 50);

    const radiusKm = args.radiusKm || 25;
    const filteredEvents = events.filter((event) => {
      const lat1 = args.latitude;
      const lon1 = args.longitude;
      const lat2 = event.location.latitude;
      const lon2 = event.location.longitude;

      const R = 6371; // km
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

    return await Promise.all(filteredEvents.map((ev) => resolveImageUrls(ctx, ev)));
  },
});

export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(), // For authorization
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const canDelete =
      event.organizer.contactInfo === user.email ||
      event.organizer.name === user.name ||
      (event.organizer.type === "student" && event.organizer.contactInfo === user.email) ||
      user.preferences?.privacySettings?.profileVisible === true;

    if (!canDelete) {
      throw new Error("You don't have permission to delete this event");
    }

    const now = Date.now();
    if (event.startDate <= now) {
      throw new Error("Cannot delete events that have already started");
    }

    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const rsvp of rsvps) {
      await ctx.db.delete(rsvp._id);
    }

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const favorite of favorites) {
      await ctx.db.delete(favorite._id);
    }

    await ctx.db.delete(args.eventId);

    return { success: true, eventId: args.eventId };
  },
});

export const getEventsByOrganizer = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const allEvents = await ctx.db
      .query("events")
      .order("desc")
      .take(args.limit || 50);

    const organizerEvents = allEvents.filter(
      (event) =>
        event.organizer.contactInfo === user.email ||
        event.organizer.name === user.name ||
        (event.organizer.type === "student" &&
          event.organizer.contactInfo === user.email)
    );

    return await Promise.all(organizerEvents.map((ev) => resolveImageUrls(ctx, ev)));
  },
});

export const canEditEvent = query({
  args: {
    eventId: v.id("events"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return false;
    }

    const canEdit =
      event.organizer.contactInfo === user.email ||
      event.organizer.name === user.name ||
      (event.organizer.type === "student" &&
        event.organizer.contactInfo === user.email);

    return canEdit;
  },
});
