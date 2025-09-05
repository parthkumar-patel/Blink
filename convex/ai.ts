import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

// Enhanced recommendation system with AI explanations
export const getEnhancedRecommendations = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    const now = Date.now();

    // Get user preferences
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return [];
    }

    // Get user's RSVP history for behavioral analysis
    const userRSVPs = await ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get user's favorited events for preference analysis
    const userFavorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get upcoming events
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_start_date")
      .filter((q) => q.gte(q.field("startDate"), now))
      .take(200); // Get more events for better recommendations

    // Get events user has attended or favorited for similarity analysis
    const attendedEventIds = new Set(userRSVPs.map(rsvp => rsvp.eventId));
    const favoritedEventIds = new Set(userFavorites.map(fav => fav.eventId));
    
    const engagedEvents = await Promise.all([
      ...Array.from(attendedEventIds).slice(0, 10).map(id => ctx.db.get(id)),
      ...Array.from(favoritedEventIds).slice(0, 10).map(id => ctx.db.get(id))
    ]);
    
    const validEngagedEvents = engagedEvents.filter(Boolean);

    // Calculate enhanced recommendation scores
    const scoredEvents = allEvents.map((event) => {
      const score = calculateEnhancedRecommendationScore(event, user, validEngagedEvents, userRSVPs);
      return {
        ...event,
        recommendationScore: score,
        matchedInterests: getMatchedInterests(event, user.interests),
        reasonsToAttend: generateRecommendationReasons(event, user, validEngagedEvents),
      };
    });

    // Sort by recommendation score and apply pagination
    const sortedEvents = scoredEvents
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
    
    const paginatedEvents = sortedEvents.slice(offset, offset + limit);

    return paginatedEvents;
  },
});

// Internal queries and mutations
export const getEventForSummary = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

export const getEventsWithoutSummaries = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("aiSummary"), undefined))
      .take(args.limit || 10);
  },
});

export const updateEventSummary = internalMutation({
  args: {
    eventId: v.id("events"),
    aiSummary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      aiSummary: args.aiSummary,
    });
  },
});

// Helper functions
function calculateRecommendationScore(event: any, user: any): number {
  let score = 0;

  // Interest matching (40% of score)
  const matchedInterests = getMatchedInterests(event, user.interests);
  const interestScore =
    matchedInterests.length / Math.max(user.interests.length, 1);
  score += interestScore * 0.4;

  // Time relevance (20% of score)
  const now = Date.now();
  const eventTime = event.startDate;
  const daysUntilEvent = (eventTime - now) / (24 * 60 * 60 * 1000);

  let timeScore = 0;
  if (daysUntilEvent >= 0 && daysUntilEvent <= 7) {
    timeScore = 1; // Perfect for events in the next week
  } else if (daysUntilEvent > 7 && daysUntilEvent <= 30) {
    timeScore = 0.8; // Good for events in the next month
  } else if (daysUntilEvent > 30) {
    timeScore = 0.5; // Lower for distant events
  }
  score += timeScore * 0.2;

  // Location relevance (15% of score)
  let locationScore = 0.5; // Default score
  if (user.location && event.location) {
    const distance = calculateDistance(
      user.location.latitude,
      user.location.longitude,
      event.location.latitude,
      event.location.longitude
    );

    if (distance <= user.preferences.maxDistance) {
      locationScore = 1 - (distance / user.preferences.maxDistance) * 0.5;
    } else {
      locationScore = 0.2;
    }
  }
  score += locationScore * 0.15;

  // Event popularity (10% of score)
  const popularityScore = Math.min(event.rsvpCount / 100, 1); // Normalize to 0-1
  score += popularityScore * 0.1;

  // Free events bonus (10% of score)
  const priceScore = event.price.isFree ? 1 : 0.5;
  score += priceScore * 0.1;

  // Verified organizer bonus (5% of score)
  const verifiedScore = event.organizer.verified ? 1 : 0.5;
  score += verifiedScore * 0.05;

  return Math.min(score, 1); // Cap at 1.0
}

function getMatchedInterests(event: any, userInterests: string[]): string[] {
  return event.categories.filter((category: string) =>
    userInterests.includes(category)
  );
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
  return R * c;
}

// Enhanced recommendation scoring algorithm
function calculateEnhancedRecommendationScore(
  event: any, 
  user: any, 
  engagedEvents: any[], 
  userRSVPs: any[]
): number {
  let score = 0;

  // 1. Interest matching (25% of score)
  const matchedInterests = getMatchedInterests(event, user.interests);
  const interestScore = Math.min(matchedInterests.length / Math.max(user.interests.length, 1), 1);
  score += interestScore * 0.25;

  // 2. Category affinity based on past behavior (20% of score)
  const categoryAffinityScore = calculateCategoryAffinity(event, engagedEvents);
  score += categoryAffinityScore * 0.20;

  // 3. Semantic similarity to engaged events (15% of score)
  const semanticScore = calculateSemanticSimilarity(event, engagedEvents);
  score += semanticScore * 0.15;

  // 4. Time preferences (15% of score)
  const timeScore = calculateTimePreference(event, userRSVPs);
  score += timeScore * 0.15;

  // 5. Social signals and popularity (10% of score)
  const popularityScore = Math.min(event.rsvpCount / 100, 1);
  score += popularityScore * 0.10;

  // 6. Location relevance (10% of score)
  let locationScore = 0.5;
  if (user.location && event.location) {
    const distance = calculateDistance(
      user.location.latitude,
      user.location.longitude,
      event.location.latitude,
      event.location.longitude
    );
    locationScore = user.preferences?.maxDistance ? 
      Math.max(0, 1 - (distance / user.preferences.maxDistance)) : 0.7;
  }
  score += locationScore * 0.10;

  // 7. Organizer credibility (3% of score)
  const organizerScore = event.organizer.verified ? 1 : 0.7;
  score += organizerScore * 0.03;

  // 8. Price preference (2% of score)
  const priceScore = event.price.isFree ? 1 : 0.6;
  score += priceScore * 0.02;

  // Bonus factors
  // Recent engagement bonus
  if (hasRecentSimilarEngagement(event, engagedEvents)) {
    score += 0.1;
  }

  // Trending event bonus
  if (isTrendingEvent(event)) {
    score += 0.05;
  }

  // Time until event (prefer events 3-14 days out)
  const daysUntilEvent = (event.startDate - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysUntilEvent >= 3 && daysUntilEvent <= 14) {
    score += 0.05;
  }

  return Math.min(score, 1); // Cap at 1.0
}

