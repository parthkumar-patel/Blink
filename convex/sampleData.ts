import { mutation, query } from "./_generated/server";

// Insert sample events for testing
export const insertSampleEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleEvents = [
      {
        title: "UBC Hackathon 2024",
        description:
          "Join us for a 48-hour hackathon where students build innovative solutions to real-world problems. Open to all skill levels!",
        startDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week from now
        endDate: Date.now() + 9 * 24 * 60 * 60 * 1000, // 1 week + 2 days from now
        location: {
          name: "UBC Life Building",
          address: "6138 Student Union Blvd, Vancouver, BC V6T 1Z1",
          latitude: 49.2606,
          longitude: -123.246,
          isVirtual: false,
        },
        organizer: {
          name: "UBC Computer Science Student Society",
          type: "club" as const,
          verified: true,
          contactInfo: "hackathon@ubccsss.org",
        },
        categories: ["tech", "workshop", "networking"],
        tags: ["hackathon", "coding", "innovation", "prizes"],
        capacity: 200,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          registration: "https://ubccsss.org/hackathon2024",
          website: "https://ubccsss.org",
        },
        source: {
          platform: "manual",
          originalId: "ubc-hackathon-2024",
          url: "https://ubccsss.org/hackathon2024",
        },
        rsvpCount: 0,
      },
      {
        title: "Career Fair - Tech Companies",
        description:
          "Meet with top tech companies hiring UBC students for internships and full-time positions. Bring your resume!",
        startDate: Date.now() + 14 * 24 * 60 * 60 * 1000, // 2 weeks from now
        endDate: Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000, // 2 weeks + 6 hours
        location: {
          name: "UBC Student Union Building",
          address: "6138 Student Union Blvd, Vancouver, BC V6T 1Z1",
          latitude: 49.2606,
          longitude: -123.246,
          isVirtual: false,
        },
        organizer: {
          name: "UBC Career Services",
          type: "university" as const,
          verified: true,
          contactInfo: "careers@ubc.ca",
        },
        categories: ["career", "networking", "tech"],
        tags: ["career fair", "jobs", "internships", "tech"],
        capacity: 500,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          registration: "https://students.ubc.ca/career-fair",
          website: "https://students.ubc.ca",
        },
        source: {
          platform: "manual",
          originalId: "ubc-career-fair-tech-2024",
          url: "https://students.ubc.ca/career-fair",
        },
        rsvpCount: 0,
      },
      {
        title: "Vancouver Tech Meetup",
        description:
          "Monthly meetup for Vancouver's tech community. This month: AI and Machine Learning trends. Networking and pizza included!",
        startDate: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days from now
        endDate: Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000, // 10 days + 3 hours
        location: {
          name: "WeWork Vancouver",
          address: "900 W Hastings St, Vancouver, BC V6C 1E5",
          latitude: 49.2827,
          longitude: -123.1207,
          isVirtual: false,
        },
        organizer: {
          name: "Vancouver Tech Community",
          type: "external" as const,
          verified: false,
          contactInfo: "hello@vantechcommunity.com",
        },
        categories: ["tech", "networking", "social"],
        tags: ["meetup", "ai", "machine learning", "networking"],
        capacity: 100,
        price: {
          amount: 15,
          currency: "CAD",
          isFree: false,
        },
        images: [],
        externalLinks: {
          registration: "https://meetup.com/vancouver-tech",
          website: "https://vantechcommunity.com",
        },
        source: {
          platform: "manual",
          originalId: "vancouver-tech-meetup-ai-2024",
          url: "https://meetup.com/vancouver-tech",
        },
        rsvpCount: 0,
      },
      {
        title: "UBC Music Concert - Student Showcase",
        description:
          "Enjoy an evening of music performed by talented UBC students from the School of Music. Free admission for all students!",
        startDate: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
        endDate: Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000, // 5 days + 2 hours
        location: {
          name: "Chan Centre for the Performing Arts",
          address: "6265 Crescent Rd, Vancouver, BC V6T 1Z1",
          latitude: 49.2606,
          longitude: -123.246,
          isVirtual: false,
        },
        organizer: {
          name: "UBC School of Music",
          type: "university" as const,
          verified: true,
          contactInfo: "music@ubc.ca",
        },
        categories: ["music", "arts", "cultural"],
        tags: ["concert", "classical", "student performance"],
        capacity: 300,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          website: "https://music.ubc.ca",
        },
        source: {
          platform: "manual",
          originalId: "ubc-music-showcase-2024",
          url: "https://music.ubc.ca/events",
        },
        rsvpCount: 0,
      },
      {
        title: "Volunteer at Food Bank",
        description:
          "Help pack and distribute food to families in need. Great way to give back to the community and meet like-minded students.",
        startDate: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
        endDate: Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000, // 3 days + 4 hours
        location: {
          name: "Greater Vancouver Food Bank",
          address: "8169 Main St, Vancouver, BC V5X 3L4",
          latitude: 49.2139,
          longitude: -123.1,
          isVirtual: false,
        },
        organizer: {
          name: "UBC Volunteer Connect",
          type: "university" as const,
          verified: true,
          contactInfo: "volunteer@ubc.ca",
        },
        categories: ["volunteering", "social"],
        tags: ["volunteer", "food bank", "community service"],
        capacity: 20,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          registration: "https://students.ubc.ca/volunteer",
          website: "https://students.ubc.ca",
        },
        source: {
          platform: "manual",
          originalId: "food-bank-volunteer-2024",
          url: "https://students.ubc.ca/volunteer",
        },
        rsvpCount: 0,
      },
      {
        title: "Study Group - CPSC 320",
        description:
          "Weekly study group for CPSC 320 (Intermediate Algorithm Design and Analysis). We'll work through problem sets together.",
        startDate: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
        endDate: Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000, // 2 days + 2 hours
        location: {
          name: "UBC Irving K. Barber Learning Centre",
          address: "1961 East Mall, Vancouver, BC V6T 1Z1",
          latitude: 49.2606,
          longitude: -123.246,
          isVirtual: false,
        },
        organizer: {
          name: "CPSC Study Group",
          type: "student" as const,
          verified: false,
          contactInfo: "cpsc320study@gmail.com",
        },
        categories: ["academic", "study"],
        tags: ["study group", "algorithms", "computer science"],
        capacity: 15,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {},
        source: {
          platform: "manual",
          originalId: "cpsc320-study-group",
          url: "",
        },
        rsvpCount: 0,
      },
      {
        title: "Virtual Game Night",
        description:
          "Join us for online games including Among Us, Jackbox Games, and more! Perfect for meeting new people from the comfort of your home.",
        startDate: Date.now() + 1 * 24 * 60 * 60 * 1000, // 1 day from now
        endDate: Date.now() + 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000, // 1 day + 3 hours
        location: {
          name: "Discord Server",
          address: "Online Event",
          latitude: 49.2606,
          longitude: -123.246,
          isVirtual: true,
        },
        organizer: {
          name: "UBC Gaming Society",
          type: "club" as const,
          verified: true,
          contactInfo: "gaming@ubcgaming.ca",
        },
        categories: ["social", "gaming"],
        tags: ["virtual", "games", "online", "social"],
        capacity: 50,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          registration: "https://discord.gg/ubcgaming",
          website: "https://ubcgaming.ca",
        },
        source: {
          platform: "manual",
          originalId: "virtual-game-night-2024",
          url: "https://ubcgaming.ca",
        },
        rsvpCount: 0,
      },
      {
        title: "Startup Pitch Competition",
        description:
          "Present your startup idea to a panel of judges including VCs and successful entrepreneurs. $10,000 in prizes!",
        startDate: Date.now() + 21 * 24 * 60 * 60 * 1000, // 3 weeks from now
        endDate: Date.now() + 21 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000, // 3 weeks + 4 hours
        location: {
          name: "UBC Sauder School of Business",
          address: "2053 Main Mall, Vancouver, BC V6T 1Z2",
          latitude: 49.2648,
          longitude: -123.2533,
          isVirtual: false,
        },
        organizer: {
          name: "UBC Entrepreneurship Society",
          type: "club" as const,
          verified: true,
          contactInfo: "pitch@ubcentrepreneurship.com",
        },
        categories: ["career", "networking", "workshop"],
        tags: ["startup", "pitch", "entrepreneurship", "competition"],
        capacity: 100,
        price: {
          amount: 25,
          currency: "CAD",
          isFree: false,
        },
        images: [],
        externalLinks: {
          registration: "https://ubcentrepreneurship.com/pitch2024",
          website: "https://ubcentrepreneurship.com",
        },
        source: {
          platform: "manual",
          originalId: "startup-pitch-competition-2024",
          url: "https://ubcentrepreneurship.com/pitch2024",
        },
        rsvpCount: 0,
      },
      {
        title: "Yoga in the Park",
        description:
          "Free outdoor yoga session in Queen Elizabeth Park. Bring your own mat and enjoy nature while staying active!",
        startDate: Date.now() + 4 * 24 * 60 * 60 * 1000, // 4 days from now
        endDate: Date.now() + 4 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000, // 4 days + 1 hour
        location: {
          name: "Queen Elizabeth Park",
          address: "4600 Cambie St, Vancouver, BC V5Y 2M4",
          latitude: 49.2404,
          longitude: -123.1129,
          isVirtual: false,
        },
        organizer: {
          name: "UBC Wellness Club",
          type: "club" as const,
          verified: true,
          contactInfo: "wellness@ubcwellness.ca",
        },
        categories: ["sports", "wellness", "social"],
        tags: ["yoga", "outdoor", "wellness", "fitness"],
        capacity: 30,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          website: "https://ubcwellness.ca",
        },
        source: {
          platform: "manual",
          originalId: "yoga-park-2024",
          url: "https://ubcwellness.ca",
        },
        rsvpCount: 0,
      },
    ];

    const insertedIds = [];

    for (const event of sampleEvents) {
      const eventId = await ctx.db.insert("events", event);
      insertedIds.push(eventId);
    }

    console.log(`Inserted ${insertedIds.length} sample events`);

    return {
      success: true,
      insertedCount: insertedIds.length,
      eventIds: insertedIds,
    };
  },
});

