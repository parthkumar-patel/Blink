import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    email: v.string(),
    name: v.string(),
    university: v.string(),
    year: v.union(
      v.literal("freshman"),
      v.literal("sophomore"),
      v.literal("junior"),
      v.literal("senior"),
      v.literal("graduate")
    ),
    interests: v.array(v.string()),
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        address: v.string(),
      })
    ),
    preferences: v.object({
      maxDistance: v.number(),
      notificationSettings: v.object({
        email: v.boolean(),
        push: v.boolean(),
        sms: v.boolean(),
      }),
      privacySettings: v.object({
        profileVisible: v.boolean(),
        showInBuddyMatching: v.boolean(),
      }),
      buddyMatchingEnabled: v.boolean(),
    }),
    lastActiveAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_university", ["university"])
    .searchIndex("search_users", {
      searchField: "name",
      filterFields: ["university", "year"],
    }),

  events: defineTable({
    title: v.string(),
    description: v.string(),
    aiSummary: v.optional(v.string()),
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
    tags: v.array(v.string()),
    capacity: v.optional(v.number()),
    price: v.object({
      amount: v.number(),
      currency: v.string(),
      isFree: v.boolean(),
    }),
    images: v.array(v.string()),
    externalLinks: v.object({
      registration: v.optional(v.string()),
      website: v.optional(v.string()),
      social: v.optional(v.array(v.string())),
    }),
    source: v.object({
      platform: v.string(),
      originalId: v.string(),
      url: v.string(),
    }),
    rsvpCount: v.number(),
    attendanceCount: v.optional(v.number()),
  })
    .index("by_start_date", ["startDate"])
    .index("by_categories", ["categories"])
    .index("by_location", ["location.latitude", "location.longitude"])
    .searchIndex("search_events", {
      searchField: "title",
      filterFields: ["categories", "startDate", "organizer.type"],
    })
    .searchIndex("search_events_full", {
      searchField: "description",
      filterFields: ["categories", "startDate", "organizer.type"],
    }),

  rsvps: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    status: v.union(
      v.literal("going"),
      v.literal("interested"),
      v.literal("not_going")
    ),
    buddyMatchingEnabled: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

  buddyMatches: defineTable({
    eventId: v.id("events"),
    user1Id: v.id("users"),
    user2Id: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    matchScore: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_user1", ["user1Id"])
    .index("by_user2", ["user2Id"]),

  favorites: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),

  clubs: defineTable({
    name: v.string(),
    description: v.string(),
    amsUrl: v.string(),
    websiteUrl: v.optional(v.string()),
    socialMedia: v.object({
      instagram: v.optional(v.string()),
      facebook: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      twitter: v.optional(v.string()),
    }),
    contact: v.object({
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),
    location: v.optional(
      v.object({
        address: v.string(),
        room: v.optional(v.string()),
        building: v.optional(v.string()),
      })
    ),
    image: v.optional(v.string()),
    categories: v.array(v.string()),
    isActive: v.boolean(),
    lastScrapedAt: v.number(),
    scrapedData: v.optional(
      v.object({
        rawHtml: v.optional(v.string()),
        extractedText: v.optional(v.string()),
      })
    ),
  })
    .index("by_name", ["name"])
    .index("by_ams_url", ["amsUrl"])
    .index("by_categories", ["categories"])
    .searchIndex("search_clubs", {
      searchField: "name",
      filterFields: ["categories", "isActive"],
    }),

  searchHistory: defineTable({
    userId: v.id("users"),
    query: v.string(),
    resultsCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "createdAt"]),

  savedSearches: defineTable({
    userId: v.id("users"),
    name: v.string(),
    query: v.string(),
    filters: v.object({
      categories: v.optional(v.array(v.string())),
      dateRange: v.optional(v.object({
        start: v.optional(v.number()),
        end: v.optional(v.number()),
      })),
      priceFilter: v.optional(v.string()),
      locationFilter: v.optional(v.string()),
      distanceFilter: v.optional(v.number()),
    }),
    createdAt: v.number(),
    lastUsed: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),
});
