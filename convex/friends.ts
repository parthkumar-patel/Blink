import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Send friend request
export const sendFriendRequest = mutation({
  args: {
    receiverClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get requester
    const requester = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!requester) {
      throw new Error("User not found");
    }

    // Get receiver
    const receiver = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.receiverClerkId))
      .unique();

    if (!receiver) {
      throw new Error("Receiver not found");
    }

    if (requester._id === receiver._id) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if connection already exists
    const existingConnection = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester_receiver", (q) =>
        q.eq("requesterId", requester._id).eq("receiverId", receiver._id)
      )
      .unique();

    const reverseConnection = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester_receiver", (q) =>
        q.eq("requesterId", receiver._id).eq("receiverId", requester._id)
      )
      .unique();

    // Check for active connections (pending, accepted) - declined connections are allowed to be overwritten
    const hasActiveConnection = 
      (existingConnection && (existingConnection.status === "pending" || existingConnection.status === "accepted")) ||
      (reverseConnection && (reverseConnection.status === "pending" || reverseConnection.status === "accepted"));

    if (hasActiveConnection) {
      throw new Error("Friend request already exists or you are already friends");
    }

    // If there's a declined connection, delete it before creating a new one
    if (existingConnection && existingConnection.status === "declined") {
      await ctx.db.delete(existingConnection._id);
    }
    if (reverseConnection && reverseConnection.status === "declined") {
      await ctx.db.delete(reverseConnection._id);
    }

    // Create friend request
    const connectionId = await ctx.db.insert("friendConnections", {
      requesterId: requester._id,
      receiverId: receiver._id,
      status: "pending",
      createdAt: Date.now(),
    });

    return connectionId;
  },
});

// Respond to friend request
export const respondToFriendRequest = mutation({
  args: {
    connectionId: v.id("friendConnections"),
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

    // Get connection
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Friend request not found");
    }

    if (connection.receiverId !== user._id) {
      throw new Error("You can only respond to friend requests sent to you");
    }

    if (connection.status !== "pending") {
      throw new Error("This friend request has already been responded to");
    }

    // Update connection status
    await ctx.db.patch(connection._id, {
      status: args.accept ? "accepted" : "declined",
      respondedAt: Date.now(),
    });

    return connection._id;
  },
});

// Get user's friends
export const getFriends = query({
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

    // Get accepted friend connections where user is either requester or receiver
    const sentConnections = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const receivedConnections = await ctx.db
      .query("friendConnections")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    // Get friend user details
    const friends = [];

    for (const connection of sentConnections) {
      const friend = await ctx.db.get(connection.receiverId);
      if (friend) {
        friends.push({
          id: friend._id,
          name: friend.name,
          email: friend.email,
          university: friend.university,
          year: friend.year,
          connectionDate: connection.respondedAt || connection.createdAt,
          profileVisible: friend.preferences?.privacySettings?.profileVisible ?? true,
        });
      }
    }

    for (const connection of receivedConnections) {
      const friend = await ctx.db.get(connection.requesterId);
      if (friend) {
        friends.push({
          id: friend._id,
          name: friend.name,
          email: friend.email,
          university: friend.university,
          year: friend.year,
          connectionDate: connection.respondedAt || connection.createdAt,
          profileVisible: friend.preferences?.privacySettings?.profileVisible ?? true,
        });
      }
    }

    return friends.sort((a, b) => b.connectionDate - a.connectionDate);
  },
});

// Get pending friend requests
export const getPendingFriendRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { sent: [], received: [] };
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return { sent: [], received: [] };
    }

    // Get pending requests sent by user
    const sentRequests = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get pending requests received by user
    const receivedRequests = await ctx.db
      .query("friendConnections")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get user details for sent requests
    const sentWithDetails = await Promise.all(
      sentRequests.map(async (request) => {
        const receiver = await ctx.db.get(request.receiverId);
        return {
          ...request,
          receiver: receiver ? {
            id: receiver._id,
            name: receiver.name,
            email: receiver.email,
            university: receiver.university,
          } : null,
        };
      })
    );

    // Get user details for received requests
    const receivedWithDetails = await Promise.all(
      receivedRequests.map(async (request) => {
        const requester = await ctx.db.get(request.requesterId);
        return {
          ...request,
          requester: requester ? {
            id: requester._id,
            name: requester.name,
            email: requester.email,
            university: requester.university,
          } : null,
        };
      })
    );

    return {
      sent: sentWithDetails.filter(r => r.receiver !== null),
      received: receivedWithDetails.filter(r => r.requester !== null),
    };
  },
});

// Get friendship status between current user and another user
export const getFriendshipStatus = query({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return "none";
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return "none";
    }

    // Check if there's a connection from current user to other user
    const sentConnection = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester_receiver", (q) =>
        q.eq("requesterId", currentUser._id).eq("receiverId", args.otherUserId)
      )
      .unique();

    // Check if there's a connection from other user to current user
    const receivedConnection = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester_receiver", (q) =>
        q.eq("requesterId", args.otherUserId).eq("receiverId", currentUser._id)
      )
      .unique();

    if (sentConnection) {
      if (sentConnection.status === "accepted") {
        return "friends";
      } else if (sentConnection.status === "pending") {
        return "pending";
      } else if (sentConnection.status === "blocked") {
        return "blocked";
      }
      // If declined, return "none" so they can try again
    } else if (receivedConnection) {
      if (receivedConnection.status === "accepted") {
        return "friends";
      } else if (receivedConnection.status === "pending") {
        return "received_request";
      } else if (receivedConnection.status === "blocked") {
        return "blocked";
      }
      // If declined, return "none" so they can send a new request
    }

    return "none";
  },
});

