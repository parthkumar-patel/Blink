/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple encryption function (in production, use proper encryption)
function encryptMessage(text: string): string {
  // For demo purposes - in production, use proper encryption libraries
  return Buffer.from(text).toString('base64');
}

function decryptMessage(encryptedText: string): string {
  // For demo purposes - in production, use proper decryption
  try {
    return Buffer.from(encryptedText, 'base64').toString('utf-8');
  } catch {
    return encryptedText; // Return as-is if not encrypted
  }
}

// Check if user is blocked
async function isUserBlocked(ctx: any, userId1: any, userId2: any): Promise<boolean> {
  const block1 = await ctx.db
    .query("userBlocks")
    .withIndex("by_blocker_blocked", (q: any) => 
      q.eq("blockerId", userId1).eq("blockedId", userId2)
    )
    .first();

  const block2 = await ctx.db
    .query("userBlocks")
    .withIndex("by_blocker_blocked", (q: any) => 
      q.eq("blockerId", userId2).eq("blockedId", userId1)
    )
    .first();

  return !!(block1 || block2);
}

// Create or get existing conversation
export const createOrGetConversation = mutation({
  args: {
    participantIds: v.array(v.id("users")),
    initiatedVia: v.optional(v.string()),
    matchId: v.optional(v.id("matchSuggestions")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if current user is in the participant list
    if (!args.participantIds.includes(currentUser._id)) {
      throw new Error("Current user must be a participant");
    }

    // Check for blocks between any participants
    for (let i = 0; i < args.participantIds.length; i++) {
      for (let j = i + 1; j < args.participantIds.length; j++) {
        if (await isUserBlocked(ctx, args.participantIds[i], args.participantIds[j])) {
          throw new Error("Cannot create conversation: users are blocked");
        }
      }
    }

    // For direct conversations, check if one already exists
    if (args.participantIds.length === 2) {
      const sortedIds = [...args.participantIds].sort();
      
      const existingConversation = await ctx.db
        .query("conversations")
        .filter((q) => 
          q.and(
            q.eq(q.field("type"), "direct"),
            q.eq(q.field("participantIds"), sortedIds)
          )
        )
        .first();

      if (existingConversation) {
        return existingConversation._id;
      }
    }

    // Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      participantIds: args.participantIds.sort(), // Sort for consistency
      type: args.participantIds.length === 2 ? "direct" : "group",
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      metadata: {
        initiatedBy: currentUser._id,
        initiatedVia: args.initiatedVia,
        matchId: args.matchId,
      },
    });

    // Send system message
    await ctx.db.insert("messages", {
      conversationId,
      senderId: currentUser._id,
      content: {
        text: `Conversation started`,
        type: "system",
        metadata: {
          systemAction: "conversation_created",
        },
      },
      sentAt: Date.now(),
      readBy: [],
      isEncrypted: false,
    });

    return conversationId;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
    replyToMessageId: v.optional(v.id("messages")),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    messageType: v.optional(v.union(v.literal("text"), v.literal("image"), v.literal("file"))),
    // New: allow passing Convex storageId instead of a blob URL
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check if user is a participant
    if (!conversation.participantIds.includes(currentUser._id)) {
      throw new Error("Not a participant in this conversation");
    }

    // Note: We don't block sending messages here to implement silent blocking
    // Messages from blocked users will be filtered out on the receiving side

    // Determine message type and content
    const messageType = args.messageType || "text";
    const isEncrypted = args.text.length > 100; // Encrypt longer messages
    const messageText = isEncrypted ? encryptMessage(args.text) : args.text;

    // Create message content
    const content = {
      text: messageText,
      type: messageType,
      metadata: {} as any,
    };

    // Add file metadata if it's a file/image message
    if (messageType !== "text") {
      content.metadata = {
        fileName: args.fileName,
        fileSize: args.fileSize,
        // Prefer persistent storageId over ephemeral blob URL
        storageId: args.storageId,
        // Keep legacy support if a direct URL is provided
        imageUrl: messageType === "image" && args.fileUrl ? args.fileUrl : undefined,
        fileUrl: args.fileUrl,
      };
    }

    // Create message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUser._id,
      content,
      sentAt: Date.now(),
      readBy: [{
        userId: currentUser._id,
        readAt: Date.now(),
      }],
      isEncrypted,
      replyToMessageId: args.replyToMessageId,
    });

    // Update conversation last message
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