// Insert sample users for testing
export const insertSampleUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleUsers = [
      {
        clerkId: "sample_user_1",
        email: "alice@student.ubc.ca",
        name: "Alice Chen",
        university: "UBC",
        year: "junior" as const,
        interests: ["tech", "career", "networking", "academic"],
        location: {
          latitude: 49.2606,
          longitude: -123.246,
          address: "UBC Campus, Vancouver, BC",
        },
        preferences: {
          maxDistance: 25,
          notificationSettings: {
            email: true,
            push: true,
            sms: false,
          },
          privacySettings: {
            profileVisible: true,
            showInBuddyMatching: true,
          },
          buddyMatchingEnabled: true,
        },
        lastActiveAt: Date.now(),
      },
      {
        clerkId: "sample_user_2",
        email: "bob@student.ubc.ca",
        name: "Bob Martinez",
        university: "UBC",
        year: "senior" as const,
        interests: ["music", "arts", "social", "cultural"],
        location: {
          latitude: 49.2827,
          longitude: -123.1207,
          address: "Downtown Vancouver, BC",
        },
        preferences: {
          maxDistance: 30,
          notificationSettings: {
            email: true,
            push: false,
            sms: false,
          },
          privacySettings: {
            profileVisible: true,
            showInBuddyMatching: false,
          },
          buddyMatchingEnabled: false,
        },
        lastActiveAt: Date.now(),
      },
      {
        clerkId: "sample_user_3",
        email: "carol@student.ubc.ca",
        name: "Carol Kim",
        university: "UBC",
        year: "sophomore" as const,
        interests: ["volunteering", "social", "wellness", "sports"],
        location: {
          latitude: 49.2404,
          longitude: -123.1129,
          address: "Queen Elizabeth Park Area, Vancouver, BC",
        },
        preferences: {
          maxDistance: 20,
          notificationSettings: {
            email: true,
            push: true,
            sms: true,
          },
          privacySettings: {
            profileVisible: true,
            showInBuddyMatching: true,
          },
          buddyMatchingEnabled: true,
        },
        lastActiveAt: Date.now(),
      },
    ];

    const insertedIds = [];

    for (const user of sampleUsers) {
      const userId = await ctx.db.insert("users", user);
      insertedIds.push(userId);
    }

    console.log(`Inserted ${insertedIds.length} sample users`);

    return {
      success: true,
      insertedCount: insertedIds.length,
      userIds: insertedIds,
    };
  },
});