// Search for users to add as friends
export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    if (args.query.length < 2) {
      return [];
    }

    // Get current user to exclude from results
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return [];
    }

    // Search users by name
    const users = await ctx.db
      .query("users")
      .withSearchIndex("search_users", (q) => q.search("name", args.query))
      .take(args.limit || 10);

    // Filter out current user and users with private profiles
    const filteredUsers = users.filter(user => 
      user._id !== currentUser._id && 
      user.preferences.privacySettings.profileVisible
    );

    // Get existing friend connections to show friendship status
    const usersWithStatus = await Promise.all(
      filteredUsers.map(async (user) => {
        // Check if already friends or request exists
        const sentConnection = await ctx.db
          .query("friendConnections")
          .withIndex("by_requester_receiver", (q) =>
            q.eq("requesterId", currentUser._id).eq("receiverId", user._id)
          )
          .unique();

        const receivedConnection = await ctx.db
          .query("friendConnections")
          .withIndex("by_requester_receiver", (q) =>
            q.eq("requesterId", user._id).eq("receiverId", currentUser._id)
          )
          .unique();

        let friendshipStatus = "none";
        if (sentConnection) {
          if (sentConnection.status === "accepted") {
            friendshipStatus = "friends";
          } else if (sentConnection.status === "pending") {
            friendshipStatus = "pending";
          } else if (sentConnection.status === "blocked") {
            friendshipStatus = "blocked";
          }
          // If declined, leave as "none" so they can try again
        } else if (receivedConnection) {
          if (receivedConnection.status === "accepted") {
            friendshipStatus = "friends";
          } else if (receivedConnection.status === "pending") {
            friendshipStatus = "received_request";
          } else if (receivedConnection.status === "blocked") {
            friendshipStatus = "blocked";
          }
          // If declined, leave as "none" so they can send a new request
        }

        return {
          id: user._id,
          clerkId: user.clerkId,
          name: user.name,
          email: user.email,
          university: user.university,
          year: user.year,
          friendshipStatus,
        };
      })
    );

    return usersWithStatus;
  },
});

// Block a user
export const blockUser = mutation({
  args: {
    userToBlockId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    if (user._id === args.userToBlockId) {
      throw new Error("Cannot block yourself");
    }

    // Check if connection already exists
    const existingConnection = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester_receiver", (q) =>
        q.eq("requesterId", user._id).eq("receiverId", args.userToBlockId)
      )
      .unique();

    const reverseConnection = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester_receiver", (q) =>
        q.eq("requesterId", args.userToBlockId).eq("receiverId", user._id)
      )
      .unique();

    if (existingConnection) {
      // Update existing connection to blocked
      await ctx.db.patch(existingConnection._id, {
        status: "blocked",
        respondedAt: Date.now(),
      });
      return existingConnection._id;
    } else if (reverseConnection) {
      // Delete reverse connection and create blocked connection
      await ctx.db.delete(reverseConnection._id);
    }

    // Create new blocked connection
    const connectionId = await ctx.db.insert("friendConnections", {
      requesterId: user._id,
      receiverId: args.userToBlockId,
      status: "blocked",
      createdAt: Date.now(),
      respondedAt: Date.now(),
    });

    return connectionId;
  },
});

// Remove friend/unblock
export const removeFriend = mutation({
  args: {
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Find the connection
    const sentConnection = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester_receiver", (q) =>
        q.eq("requesterId", user._id).eq("receiverId", args.friendId)
      )
      .unique();

    const receivedConnection = await ctx.db
      .query("friendConnections")
      .withIndex("by_requester_receiver", (q) =>
        q.eq("requesterId", args.friendId).eq("receiverId", user._id)
      )
      .unique();

    if (sentConnection) {
      await ctx.db.delete(sentConnection._id);
    }
    
    if (receivedConnection) {
      await ctx.db.delete(receivedConnection._id);
    }

    if (!sentConnection && !receivedConnection) {
      throw new Error("No friendship connection found");
    }
  },
});

// Get mutual friends with another user
export const getMutualFriends = query({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    // Get current user's friends
    const userFriends = await getFriendsForUser(ctx, user._id);
    
    // Get other user's friends
    const otherUserFriends = await getFriendsForUser(ctx, args.otherUserId);

    // Find mutual friends
    const mutualFriends = userFriends.filter(friend1 =>
      otherUserFriends.some(friend2 => friend1.id === friend2.id)
    );

    return mutualFriends;
  },
});

// Helper function to get friends for a specific user
async function getFriendsForUser(ctx: any, userId: any) {
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

  const friends = [];

  for (const connection of sentConnections) {
    const friend = await ctx.db.get(connection.receiverId);
    if (friend && friend.preferences.privacySettings.profileVisible) {
      friends.push({
        id: friend._id,
        name: friend.name,
      });
    }
  }

  for (const connection of receivedConnections) {
    const friend = await ctx.db.get(connection.requesterId);
    if (friend && friend.preferences.privacySettings.profileVisible) {
      friends.push({
        id: friend._id,
        name: friend.name,
      });
    }
  }

  return friends;
}
