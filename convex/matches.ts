import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate compatibility score between two users
async function calculateMatchScore(ctx: any, user1: any, user2: any) {
  let score = 0;
  const reasons = [];
  const connectionDetails = {
    mutualFriends: 0,
    sharedInterests: 0,
    commonEvents: 0,
    universityMatch: false,
    yearMatch: false,
    locationProximity: undefined as number | undefined,
  };

  // 1. University match (20 points)
  if (user1.university === user2.university) {
    score += 20;
    connectionDetails.universityMatch = true;
    reasons.push(`Both study at ${user1.university}`);
  }

  // 2. Year match (10 points)
  if (user1.year === user2.year) {
    score += 10;
    connectionDetails.yearMatch = true;
    reasons.push(`Both are in ${user1.year}`);
  }

  // 3. Shared interests (up to 25 points)
  const user1Interests = user1.interests || [];
  const user2Interests = user2.interests || [];
  const sharedInterests = user1Interests.filter((interest: string) => 
    user2Interests.includes(interest)
  );
  connectionDetails.sharedInterests = sharedInterests.length;
  if (sharedInterests.length > 0) {
    const interestScore = Math.min(25, sharedInterests.length * 5);
    score += interestScore;
    if (sharedInterests.length === 1) {
      reasons.push(`Shared interest: ${sharedInterests[0]}`);
    } else {
      reasons.push(`${sharedInterests.length} shared interests`);
    }
  }

  // 4. Mutual friends (up to 30 points)
  const user1Friends = await getUserFriends(ctx, user1._id);
  const user2Friends = await getUserFriends(ctx, user2._id);
  const mutualFriends = user1Friends.filter((friendId: string) => 
    user2Friends.includes(friendId)
  );
  connectionDetails.mutualFriends = mutualFriends.length;
  if (mutualFriends.length > 0) {
    const friendScore = Math.min(30, mutualFriends.length * 10);
    score += friendScore;
    if (mutualFriends.length === 1) {
      reasons.push("1 mutual friend");
    } else {
      reasons.push(`${mutualFriends.length} mutual friends`);
    }
  }

  // 5. Common events (up to 15 points)
  const user1Events = await getUserEvents(ctx, user1._id);
  const user2Events = await getUserEvents(ctx, user2._id);
  const commonEvents = user1Events.filter((eventId: string) => 
    user2Events.includes(eventId)
  );
  connectionDetails.commonEvents = commonEvents.length;
  if (commonEvents.length > 0) {
    const eventScore = Math.min(15, commonEvents.length * 3);
    score += eventScore;
    if (commonEvents.length === 1) {
      reasons.push("Attended same event");
    } else {
      reasons.push(`${commonEvents.length} events in common`);
    }
  }

  // 6. Location proximity (up to 10 points)
  if (user1.location?.latitude && user1.location?.longitude && 
      user2.location?.latitude && user2.location?.longitude) {
    const distance = calculateDistance(
      user1.location.latitude, user1.location.longitude,
      user2.location.latitude, user2.location.longitude
    );
    connectionDetails.locationProximity = distance;
    
    if (distance < 5) {
      score += 10;
      reasons.push("Lives very close by");
    } else if (distance < 15) {
      score += 7;
      reasons.push("Lives nearby");
    } else if (distance < 50) {
      score += 3;
      reasons.push("Lives in the same area");
    }
  }

  return { score, reasons, connectionDetails };
}

// Helper function to get user's friend IDs
async function getUserFriends(ctx: any, userId: any) {
  const sentConnections = await ctx.db
    .query("friendConnections")
    .withIndex("by_requester", (q: any) => q.eq("requesterId", userId))
    .filter((q: any) => q.eq(q.field("status"), "accepted"))
    .collect();

  const receivedConnections = await ctx.db
    .query("friendConnections")
    .withIndex("by_receiver", (q: any) => q.eq("receiverId", userId))
    .filter((q: any) => q.eq(q.field("status"), "accepted"))
    .collect();

  const friendIds = [
    ...sentConnections.map((c: any) => c.receiverId),
    ...receivedConnections.map((c: any) => c.requesterId)
  ];

  return friendIds;
}