// Calculate category affinity based on past behavior
function calculateCategoryAffinity(event: any, engagedEvents: any[]): number {
  if (engagedEvents.length === 0) return 0.5;

  const engagedCategories = engagedEvents.flatMap(e => e?.categories || []);
  const categoryFrequency: Record<string, number> = {};
  
  engagedCategories.forEach(cat => {
    categoryFrequency[cat] = (categoryFrequency[cat] || 0) + 1;
  });

  const eventCategoryScores = event.categories.map((category: string) => {
    return (categoryFrequency[category] || 0) / engagedCategories.length;
  });

  return eventCategoryScores.length > 0 ? Math.max(...eventCategoryScores) : 0;
}

// Calculate semantic similarity between events
function calculateSemanticSimilarity(event: any, engagedEvents: any[]): number {
  if (engagedEvents.length === 0) return 0.5;

  // Simple keyword-based similarity (in production, use embeddings)
  const eventKeywords = extractKeywords(event.title + ' ' + event.description);
  
  const similarityScores = engagedEvents.map(engagedEvent => {
    if (!engagedEvent) return 0;
    const engagedKeywords = extractKeywords(engagedEvent.title + ' ' + engagedEvent.description);
    return calculateKeywordSimilarity(eventKeywords, engagedKeywords);
  });

  return similarityScores.length > 0 ? Math.max(...similarityScores) : 0;
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
  
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 20); // Limit to top 20 keywords
}

// Calculate keyword similarity between two sets
function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size; // Jaccard similarity
}

// Calculate time preference based on past RSVP patterns
function calculateTimePreference(event: any, userRSVPs: any[]): number {
  if (userRSVPs.length === 0) return 0.7;

  const eventTime = new Date(event.startDate);
  const eventHour = eventTime.getHours();
  const eventDay = eventTime.getDay(); // 0 = Sunday, 6 = Saturday

  // Analyze user's preferred times
  const preferredHours = userRSVPs
    .map(rsvp => new Date(rsvp.createdAt || Date.now()).getHours())
    .reduce((acc: Record<number, number>, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

  const preferredDays = userRSVPs
    .map(rsvp => new Date(rsvp.createdAt || Date.now()).getDay())
    .reduce((acc: Record<number, number>, day) => {
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

  const hourScore = (preferredHours[eventHour] || 0) / userRSVPs.length;
  const dayScore = (preferredDays[eventDay] || 0) / userRSVPs.length;

  return (hourScore + dayScore) / 2;
}

// Check if user has recent similar engagement
function hasRecentSimilarEngagement(event: any, engagedEvents: any[]): boolean {
  const recentCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
  
  return engagedEvents.some(engagedEvent => {
    if (!engagedEvent || !engagedEvent._creationTime || engagedEvent._creationTime < recentCutoff) {
      return false;
    }
    
    // Check for category overlap
    return event.categories.some((cat: string) => 
      engagedEvent.categories?.includes(cat)
    );
  });
}

// Check if event is trending (high RSVP rate)
function isTrendingEvent(event: any): boolean {
  const now = Date.now();
  const eventAge = now - (event._creationTime || now);
  const daysSinceCreated = eventAge / (24 * 60 * 60 * 1000);
  
  // Consider trending if it has high RSVPs relative to how long it's existed
  const rsvpRate = daysSinceCreated > 0 ? event.rsvpCount / daysSinceCreated : 0;
  return rsvpRate > 5; // More than 5 RSVPs per day on average
}

// Generate recommendation reasons
function generateRecommendationReasons(event: any, user: any, engagedEvents: any[]): string[] {
  const reasons: string[] = [];

  // Interest matching
  const matchedInterests = getMatchedInterests(event, user.interests);
  if (matchedInterests.length > 0) {
    reasons.push(`Matches your interests: ${matchedInterests.slice(0, 2).join(', ')}`);
  }

  // Similar to past events
  const similarCategories = engagedEvents
    .flatMap(e => e?.categories || [])
    .filter(cat => event.categories.includes(cat));
  
  if (similarCategories.length > 0) {
    const uniqueCategories = [...new Set(similarCategories)];
    reasons.push(`Similar to events you've enjoyed in ${uniqueCategories[0]}`);
  }

  // Timing
  const daysUntilEvent = (event.startDate - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysUntilEvent <= 7) {
    reasons.push('Happening soon');
  }

  // Popular
  if (event.rsvpCount > 20) {
    reasons.push(`${event.rsvpCount} people are going`);
  }

  // Free
  if (event.price.isFree) {
    reasons.push('Free event');
  }

  // Location
  if (event.location.isVirtual) {
    reasons.push('Virtual - join from anywhere');
  } else if (event.location.name.toLowerCase().includes('ubc')) {
    reasons.push('On campus at UBC');
  }

  return reasons.slice(0, 3); // Limit to top 3 reasons
}