import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a group RSVP for an event
export const createGroupRSVP = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    maxMembers: v.optional(v.number()),
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

    // Verify event exists
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if user already has RSVP'd to this event (requirement for creating group)
    const userRSVP = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (!userRSVP || userRSVP.status === "not_going") {
      throw new Error("You must RSVP to the event before creating a group");
    }

    // Create the group
    const groupId = await ctx.db.insert("groupRSVPs", {
      name: args.name,
      description: args.description,
      eventId: args.eventId,
      organizerId: user._id,
      isPublic: args.isPublic,
      maxMembers: args.maxMembers,
      createdAt: Date.now(),
    });

    // Add creator as organizer member
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: user._id,
      role: "organizer",
      joinedAt: Date.now(),
      status: "accepted",
    });

    return groupId;
  },
});

// Join a public group
export const joinGroup = mutation({
  args: {
    groupId: v.id("groupRSVPs"),
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

    // Get group
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    if (!group.isPublic) {
      throw new Error("This group is private and requires an invitation");
    }

    // Check if user has RSVP'd to the event
    const userRSVP = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", group.eventId)
      )
      .unique();

    if (!userRSVP || userRSVP.status === "not_going") {
      throw new Error("You must RSVP to the event before joining a group");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", user._id)
      )
      .unique();

    if (existingMembership) {
      if (existingMembership.status === "accepted") {
        throw new Error("You are already a member of this group");
      } else if (existingMembership.status === "pending") {
        // Update to accepted
        await ctx.db.patch(existingMembership._id, {
          status: "accepted",
          joinedAt: Date.now(),
        });
        return existingMembership._id;
      }
    }

    // Check group capacity
    if (group.maxMembers) {
      const currentMembers = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_status", (q) =>
          q.eq("groupId", args.groupId).eq("status", "accepted")
        )
        .collect();

      if (currentMembers.length >= group.maxMembers) {
        throw new Error("This group is full");
      }
    }

    // Add user to group
    const membershipId = await ctx.db.insert("groupMembers", {
      groupId: args.groupId,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
      status: "accepted",
    });

    return membershipId;
  },
});

// Invite users to group
export const inviteToGroup = mutation({
  args: {
    groupId: v.id("groupRSVPs"),
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user
    const inviter = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!inviter) {
      throw new Error("User not found");
    }

    // Get group
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Check if user can invite (must be organizer or member)
    const inviterMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", inviter._id)
      )
      .unique();

    if (!inviterMembership || inviterMembership.status !== "accepted") {
      throw new Error("You must be a member of this group to invite others");
    }

    const invitationIds = [];

    // Create invitations for each user
    for (const userId of args.userIds) {
      // Check if user already has membership
      const existingMembership = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_user", (q) =>
          q.eq("groupId", args.groupId).eq("userId", userId)
        )
        .unique();

      if (existingMembership) {
        continue; // Skip if already invited/member
      }

      // Check group capacity
      if (group.maxMembers) {
        const currentMembers = await ctx.db
          .query("groupMembers")
          .withIndex("by_group_status", (q) =>
            q.eq("groupId", args.groupId).eq("status", "accepted")
          )
          .collect();

        if (currentMembers.length >= group.maxMembers) {
          break; // Stop inviting if group is full
        }
      }

      const invitationId = await ctx.db.insert("groupMembers", {
        groupId: args.groupId,
        userId,
        role: "member",
        joinedAt: Date.now(),
        invitedBy: inviter._id,
        status: "pending",
      });

      invitationIds.push(invitationId);
    }

    return invitationIds;
  },
});

// Respond to group invitation
export const respondToGroupInvitation = mutation({
  args: {
    membershipId: v.id("groupMembers"),
    accept: v.boolean(),
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

    // Get membership
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Invitation not found");
    }

    if (membership.userId !== user._id) {
      throw new Error("This invitation is not for you");
    }

    if (membership.status !== "pending") {
      throw new Error("This invitation has already been responded to");
    }

    if (args.accept) {
      // Check if user has RSVP'd to the event
      const group = await ctx.db.get(membership.groupId);
      if (!group) {
        throw new Error("Group not found");
      }

      const userRSVP = await ctx.db
        .query("rsvps")
        .withIndex("by_user_event", (q) =>
          q.eq("userId", user._id).eq("eventId", group.eventId)
        )
        .unique();

      if (!userRSVP || userRSVP.status === "not_going") {
        throw new Error("You must RSVP to the event before joining the group");
      }

      // Accept invitation
      await ctx.db.patch(membership._id, {
        status: "accepted",
        joinedAt: Date.now(),
      });
    } else {
      // Decline invitation
      await ctx.db.patch(membership._id, {
        status: "declined",
      });
    }

    return membership._id;
  },
});