// Get user's conversations
export const getUserConversations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return [];
    }

    const limit = args.limit || 20;

    // Get all conversations and filter in JS for now (will optimize later)
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();
    
    // Filter conversations where user is a participant
    const conversations = allConversations
      .filter(conv => 
        conv.participantIds.includes(currentUser._id) && 
        !conv.isArchived
      )
      .slice(0, limit);

    // Get conversation details with participants and last message
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conversation) => {
        // Get other participants
        const otherParticipantIds = conversation.participantIds.filter(id => id !== currentUser._id);
        const otherParticipants = await Promise.all(
          otherParticipantIds.map(id => ctx.db.get(id))
        );

        // Check if current user has blocked any participant (hide conversation from blocker)
        const hasBlockedParticipant = await Promise.all(
          otherParticipantIds.map(id => isUserBlocked(ctx, currentUser._id, id))
        );
        
        if (hasBlockedParticipant.some(blocked => blocked)) {
          return null; // Hide conversation from blocker
        }

        // Get all messages to find last visible message and calculate unread count
        const allMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
          .collect();
        
        // Filter out messages from blocked users
        const visibleMessages = [];
        for (const message of allMessages) {
          if (message.senderId === currentUser._id) {
            // Always show own messages
            visibleMessages.push(message);
          } else {
            // Check if sender is blocked
            const isSenderBlocked = await isUserBlocked(ctx, currentUser._id, message.senderId);
            if (!isSenderBlocked) {
              visibleMessages.push(message);
            }
          }
        }

        // Get last visible message
        let lastMessage = null;
        if (visibleMessages.length > 0) {
          const lastVisibleMessage = visibleMessages.sort((a, b) => b.sentAt - a.sentAt)[0];
          const sender = await ctx.db.get(lastVisibleMessage.senderId);
          
          // Decrypt if needed
          const messageText = lastVisibleMessage.isEncrypted 
            ? decryptMessage(lastVisibleMessage.content.text)
            : lastVisibleMessage.content.text;

          lastMessage = {
            ...lastVisibleMessage,
            content: {
              ...lastVisibleMessage.content,
              text: messageText,
            },
            sender: sender ? {
              id: sender._id,
              name: sender.name,
            } : null,
          };
        }
        
        // Calculate unread count from visible messages only
        const unreadMessages = visibleMessages.filter(msg => 
          msg.senderId !== currentUser._id && 
          !msg.readBy.some(r => r.userId === currentUser._id)
        );

        return {
          id: conversation._id,
          type: conversation.type,
          participants: otherParticipants.filter(Boolean).map(p => ({
            id: p!._id,
            name: p!.name,
            university: p!.university,
          })),
          lastMessage,
          lastMessageAt: conversation.lastMessageAt,
          unreadCount: unreadMessages.length,
          metadata: conversation.metadata,
        };
      })
    );

    // Filter out null conversations (blocked) and sort by last message
    return conversationsWithDetails
      .filter((conv): conv is NonNullable<typeof conv> => Boolean(conv))
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

// Get messages in a conversation
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    before: v.optional(v.number()), // For pagination
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return [];
    }

    // Verify user is participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUser._id)) {
      return [];
    }

    const limit = args.limit || 50;

    // Get messages
    let messagesQuery = ctx.db
      .query("messages")
      .withIndex("by_conversation_sent", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined));

    if (args.before) {
      messagesQuery = messagesQuery.filter((q) => q.lt(q.field("sentAt"), args.before!));
    }

    const messages = await messagesQuery
      .order("desc")
      .take(limit);

    // Filter messages based on blocking and get sender details
    const visibleMessages = [];
    
    for (const message of messages) {
      if (message.senderId === currentUser._id) {
        // Always show own messages
        visibleMessages.push(message);
      } else {
        // Check if sender is blocked
        const isSenderBlocked = await isUserBlocked(ctx, currentUser._id, message.senderId);
        if (!isSenderBlocked) {
          visibleMessages.push(message);
        }
      }
    }

    // Get sender details and decrypt visible messages
    const messagesWithDetails = await Promise.all(
      visibleMessages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);

        // Decrypt message if needed
        const messageText = message.isEncrypted
          ? decryptMessage(message.content.text)
          : message.content.text;

        // Resolve storageId to a temporary URL when present so receivers can view files/images
        let resolvedMetadata = message.content.metadata as any;
        if (resolvedMetadata?.storageId) {
          const url = await ctx.storage.getUrl(resolvedMetadata.storageId);
          if (url) {
            resolvedMetadata = {
              ...resolvedMetadata,
              // Always override any stale blob: urls
              imageUrl: url,
              fileUrl: url,
            };
          }
        }

        // Get reply-to message if exists
        let replyToMessage = null as any;
        if (message.replyToMessageId) {
          const replyMsg = await ctx.db.get(message.replyToMessageId);
          if (replyMsg) {
            const replySender = await ctx.db.get(replyMsg.senderId);
            replyToMessage = {
              id: replyMsg._id,
              text: replyMsg.isEncrypted ? decryptMessage(replyMsg.content.text) : replyMsg.content.text,
              sender: replySender ? { name: replySender.name } : null,
            };
          }
        }

        return {
          id: message._id,
          content: {
            ...message.content,
            text: messageText,
            metadata: resolvedMetadata,
          },
          sender: sender
            ? {
                id: sender._id,
                name: sender.name,
              }
            : null,
          sentAt: message.sentAt,
          editedAt: message.editedAt,
          readBy: message.readBy,
          replyToMessage,
          isEncrypted: message.isEncrypted,
        };
      })
    );

    return messagesWithDetails.reverse(); // Return in chronological order
  },
});

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    messageIds: v.array(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Verify user is participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUser._id)) {
      throw new Error("Not a participant in this conversation");
    }

    const now = Date.now();

    // Mark messages as read
    for (const messageId of args.messageIds) {
      const message = await ctx.db.get(messageId);
      if (message && message.conversationId === args.conversationId) {
        const alreadyRead = message.readBy.some((r: any) => r.userId === currentUser._id);
        if (!alreadyRead) {
          await ctx.db.patch(messageId, {
            readBy: [
              ...message.readBy,
              { userId: currentUser._id, readAt: now },
            ],
          });
        }
      }
    }

    return { success: true };
  },
});

