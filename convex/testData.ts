import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Helper function to create test users for matching system
export const createTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const testUsers = [
      {
        clerkId: `test_user_1_${Date.now()}`,
        email: "alice@ubc.ca",
        name: "Alice Johnson",
        university: "UBC",
        year: "sophomore" as const,
        interests: ["programming", "hiking", "photography", "coffee"],
        preferences: {
          maxDistance: 25,
          notificationSettings: { email: true, push: true, sms: false },
          privacySettings: { profileVisible: true, showInBuddyMatching: true },
          buddyMatchingEnabled: true,
        },
        location: {
          latitude: 49.2827,
          longitude: -123.1207,
          address: "Vancouver, BC",
        },
        lastActiveAt: Date.now(),
      },
      {
        clerkId: `test_user_2_${Date.now()}`,
        email: "bob@ubc.ca",
        name: "Bob Chen",
        university: "UBC",
        year: "sophomore" as const,
        interests: ["gaming", "programming", "music", "sports"],
        preferences: {
          maxDistance: 25,
          notificationSettings: { email: true, push: true, sms: false },
          privacySettings: { profileVisible: true, showInBuddyMatching: true },
          buddyMatchingEnabled: true,
        },
        location: {
          latitude: 49.2845,
          longitude: -123.1134,
          address: "Vancouver, BC",
        },
        lastActiveAt: Date.now(),
      },
      {
        clerkId: `test_user_3_${Date.now()}`,
        email: "carol@ubc.ca",
        name: "Carol Davis",
        university: "UBC",
        year: "junior" as const,
        interests: ["photography", "travel", "books", "coffee"],
        preferences: {
          maxDistance: 25,
          notificationSettings: { email: true, push: true, sms: false },
          privacySettings: { profileVisible: true, showInBuddyMatching: true },
          buddyMatchingEnabled: true,
        },
        location: {
          latitude: 49.2761,
          longitude: -123.1175,
          address: "Vancouver, BC",
        },
        lastActiveAt: Date.now(),
      },
      {
        clerkId: `test_user_4_${Date.now()}`,
        email: "david@sfu.ca",
        name: "David Wilson",
        university: "SFU",
        year: "sophomore" as const,
        interests: ["programming", "gaming", "movies", "fitness"],
        preferences: {
          maxDistance: 25,
          notificationSettings: { email: true, push: true, sms: false },
          privacySettings: { profileVisible: true, showInBuddyMatching: true },
          buddyMatchingEnabled: true,
        },
        location: {
          latitude: 49.2788,
          longitude: -122.9199,
          address: "Burnaby, BC",
        },
        lastActiveAt: Date.now(),
      },
      {
        clerkId: `test_user_5_${Date.now()}`,
        email: "emma@ubc.ca",
        name: "Emma Thompson",
        university: "UBC",
        year: "freshman" as const,
        interests: ["hiking", "photography", "social", "volunteer"],
        preferences: {
          maxDistance: 25,
          notificationSettings: { email: true, push: true, sms: false },
          privacySettings: { profileVisible: true, showInBuddyMatching: true },
          buddyMatchingEnabled: true,
        },
        location: {
          latitude: 49.2819,
          longitude: -123.1098,
          address: "Vancouver, BC",
        },
        lastActiveAt: Date.now(),
      },
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      const userId = await ctx.db.insert("users", userData);
      createdUsers.push({ id: userId, name: userData.name });
    }

    return { 
      message: `Created ${createdUsers.length} test users for matching`,
      users: createdUsers 
    };
  },
});

// Helper to clean up test users
export const cleanupTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const testUsers = allUsers.filter(user => user.clerkId.startsWith("test_user_"));
    
    let deletedCount = 0;
    for (const user of testUsers) {
      await ctx.db.delete(user._id);
      deletedCount++;
    }

    return { message: `Deleted ${deletedCount} test users` };
  },
});
