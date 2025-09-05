import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Confirm attendance for an event (user self-reports)
export const confirmAttendance = mutation({
  args: {
    eventId: v.id("events"),
    rating: v.optional(v.number()),
    feedback: v.optional(v.string()),
    wouldRecommend: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Get event to verify it has ended
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const now = Date.now();
    if (event.endDate > now) {
      throw new Error("Cannot confirm attendance for events that haven't ended yet");
    }

    // Check if user had RSVP'd to this event (get most recent RSVP if multiple exist)
    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .order("desc")
      .first();

    if (!rsvp || rsvp.status === "not_going") {
      throw new Error("You must have RSVP'd as going or interested to confirm attendance");
    }

    // Check if attendance already confirmed
    const existingAttendance = await ctx.db
      .query("attendances")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .first();

    if (existingAttendance) {
      // Update existing attendance
      await ctx.db.patch(existingAttendance._id, {
        rating: args.rating,
        feedback: args.feedback,
        wouldRecommend: args.wouldRecommend,
      });
      return existingAttendance._id;
    } else {
      // Create new attendance record
      const attendanceId = await ctx.db.insert("attendances", {
        userId: user._id,
        eventId: args.eventId,
        confirmedAt: now,
        confirmationMethod: "manual",
        rating: args.rating,
        feedback: args.feedback,
        wouldRecommend: args.wouldRecommend,
      });

      // Update event attendance count
      await updateEventAttendanceCount(ctx, args.eventId);

      return attendanceId;
    }
  },
});

// Get user's attendance history
export const getUserAttendanceHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attendances = await ctx.db
      .query("attendances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);

    // Get event details for each attendance
    const attendancesWithEvents = await Promise.all(
      attendances.map(async (attendance) => {
        const event = await ctx.db.get(attendance.eventId);
        return {
          ...attendance,
          event,
        };
      })
    );

    return attendancesWithEvents.filter(item => item.event !== null);
  },
});

// Get attendance for a specific event
export const getEventAttendance = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const attendances = await ctx.db
      .query("attendances")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get user info for each attendance (respecting privacy)
    const attendancesWithUsers = await Promise.all(
      attendances.map(async (attendance) => {
        const user = await ctx.db.get(attendance.userId);
        if (!user || !user.preferences.privacySettings.profileVisible) {
          return {
            ...attendance,
            user: null,
          };
        }
        return {
          ...attendance,
          user: {
            id: user._id,
            name: user.name,
            university: user.university,
            year: user.year,
          },
        };
      })
    );

    return attendancesWithUsers;
  },
});

// Get attendance analytics for an event (for organizers)
export const getEventAttendanceAnalytics = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get all RSVPs for this event
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get all attendances for this event
    const attendances = await ctx.db
      .query("attendances")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const goingRSVPs = rsvps.filter(r => r.status === "going").length;
    const interestedRSVPs = rsvps.filter(r => r.status === "interested").length;
    const actualAttendees = attendances.length;

    // Calculate ratings
    const ratingsData = attendances
      .filter(a => a.rating !== undefined)
      .map(a => a.rating!);
    
    const averageRating = ratingsData.length > 0 
      ? ratingsData.reduce((sum, rating) => sum + rating, 0) / ratingsData.length 
      : null;

    const recommendationData = attendances
      .filter(a => a.wouldRecommend !== undefined)
      .map(a => a.wouldRecommend!);
    
    const recommendationRate = recommendationData.length > 0
      ? recommendationData.filter(Boolean).length / recommendationData.length
      : null;

    return {
      totalRSVPs: rsvps.length,
      goingRSVPs,
      interestedRSVPs,
      actualAttendees,
      attendanceRate: goingRSVPs > 0 ? actualAttendees / goingRSVPs : 0,
      showUpRate: (goingRSVPs + interestedRSVPs) > 0 ? actualAttendees / (goingRSVPs + interestedRSVPs) : 0,
      averageRating,
      ratingsCount: ratingsData.length,
      recommendationRate,
      feedbackCount: attendances.filter(a => a.feedback && a.feedback.trim()).length,
    };
  },
});

