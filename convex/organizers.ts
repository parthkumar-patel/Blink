import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Initialize organizer verification for a user
export const initializeOrganizerVerification = mutation({
  args: {
    organizationName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Update user with organizer verification request
    return await ctx.db.patch(user._id, {
      organizerVerification: {
        status: "pending",
        organizationName: args.organizationName,
        requestedAt: Date.now(),
      },
    });
  },
});

// Get organizer profile (from user's organizerVerification)
export const getOrganizerProfile = query({
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

    // Return user data with organizer info
    return {
      ...user,
      isOrganizer: !!user.organizerVerification,
      verificationStatus: user.organizerVerification?.status || "unverified",
    };
  },
});

// Approve organizer verification (admin only)
export const approveOrganizerVerification = mutation({
  args: {
    userId: v.id("users"),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user to check admin status
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // For now, allow any authenticated user to approve (can add admin check later)
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    // Get the user to approve
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.organizerVerification) {
      throw new Error("No verification request found");
    }

    // Update verification status
    await ctx.db.patch(user._id, {
      organizerVerification: {
        ...user.organizerVerification,
        status: "verified",
        reviewedAt: Date.now(),
        reviewerId: currentUser._id,
        notes: args.reviewNotes,
      },
    });

    return { success: true };
  },
});

// Reject organizer verification (admin only)
export const rejectOrganizerVerification = mutation({
  args: {
    userId: v.id("users"),
    rejectionReason: v.string(),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user to check admin status
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // For now, allow any authenticated user to reject (can add admin check later)
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    // Get the user to reject
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.organizerVerification) {
      throw new Error("No verification request found");
    }

    // Update verification status
    await ctx.db.patch(user._id, {
      organizerVerification: {
        ...user.organizerVerification,
        status: "rejected",
        reviewedAt: Date.now(),
        reviewerId: currentUser._id,
        notes: `${args.rejectionReason}${args.reviewNotes ? ` - ${args.reviewNotes}` : ''}`,
      },
    });

    return { success: true };
  },
});

// Get pending organizer verification requests
export const getPendingVerifications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user to check admin status
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // For now, allow any authenticated user to see pending (can add admin check later)
    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    // Get all users with pending verification
    const allUsers = await ctx.db.query("users").collect();
    
    return allUsers.filter(user => 
      user.organizerVerification?.status === "pending"
    );
  },
});

// Get organizer analytics
export const getOrganizerAnalytics = query({
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

    if (!user || !user.organizerVerification) {
      return null;
    }

    // Get events created by this organizer
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("submittedBy"), user._id))
      .collect();

    // Calculate basic analytics
    const totalEvents = events.length;
    const approvedEvents = events.filter(e => e.status === "approved").length;
    const totalRSVPs = events.reduce((sum, event) => sum + event.rsvpCount, 0);
    const totalViews = events.length * 50; // Mock data for now
    
    // Calculate attendance rate (mock for now)
    const totalAttendance = events.reduce((sum, event) => sum + (event.attendanceCount || 0), 0);
    const attendanceRate = totalRSVPs > 0 ? (totalAttendance / totalRSVPs) * 100 : 0;

    return {
      totalEvents,
      approvedEvents,
      totalRSVPs,
      totalViews,
      attendanceRate: Math.round(attendanceRate),
      recentEvents: events
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5)
        .map(event => ({
          id: event._id,
          title: event.title,
          status: event.status || "approved",
          rsvpCount: event.rsvpCount,
          startDate: event.startDate,
        })),
    };
  },
});
