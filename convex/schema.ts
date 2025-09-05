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

  attendances: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    confirmedAt: v.number(),
    confirmationMethod: v.union(
      v.literal("manual"), // User manually confirmed
      v.literal("organizer"), // Organizer marked them as attended
      v.literal("automatic") // System detected attendance (future: QR codes, location, etc.)
    ),
    rating: v.optional(v.number()), // 1-5 star rating of the event
    feedback: v.optional(v.string()), // Optional feedback about the event
    wouldRecommend: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_confirmed_date", ["confirmedAt"]),

  groupRSVPs: defineTable({
    name: v.string(), // Group name like "Study buddies" or "CS friends"
    description: v.optional(v.string()),
    eventId: v.id("events"),
    organizerId: v.id("users"), // Who created the group
    isPublic: v.boolean(), // Whether others can discover and join
    maxMembers: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_organizer", ["organizerId"])
    .index("by_public", ["isPublic"])
    .index("by_event_public", ["eventId", "isPublic"]),

  groupMembers: defineTable({
    groupId: v.id("groupRSVPs"),
    userId: v.id("users"),
    role: v.union(
      v.literal("organizer"),
      v.literal("member")
    ),
    joinedAt: v.number(),
    invitedBy: v.optional(v.id("users")),
    status: v.union(
      v.literal("pending"), // Invited but not yet accepted
      v.literal("accepted"), // Active member
      v.literal("declined"), // Declined invitation
      v.literal("left") // Left the group
    ),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"])
    .index("by_group_status", ["groupId", "status"]),

  friendConnections: defineTable({
    requesterId: v.id("users"), // Who sent the friend request
    receiverId: v.id("users"), // Who received it
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("blocked")
    ),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_requester", ["requesterId"])
    .index("by_receiver", ["receiverId"])
    .index("by_status", ["status"])
    .index("by_requester_receiver", ["requesterId", "receiverId"]),

  // Match suggestions for mutual connection detection
  matchSuggestions: defineTable({
    suggestedToUserId: v.id("users"), // User who will see the suggestion
    suggestedUserId: v.id("users"),   // User being suggested
    matchScore: v.number(),           // Compatibility score (0-100)
    reasons: v.array(v.string()),     // Why they match (mutual friends, interests, etc.)
    status: v.union(
      v.literal("pending"),           // Not yet seen/acted upon
      v.literal("viewed"),            // Seen but no action taken
      v.literal("accepted"),          // User wants to connect
      v.literal("rejected"),          // User dismissed the match
      v.literal("connected")          // Successfully became friends
    ),
    createdAt: v.number(),
    viewedAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    connectionDetails: v.object({
      mutualFriends: v.number(),
      sharedInterests: v.number(),
      commonEvents: v.number(),
      universityMatch: v.boolean(),
      yearMatch: v.boolean(),
      locationProximity: v.optional(v.number()), // Distance in km
    }),
  })
    .index("by_suggested_to", ["suggestedToUserId"])
    .index("by_suggested_user", ["suggestedUserId"])
    .index("by_status", ["status"])
    .index("by_score", ["matchScore"])
    .index("by_suggested_to_status", ["suggestedToUserId", "status"])
    .index("by_created_date", ["createdAt"]),

  // Match interactions history
  matchInteractions: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    action: v.union(
      v.literal("viewed"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("friend_request_sent"),
      v.literal("connection_established")
    ),
    suggestionId: v.optional(v.id("matchSuggestions")),
    timestamp: v.number(),
    metadata: v.optional(v.object({
      reason: v.optional(v.string()),
      source: v.optional(v.string()), // "match_suggestion", "search", "manual"
    })),
  })
    .index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"])
    .index("by_action", ["action"])
    .index("by_suggestion", ["suggestionId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_from_to", ["fromUserId", "toUserId"]),
});