// Helper function to get user's event IDs
async function getUserEvents(ctx: any, userId: any) {
  const rsvps = await ctx.db
    .query("rsvps")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.eq(q.field("status"), "going"))
    .collect();

  return rsvps.map((rsvp: any) => rsvp.eventId);
}

// Generate match suggestions for a user
export const generateMatchSuggestions = mutation({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get all users except the current user and their existing friends
    const allUsers = await ctx.db.query("users").collect();
    const userFriends = await getUserFriends(ctx, args.userId);
    
    // Get only very recent suggestions to avoid immediate duplicates (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentSuggestions = await ctx.db
      .query("matchSuggestions")
      .withIndex("by_suggested_to", (q) => q.eq("suggestedToUserId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), oneDayAgo),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "viewed")
          )
        )
      )
      .collect();

    const recentSuggestedIds = new Set(recentSuggestions.map(s => s.suggestedUserId));

    // Filter potential matches
    const potentialMatches = allUsers.filter(otherUser => 
      otherUser._id !== args.userId && // Not self
      !userFriends.includes(otherUser._id) && // Not already friends
      !recentSuggestedIds.has(otherUser._id) && // Not recently suggested
      otherUser.preferences?.privacySettings?.showInBuddyMatching !== false // Respects privacy
    );

    // Calculate scores and create suggestions
    const scoredMatches = [];
    for (const otherUser of potentialMatches) {
      const { score, reasons, connectionDetails } = await calculateMatchScore(ctx, user, otherUser);
      
      // Only suggest if score is above threshold (15 points for broader matching)
      if (score >= 15) {
        scoredMatches.push({
          user: otherUser,
          score,
          reasons,
          connectionDetails,
        });
      }
    }

    // Sort by score and take top matches
    scoredMatches.sort((a, b) => b.score - a.score);
    const topMatches = scoredMatches.slice(0, limit);

    // If no high-scoring matches, try with a lower threshold
    if (topMatches.length === 0) {
      const lowScoreMatches = [];
      for (const otherUser of potentialMatches.slice(0, 5)) { // Check first 5 users
        const { score, reasons, connectionDetails } = await calculateMatchScore(ctx, user, otherUser);
        if (score >= 5) { // Very low threshold
          lowScoreMatches.push({
            user: otherUser,
            score,
            reasons: reasons.length > 0 ? reasons : ["New student connection"],
            connectionDetails,
          });
        }
      }
      lowScoreMatches.sort((a, b) => b.score - a.score);
      topMatches.push(...lowScoreMatches.slice(0, Math.min(3, lowScoreMatches.length)));
    }

    // Save suggestions to database
    const suggestions = [];
    for (const match of topMatches) {
      const suggestionId = await ctx.db.insert("matchSuggestions", {
        suggestedToUserId: args.userId,
        suggestedUserId: match.user._id,
        matchScore: match.score,
        reasons: match.reasons,
        status: "pending",
        createdAt: Date.now(),
        connectionDetails: match.connectionDetails,
      });

      suggestions.push({
        id: suggestionId,
        user: {
          id: match.user._id,
          name: match.user.name,
          university: match.user.university,
          year: match.user.year,
          interests: match.user.interests,
        },
        matchScore: match.score,
        reasons: match.reasons,
        connectionDetails: match.connectionDetails,
      });
    }

    return suggestions;
  },
});