// Block a user
export const blockUser = mutation({
  args: {
    blockedUserId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser._id === args.blockedUserId) {
      throw new Error("Cannot block yourself");
    }

    // Check if already blocked
    const existingBlock = await ctx.db
      .query("userBlocks")
      .withIndex("by_blocker_blocked", (q) => 
        q.eq("blockerId", currentUser._id).eq("blockedId", args.blockedUserId)
      )
      .first();

    if (existingBlock) {
      throw new Error("User is already blocked");
    }

    // Create block
    await ctx.db.insert("userBlocks", {
      blockerId: currentUser._id,
      blockedId: args.blockedUserId,
      reason: args.reason,
      blockedAt: Date.now(),
    });

    return { success: true };
  },
});

// Unblock a user
export const unblockUser = mutation({
  args: {
    blockedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Find and remove block
    const block = await ctx.db
      .query("userBlocks")
      .withIndex("by_blocker_blocked", (q) => 
        q.eq("blockerId", currentUser._id).eq("blockedId", args.blockedUserId)
      )
      .first();

    if (block) {
      await ctx.db.delete(block._id);
    }

    return { success: true };
  },
});

// Report a message
export const reportMessage = mutation({
  args: {
    messageId: v.id("messages"),
    reason: v.union(
      v.literal("spam"),
      v.literal("harassment"),
      v.literal("inappropriate_content"),
      v.literal("fake_profile"),
      v.literal("other")
    ),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if already reported by this user
    const existingReport = await ctx.db
      .query("messageReports")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("reporterId"), currentUser._id))
      .first();

    if (existingReport) {
      throw new Error("Message already reported by you");
    }

    // Create report
    await ctx.db.insert("messageReports", {
      messageId: args.messageId,
      reporterId: currentUser._id,
      reason: args.reason,
      description: args.description,
      reportedAt: Date.now(),
      status: "pending",
    });

    return { success: true };
  },
});

// Get blocked users
export const getBlockedUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return [];
    }

    const blocks = await ctx.db
      .query("userBlocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", currentUser._id))
      .collect();

    const blockedUsersWithDetails = await Promise.all(
      blocks.map(async (block) => {
        const blockedUser = await ctx.db.get(block.blockedId);
        return {
          id: block._id,
          user: blockedUser ? {
            id: blockedUser._id,
            name: blockedUser.name,
            university: blockedUser.university,
          } : null,
          reason: block.reason,
          blockedAt: block.blockedAt,
        };
      })
    );

    return blockedUsersWithDetails.filter(b => b.user !== null);
  },
});

// Archive/Unarchive conversation
export const toggleArchiveConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUser._id)) {
      throw new Error("Conversation not found or access denied");
    }

    // Toggle archive status
    await ctx.db.patch(args.conversationId, {
      isArchived: !conversation.isArchived,
    });

    return { 
      success: true, 
      archived: !conversation.isArchived,
      message: !conversation.isArchived ? "Conversation archived" : "Conversation unarchived",
    };
  },
});

// Get archived conversations
export const getArchivedConversations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) {
      return [];
    }

    const limit = args.limit || 20;

    // Get archived conversations
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();
    
    const archivedConversations = allConversations
      .filter(conv => 
        conv.participantIds.includes(currentUser._id) && 
        conv.isArchived === true
      )
      .slice(0, limit);

    // Similar processing as getUserConversations but for archived ones
    const conversationsWithDetails = await Promise.all(
      archivedConversations.map(async (conversation) => {
        const otherParticipantIds = conversation.participantIds.filter(id => id !== currentUser._id);
        const otherParticipants = await Promise.all(
          otherParticipantIds.map(id => ctx.db.get(id))
        );

        return {
          id: conversation._id,
          type: conversation.type,
          participants: otherParticipants.filter(Boolean).map(p => ({
            id: p!._id,
            name: p!.name,
            university: p!.university,
          })),
          lastMessageAt: conversation.lastMessageAt,
          metadata: conversation.metadata,
        };
      })
    );

    return conversationsWithDetails
      .filter((conv): conv is NonNullable<typeof conv> => Boolean(conv))
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

// Generate an upload URL for client-side file uploads to Convex Storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});