// Get groups for an event
export const getEventGroups = query({
  args: {
    eventId: v.id("events"),
    includePrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("groupRSVPs")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId));

    if (!args.includePrivate) {
      query = query.filter((q) => q.eq(q.field("isPublic"), true));
    }

    const groups = await query.collect();

    // Get member counts and details for each group
    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const members = await ctx.db
          .query("groupMembers")
          .withIndex("by_group_status", (q) =>
            q.eq("groupId", group._id).eq("status", "accepted")
          )
          .collect();

        const organizer = await ctx.db.get(group.organizerId);

        return {
          ...group,
          memberCount: members.length,
          organizer: organizer ? {
            id: organizer._id,
            name: organizer.name,
          } : null,
        };
      })
    );

    return groupsWithDetails;
  },
});

// Get user's group memberships
export const getUserGroups = query({
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

    // Get all user's active group memberships (not left or declined)
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "accepted"),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    // Get group details for each membership
    const groupsWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        if (!group) return null;

        const event = await ctx.db.get(group.eventId);
        const memberCount = await ctx.db
          .query("groupMembers")
          .withIndex("by_group_status", (q) =>
            q.eq("groupId", group._id).eq("status", "accepted")
          )
          .collect();

        return {
          membership,
          group,
          event,
          memberCount: memberCount.length,
        };
      })
    );

    return groupsWithDetails.filter(Boolean);
  },
});

// Get group details with members
export const getGroupDetails = query({
  args: {
    groupId: v.id("groupRSVPs"),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Get all members
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    // Get user details for each member (respecting privacy)
    const membersWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user || !user.preferences.privacySettings.profileVisible) {
          return {
            ...membership,
            user: null,
          };
        }
        return {
          ...membership,
          user: {
            id: user._id,
            name: user.name,
            university: user.university,
            year: user.year,
          },
        };
      })
    );

    // Get event details
    const event = await ctx.db.get(group.eventId);

    return {
      group,
      event,
      members: membersWithDetails,
    };
  },
});

// Leave a group
export const leaveGroup = mutation({
  args: {
    groupId: v.id("groupRSVPs"),
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

    // Get membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this group");
    }

    if (membership.role === "organizer") {
      // Check if there are other members to transfer ownership to
      const otherMembers = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_status", (q) =>
          q.eq("groupId", args.groupId).eq("status", "accepted")
        )
        .filter((q) => q.neq(q.field("userId"), user._id))
        .collect();

      if (otherMembers.length > 0) {
        // Transfer ownership to the oldest member
        const oldestMember = otherMembers.sort((a, b) => a.joinedAt - b.joinedAt)[0];
        await ctx.db.patch(oldestMember._id, {
          role: "organizer",
        });
      } else {
        // Delete the group if no other members
        await ctx.db.delete(args.groupId);
        await ctx.db.delete(membership._id);
        return;
      }
    }

    // Mark as left
    await ctx.db.patch(membership._id, {
      status: "left",
    });
  },
});

// Get pending invitations for current user
export const getPendingInvitations = query({
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

    // Get pending invitations
    const pendingMemberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get group and event details for each invitation
    const invitationsWithDetails = await Promise.all(
      pendingMemberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        if (!group) return null;

        const event = await ctx.db.get(group.eventId);
        const inviter = membership.invitedBy ? await ctx.db.get(membership.invitedBy) : null;

        return {
          membership,
          group,
          event,
          inviter: inviter ? {
            id: inviter._id,
            name: inviter.name,
          } : null,
        };
      })
    );

    return invitationsWithDetails.filter(Boolean);
  },
});