// Debug function to understand matching issues
export const debugMatchingProcess = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Not authenticated" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return { error: "User not found" };
    }

    const allUsers = await ctx.db.query("users").collect();
    const userFriends = await getUserFriends(ctx, user._id);
    
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentSuggestions = await ctx.db
      .query("matchSuggestions")
      .withIndex("by_suggested_to", (q) => q.eq("suggestedToUserId", user._id))
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), oneDayAgo),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "viewed")
          )
        )
      )
      .collect();

    const potentialMatches = allUsers.filter(otherUser => 
      otherUser._id !== user._id && 
      !userFriends.includes(otherUser._id) && 
      !recentSuggestions.map(s => s.suggestedUserId).includes(otherUser._id) &&
      otherUser.preferences?.privacySettings?.showInBuddyMatching !== false
    );

    // Sample a few matches to see their scores
    const sampleScores = [];
    for (let i = 0; i < Math.min(5, potentialMatches.length); i++) {
      const { score, reasons } = await calculateMatchScore(ctx, user, potentialMatches[i]);
      sampleScores.push({
        name: potentialMatches[i].name,
        score,
        reasons,
      });
    }

    return {
      totalUsers: allUsers.length,
      userFriendsCount: userFriends.length,
      recentSuggestionsCount: recentSuggestions.length,
      potentialMatchesCount: potentialMatches.length,
      userInterests: user.interests?.length || 0,
      userUniversity: user.university,
      sampleScores,
    };
  },
});

// Get match suggestions for a user
export const getMatchSuggestions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const limit = args.limit || 10;

    // Get pending AND viewed suggestions, ordered by creation date (most recent first)
    const suggestions = await ctx.db
      .query("matchSuggestions")
      .withIndex("by_suggested_to", (q) => q.eq("suggestedToUserId", user._id))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "viewed")
        )
      )
      .order("desc")
      .take(limit);

    // Get user details for each suggestion
    const suggestionsWithUsers = await Promise.all(
      suggestions.map(async (suggestion) => {
        const suggestedUser = await ctx.db.get(suggestion.suggestedUserId);
        return {
          id: suggestion._id,
          user: suggestedUser ? {
            id: suggestedUser._id,
            name: suggestedUser.name,
            university: suggestedUser.university,
            year: suggestedUser.year,
            interests: suggestedUser.interests,
          } : null,
          matchScore: suggestion.matchScore,
          reasons: suggestion.reasons,
          connectionDetails: suggestion.connectionDetails,
          createdAt: suggestion.createdAt,
        };
      })
    );

    return suggestionsWithUsers.filter(s => s.user !== null);
  },
});

// Accept a match suggestion
export const acceptMatch = mutation({
  args: {
    suggestionId: v.id("matchSuggestions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion || suggestion.suggestedToUserId !== user._id) {
      throw new Error("Suggestion not found");
    }

    // Update suggestion status
    await ctx.db.patch(args.suggestionId, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    // Record interaction
    await ctx.db.insert("matchInteractions", {
      fromUserId: user._id,
      toUserId: suggestion.suggestedUserId,
      action: "accepted",
      suggestionId: args.suggestionId,
      timestamp: Date.now(),
      metadata: {
        source: "match_suggestion",
      },
    });

    // Automatically send friend request
    const suggestedUser = await ctx.db.get(suggestion.suggestedUserId);
    if (!suggestedUser) {
      throw new Error("Suggested user not found");
    }

    // Check if friend request already exists
    const existingConnection = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester_receiver", (q) =>
        q.eq("requesterId", user._id).eq("receiverId", suggestion.suggestedUserId)
      )
      .unique();

    if (!existingConnection) {
      // Create friend request
      const connectionId = await ctx.db.insert("friendConnections", {
        requesterId: user._id,
        receiverId: suggestion.suggestedUserId,
        status: "pending",
        createdAt: Date.now(),
      });

      // Record friend request interaction
      await ctx.db.insert("matchInteractions", {
        fromUserId: user._id,
        toUserId: suggestion.suggestedUserId,
        action: "friend_request_sent",
        suggestionId: args.suggestionId,
        timestamp: Date.now(),
        metadata: {
          source: "match_suggestion",
        },
      });

      // Create conversation for the matched users
      const conversationId = await ctx.db.insert("conversations", {
        participantIds: [user._id, suggestion.suggestedUserId].sort(),
        type: "direct",
        lastMessageAt: Date.now(),
        createdAt: Date.now(),
        metadata: {
          initiatedBy: user._id,
          initiatedVia: "match_accept",
          matchId: args.suggestionId,
        },
      });

      // Send welcome system message
      await ctx.db.insert("messages", {
        conversationId,
        senderId: user._id,
        content: {
          text: `${user.name} accepted your match! Start chatting to get to know each other better.`,
          type: "system",
          metadata: {
            systemAction: "match_accepted",
          },
        },
        sentAt: Date.now(),
        readBy: [],
        isEncrypted: false,
      });

      return { connectionId, conversationId, message: "Match accepted! Friend request sent and conversation started." };
    }

    return { message: "Match accepted!" };
  },
});