// Mark users as attended (for organizers)
export const markUsersAttended = mutation({
  args: {
    eventId: v.id("events"),
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user
    const organizer = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!organizer) {
      throw new Error("User not found");
    }

    // Get event and verify organizer permissions
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Simple authorization check (can be expanded)
    const canMarkAttendance = 
      event.organizer.contactInfo === organizer.email ||
      event.organizer.name === organizer.name;

    if (!canMarkAttendance) {
      throw new Error("You don't have permission to mark attendance for this event");
    }

    const now = Date.now();
    const attendanceIds = [];

    // Mark each user as attended
    for (const userId of args.userIds) {
      // Check if already marked as attended
      const existingAttendance = await ctx.db
        .query("attendances")
        .withIndex("by_user_event", (q) =>
          q.eq("userId", userId).eq("eventId", args.eventId)
        )
        .first();

      if (!existingAttendance) {
        const attendanceId = await ctx.db.insert("attendances", {
          userId,
          eventId: args.eventId,
          confirmedAt: now,
          confirmationMethod: "organizer",
        });
        attendanceIds.push(attendanceId);
      }
    }

    // Update event attendance count
    await updateEventAttendanceCount(ctx, args.eventId);

    return attendanceIds;
  },
});

// Get events that user can confirm attendance for
export const getEventsForAttendanceConfirmation = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Get user's RSVPs for events that have ended in the last week
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "going"),
          q.eq(q.field("status"), "interested")
        )
      )
      .collect();

    // Get events and filter for recently ended ones
    const eventsToConfirm = [];
    
    for (const rsvp of rsvps) {
      const event = await ctx.db.get(rsvp.eventId);
      
      if (event && 
          event.endDate < now && // Event has ended
          event.endDate > oneWeekAgo) { // But ended within the last week
        
        // Check if attendance not already confirmed
        const existingAttendance = await ctx.db
          .query("attendances")
          .withIndex("by_user_event", (q) =>
            q.eq("userId", user._id).eq("eventId", event._id)
          )
          .first();

        if (!existingAttendance) {
          eventsToConfirm.push({
            ...event,
            rsvpStatus: rsvp.status,
          });
        }
      }
    }

    return eventsToConfirm;
  },
});

// Helper function to update event attendance count
async function updateEventAttendanceCount(ctx: any, eventId: any) {
  const attendances = await ctx.db
    .query("attendances")
    .withIndex("by_event", (q: any) => q.eq("eventId", eventId))
    .collect();

  await ctx.db.patch(eventId, {
    attendanceCount: attendances.length,
  });
}

// Get user's attendance stats
export const getUserAttendanceStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all user's attendances
    const attendances = await ctx.db
      .query("attendances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get all user's RSVPs
    const rsvps = await ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "going"),
          q.eq(q.field("status"), "interested")
        )
      )
      .collect();

    // Calculate stats
    const totalEventsAttended = attendances.length;
    const totalRSVPs = rsvps.length;
    const attendanceRate = totalRSVPs > 0 ? totalEventsAttended / totalRSVPs : 0;

    // Calculate average rating given
    const ratingsGiven = attendances.filter(a => a.rating !== undefined);
    const averageRatingGiven = ratingsGiven.length > 0 
      ? ratingsGiven.reduce((sum, a) => sum + a.rating!, 0) / ratingsGiven.length 
      : null;

    // Get recent attendances (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentAttendances = attendances.filter(a => a.confirmedAt > thirtyDaysAgo);

    return {
      totalEventsAttended,
      totalRSVPs,
      attendanceRate,
      averageRatingGiven,
      recentAttendances: recentAttendances.length,
      feedbackGiven: attendances.filter(a => a.feedback && a.feedback.trim()).length,
    };
  },
});