// Clear all sample data
export const clearSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear events
    const events = await ctx.db.query("events").collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    // Clear users (only sample users)
    const users = await ctx.db.query("users").collect();
    const sampleUsers = users.filter((user) =>
      user.clerkId.startsWith("sample_user_")
    );
    for (const user of sampleUsers) {
      await ctx.db.delete(user._id);
    }

    // Clear RSVPs
    const rsvps = await ctx.db.query("rsvps").collect();
    for (const rsvp of rsvps) {
      await ctx.db.delete(rsvp._id);
    }

    console.log(
      `Cleared ${events.length} events, ${sampleUsers.length} sample users, and ${rsvps.length} RSVPs`
    );

    return {
      success: true,
      clearedEvents: events.length,
      clearedUsers: sampleUsers.length,
      clearedRsvps: rsvps.length,
    };
  },
});

// Check if database needs sample data
export const checkAndPopulateSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if there are any events
    const existingEvents = await ctx.db.query("events").take(1);

    if (existingEvents.length === 0) {
      console.log("No events found, populating sample data...");

      // Insert sample events - simplified version
      const quickEvents = [
        {
          title: "UBC Hackathon 2024",
          description:
            "Join us for a 48-hour hackathon where students build innovative solutions to real-world problems.",
          startDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
          endDate: Date.now() + 9 * 24 * 60 * 60 * 1000,
          location: {
            name: "UBC Life Building",
            address: "6138 Student Union Blvd, Vancouver, BC V6T 1Z1",
            latitude: 49.2606,
            longitude: -123.246,
            isVirtual: false,
          },
          organizer: {
            name: "UBC Computer Science Student Society",
            type: "club" as const,
            verified: true,
            contactInfo: "hackathon@ubccsss.org",
          },
          categories: ["tech", "workshop", "networking"],
          tags: ["hackathon", "coding", "innovation"],
          capacity: 200,
          price: { amount: 0, currency: "CAD", isFree: true },
          images: [],
          externalLinks: { registration: "https://ubccsss.org/hackathon2024" },
          source: {
            platform: "manual",
            originalId: "ubc-hackathon-2024",
            url: "https://ubccsss.org/hackathon2024",
          },
          rsvpCount: 0,
        },
        {
          title: "Career Fair - Tech Companies",
          description:
            "Meet with top tech companies hiring UBC students for internships and full-time positions.",
          startDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
          endDate: Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000,
          location: {
            name: "UBC Student Union Building",
            address: "6138 Student Union Blvd, Vancouver, BC V6T 1Z1",
            latitude: 49.2606,
            longitude: -123.246,
            isVirtual: false,
          },
          organizer: {
            name: "UBC Career Services",
            type: "university" as const,
            verified: true,
            contactInfo: "careers@ubc.ca",
          },
          categories: ["career", "networking", "tech"],
          tags: ["career fair", "jobs", "internships"],
          capacity: 500,
          price: { amount: 0, currency: "CAD", isFree: true },
          images: [],
          externalLinks: {
            registration: "https://students.ubc.ca/career-fair",
          },
          source: {
            platform: "manual",
            originalId: "ubc-career-fair-tech-2024",
            url: "https://students.ubc.ca/career-fair",
          },
          rsvpCount: 0,
        },
        {
          title: "Virtual Game Night",
          description:
            "Join us for online games including Among Us, Jackbox Games, and more!",
          startDate: Date.now() + 1 * 24 * 60 * 60 * 1000,
          endDate: Date.now() + 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
          location: {
            name: "Discord Server",
            address: "Online Event",
            latitude: 49.2606,
            longitude: -123.246,
            isVirtual: true,
          },
          organizer: {
            name: "UBC Gaming Society",
            type: "club" as const,
            verified: true,
            contactInfo: "gaming@ubcgaming.ca",
          },
          categories: ["social", "gaming"],
          tags: ["virtual", "games", "online"],
          capacity: 50,
          price: { amount: 0, currency: "CAD", isFree: true },
          images: [],
          externalLinks: { registration: "https://discord.gg/ubcgaming" },
          source: {
            platform: "manual",
            originalId: "virtual-game-night-2024",
            url: "https://ubcgaming.ca",
          },
          rsvpCount: 0,
        },
      ];

      let eventCount = 0;
      for (const event of quickEvents) {
        await ctx.db.insert("events", event);
        eventCount++;
      }

      const eventResult = { insertedCount: eventCount };
      const userResult = { insertedCount: 0 };

      return {
        success: true,
        message: "Sample data populated automatically",
        events: eventResult.insertedCount,
        users: userResult.insertedCount,
      };
    }

    return {
      success: true,
      message: "Database already has data",
      events: 0,
      users: 0,
    };
  },
});

// Get database stats
export const getDatabaseStats = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    const users = await ctx.db.query("users").collect();
    const rsvps = await ctx.db.query("rsvps").collect();

    return {
      events: events.length,
      users: users.length,
      rsvps: rsvps.length,
    };
  },
});