// Reject a match suggestion
export const rejectMatch = mutation({
  args: {
    suggestionId: v.id("matchSuggestions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion || suggestion.suggestedToUserId !== user._id) {
      throw new Error("Suggestion not found");
    }

    // Update suggestion status
    await ctx.db.patch(args.suggestionId, {
      status: "rejected",
      respondedAt: Date.now(),
    });

    // Record interaction
    await ctx.db.insert("matchInteractions", {
      fromUserId: user._id,
      toUserId: suggestion.suggestedUserId,
      action: "rejected",
      suggestionId: args.suggestionId,
      timestamp: Date.now(),
      metadata: {
        reason: args.reason,
        source: "match_suggestion",
      },
    });

    return { message: "Match dismissed" };
  },
});

// Mark suggestions as viewed
export const markSuggestionsViewed = mutation({
  args: {
    suggestionIds: v.array(v.id("matchSuggestions")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    // Update all suggestions to viewed status
    for (const suggestionId of args.suggestionIds) {
      const suggestion = await ctx.db.get(suggestionId);
      if (suggestion && suggestion.suggestedToUserId === user._id && suggestion.status === "pending") {
        await ctx.db.patch(suggestionId, {
          status: "viewed",
          viewedAt: now,
        });

        // Record view interaction
        await ctx.db.insert("matchInteractions", {
          fromUserId: user._id,
          toUserId: suggestion.suggestedUserId,
          action: "viewed",
          suggestionId: suggestionId,
          timestamp: now,
          metadata: {
            source: "match_suggestion",
          },
        });
      }
    }

    return { message: "Suggestions marked as viewed" };
  },
});

// Get match statistics for a user
export const getMatchStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    const [totalSuggestions, acceptedSuggestions, rejectedSuggestions, connections] = await Promise.all([
      ctx.db
        .query("matchSuggestions")
        .withIndex("by_suggested_to", (q) => q.eq("suggestedToUserId", user._id))
        .collect(),
      ctx.db
        .query("matchSuggestions")
        .withIndex("by_suggested_to_status", (q) => 
          q.eq("suggestedToUserId", user._id).eq("status", "accepted")
        )
        .collect(),
      ctx.db
        .query("matchSuggestions")
        .withIndex("by_suggested_to_status", (q) => 
          q.eq("suggestedToUserId", user._id).eq("status", "rejected")
        )
        .collect(),
      ctx.db
        .query("matchSuggestions")
        .withIndex("by_suggested_to_status", (q) => 
          q.eq("suggestedToUserId", user._id).eq("status", "connected")
        )
        .collect(),
    ]);

    return {
      totalSuggestions: totalSuggestions.length,
      acceptedSuggestions: acceptedSuggestions.length,
      rejectedSuggestions: rejectedSuggestions.length,
      successfulConnections: connections.length,
      successRate: totalSuggestions.length > 0 
        ? (connections.length / totalSuggestions.length) * 100 
        : 0,
    };
  },
});
