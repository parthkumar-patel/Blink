/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import {
  MessageCircle,
  Plus,
  Search,
  MoreVertical,
  Archive,
  Blocks,
  Flag,
  Shield,
  Clock,
  ArrowLeft,
  Send,
  Smile,
  Paperclip,
  Phone,
  Video,
  Info,
  Users,
  File,
  Download,
  ArchiveRestore,
  UserX,
  Inbox,
  X,
  GripVertical,
  Image as ImageIcon,
} from "lucide-react";

// Dynamically import emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
import { api } from "../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Card components not used in this component
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Conversation {
  id: string;
  type: "direct" | "group";
  participants: {
    id: string;
    name: string;
    university: string;
  }[];
  lastMessage: {
    content: { text: string; type: string };
    sender: { name: string };
    sentAt: number;
  } | null;
  lastMessageAt: number;
  unreadCount: number;
  metadata: {
    initiatedBy: string;
    initiatedVia?: string;
    matchId?: string;
  };
}

interface Message {
  id: string;
  content: {
    text: string;
    type: string;
    metadata?: any;
  };
  sender: {
    id: string;
    name: string;
  } | null;
  sentAt: number;
  editedAt?: number;
  readBy: { userId: string; readAt: number }[];
  replyToMessage?: {
    id: string;
    text: string;
    sender: { name: string } | null;
  };
  isEncrypted: boolean;
}

export default function MessagesPage() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedConversationId, setSelectedConversationId] = useState<any | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [userToBlock, setUserToBlock] = useState<{ id: any; name: string } | null>(null);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{
    id: string;
    file: File;
    preview: string;
    name: string;
    size: number;
  }>>([]);
  const [, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Anchor for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const conversations = useQuery(api.messaging.getUserConversations, { limit: 50 });
  const archivedConversations = useQuery(
    api.messaging.getArchivedConversations, 
    showArchivedChats ? { limit: 50 } : "skip"
  );
  const messages = useQuery(
    api.messaging.getConversationMessages,
    selectedConversationId ? { conversationId: selectedConversationId, limit: 100 } : "skip"
  );
  const friends = useQuery(api.friends.getFriends, user ? {} : "skip");
  const blockedUsers = useQuery(api.messaging.getBlockedUsers, {});
  const currentUserProfile = useQuery(api.users.getCurrentUser, user ? {} : "skip");

  // Mutations
  const sendMessage = useMutation(api.messaging.sendMessage);
  const markAsRead = useMutation(api.messaging.markMessagesAsRead);
  const blockUser = useMutation(api.messaging.blockUser);
  const unblockUser = useMutation(api.messaging.unblockUser);
  const createOrGetConversation = useMutation(api.messaging.createOrGetConversation);
  const toggleArchive = useMutation(api.messaging.toggleArchiveConversation);
  // For uploads to Convex Storage
  const generateUploadUrl = useMutation(api.messaging.generateUploadUrl);

  // Auto-scroll when messages update or conversation changes
  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    // Find the Radix ScrollArea viewport ancestor and force scroll
    const viewport = el.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [selectedConversationId, messages?.length]);

  const scrollToBottom = () => {
    const el = messagesEndRef.current;
    if (!el) return;
    const viewport = el.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  // Auto-mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedConversationId && messages && messages.length > 0) {
      const unreadMessages = messages.filter(m => 
        m.sender?.id !== user?.id && 
        !m.readBy.some(r => r.userId === user?.id)
      );
      
      if (unreadMessages.length > 0) {
        markAsRead({
          conversationId: selectedConversationId,
          messageIds: unreadMessages.map(m => m.id),
        });
      }
    }
  }, [selectedConversationId, messages, user?.id, markAsRead]);

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversationId) return;

    try {
      await sendMessage({
        conversationId: selectedConversationId,
        text: messageText.trim(),
      });
      setMessageText("");
      scrollToBottom();
      toast.success("Message sent!");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleBlockUser = async () => {
    if (!userToBlock) return;

    try {
      await blockUser({
        blockedUserId: userToBlock.id,
        reason: "Blocked from messages",
      });
      toast.success(`${userToBlock.name} has been blocked`);
      setShowBlockDialog(false);
      setUserToBlock(null);
      setSelectedConversationId(null);
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Failed to block user. Please try again.");
    }
  };

  const handleStartConversation = async (friendId: any) => {
    if (!currentUserProfile?._id) return;
    
    try {
      const conversationId = await createOrGetConversation({
        participantIds: [currentUserProfile._id, friendId],
        initiatedVia: "manual",
      });
      
      toast.success("Conversation started!");
      setShowNewConversationDialog(false);
      setSelectedConversationId(conversationId);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation. Please try again.");
    }
  };

  // Helper to upload a file to Convex Storage and return storageId
  const uploadToConvex = async (file: File) => {
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    // Convex returns { storageId }
    return (json.storageId ?? json)?.toString();
  };

  const sendSelectedImages = async () => {
    if (!selectedConversationId || selectedImages.length === 0) return;

    setUploadingFile(true);
    try {
      // Send images in order
      for (const image of selectedImages) {
        const storageId = await uploadToConvex(image.file);
        await sendMessage({
          conversationId: selectedConversationId,
          text: image.name,
          fileName: image.name,
          fileSize: image.size,
          messageType: 'image',
          storageId,
        });
      }
      
      toast.success(`${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''} sent!`);
      
      // Clean up
      selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
      setSelectedImages([]);
      setMessageText('');
      scrollToBottom();
    } catch (error) {
      console.error("Error sending images:", error);
      toast.error("Failed to send images. Please try again.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedConversationId) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      // Handle image files - add to preview
      const newImages = imageFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      }));
      
      setSelectedImages(prev => [...prev, ...newImages]);
    } else {
      // Handle non-image files - upload then send
      const file = files[0];
      setUploadingFile(true);
      try {
        const storageId = await uploadToConvex(file);
        await sendMessage({
          conversationId: selectedConversationId,
          text: file.name,
          fileName: file.name,
          fileSize: file.size,
          messageType: 'file',
          storageId,
        });
        toast.success('File sent!');
        scrollToBottom();
      } catch (error) {
        console.error("Error uploading file:", error);
        toast.error("Failed to send file. Please try again.");
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const removeImage = (imageId: string) => {
    setSelectedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // Clean up object URL
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return updated;
    });
  };

  const reorderImages = (startIndex: number, endIndex: number) => {
    setSelectedImages(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const handleEmojiSelect = (emojiObject: { emoji: string }) => {
    setMessageText(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleArchiveConversation = async () => {
    if (!selectedConversationId) return;
    
    try {
      const result = await toggleArchive({ conversationId: selectedConversationId });
      toast.success(result.message);
      setSelectedConversationId(null);
    } catch (error) {
      console.error("Error archiving conversation:", error);
      toast.error("Failed to archive conversation. Please try again.");
    }
  };

  const handleUnblockUser = async (blockedUserId: any) => {
    try {
      await unblockUser({ blockedUserId });
      toast.success("User unblocked successfully");
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Failed to unblock user. Please try again.");
    }
  };

  const filteredConversations = conversations?.filter(conv =>
    conv.participants.some(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.university.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  // Get friends who don't already have conversations
  const friendsWithoutConversations = friends?.filter(friend => {
    // Check if there's already a conversation with this friend
    const hasConversation = conversations?.some(conv => 
      conv.participants.some(p => p.id === friend.id)
    );
    return !hasConversation;
  }) || [];

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitiatedViaText = (via?: string) => {
    switch (via) {
      case "match_accept": return "Started from a match";
      case "friend_request": return "Started from friend request";
      default: return "Direct message";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-8rem)] overflow-hidden">
          <div className="flex h-full min-h-0">
            {/* Conversations Sidebar */}
            <div className={`${selectedConversationId ? 'hidden lg:block' : 'block'} w-full lg:w-80 border-r border-gray-200 flex flex-col min-h-0`}>
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-sm">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 truncate">Messages</h1>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 rounded-xl whitespace-nowrap shadow-sm hover:shadow transition"
                      onClick={() => setShowNewConversationDialog(true)}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">New</span>
                    </Button>

                    <div className="flex rounded-xl overflow-hidden border border-gray-200">
                      <Button
                        type="button"
                        variant={showArchivedChats ? "outline" : "default"}
                        size="sm"
                        className={`${showArchivedChats ? 'bg-white text-gray-700' : 'bg-blue-600 text-white'} px-3 whitespace-nowrap`}
                        onClick={() => setShowArchivedChats(false)}
                        aria-pressed={!showArchivedChats}
                      >
                        Active
                      </Button>
                      <Button
                        type="button"
                        variant={showArchivedChats ? "default" : "outline"}
                        size="sm"
                        className={`${showArchivedChats ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'} px-3 whitespace-nowrap`}
                        onClick={() => setShowArchivedChats(true)}
                        aria-pressed={showArchivedChats}
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Archived</span>
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-xl bg-gray-50 border border-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <ScrollArea className="flex-1 min-h-0 max-h-full">
                <div className="p-2">
                  {showArchivedChats ? (
                    // Archived Conversations
                    archivedConversations && archivedConversations.length > 0 ? (
                      <div className="space-y-1">
                        {archivedConversations.map((conversation) => {
                          const otherParticipants = conversation.participants.filter(p => p.id !== currentUserProfile?._id);
                          const otherParticipant = otherParticipants[0];
                          
                          if (!otherParticipant) return null;
                          
                          return (
                            <div
                              key={conversation.id}
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group ${
                                selectedConversationId === conversation.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                              }`}
                              onClick={() => setSelectedConversationId(conversation.id)}
                            >
                              <Avatar className="w-12 h-12">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                                  {otherParticipant.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium text-gray-900 truncate flex items-center gap-2">
                                    {otherParticipant.name}
                                    <Archive className="w-3 h-3 text-gray-400" />
                                  </h3>
                                  <span className="text-xs text-gray-500">
                                    {formatTime(conversation.lastMessageAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 truncate mt-1">
                                  {(conversation as any).lastMessage?.content.text || "No messages yet"}
                                </p>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveConversation();
                                }}
                              >
                                <ArchiveRestore className="w-4 h-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No archived chats</h3>
                        <p className="text-gray-500 text-sm">
                          Conversations you archive will appear here
                        </p>
                      </div>
                    )
                  ) : conversations === undefined ? (
                    <div className="space-y-2 p-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-xl border border-gray-200">
                          <div className="w-12 h-12 rounded-full bg-gray-200" />
                          <div className="flex-1 min-w-0">
                            <div className="h-4 w-1/3 bg-gray-200 rounded mb-2" />
                            <div className="h-3 w-2/3 bg-gray-200 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                      <p className="text-gray-500 text-sm mb-4">
                        Start chatting by accepting match suggestions or messaging friends
                      </p>
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => setShowNewConversationDialog(true)}
                      >
                        <Plus className="w-4 h-4" />
                        Start a conversation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredConversations.map((conversation) => {
                        const otherParticipant = conversation.participants.find(p => p.id !== currentUserProfile?._id) || conversation.participants[0];
                        const isSelected = selectedConversationId === conversation.id;
                        const last = (conversation as any).lastMessage;

                        const lastPreview = (() => {
                          if (!last) return (
                            <span className="text-sm text-gray-400 italic">
                              {getInitiatedViaText(conversation.metadata.initiatedVia)}
                            </span>
                          );
                          const type = last.content?.type;
                          if (type === "system") {
                            return (
                              <span className="text-sm text-gray-500 italic flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {last.content?.text}
                              </span>
                            );
                          }
                          if (type === "image") {
                            return (
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Photo{last.content?.text ? ` · ${last.content.text}` : ""}
                              </span>
                            );
                          }
                          if (type === "file") {
                            return (
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <File className="w-3.5 h-3.5 text-amber-500" /> {last.content?.metadata?.fileName || "File"}
                              </span>
                            );
                          }
                          return (
                            <span className="text-sm text-gray-600 truncate">
                              {last.sender?.name ? `${last.sender.name}: ` : ""}{last.content?.text}
                            </span>
                          );
                        })();

                        return (
                          <div
                            key={conversation.id}
                            className={`group p-3 rounded-xl cursor-pointer transition-all border ${
                              isSelected
                                ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                                : "bg-white hover:bg-gray-50 border-gray-200"
                            }`}
                            onClick={() => setSelectedConversationId(conversation.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage src="" />
                                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                                    {otherParticipant?.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                {conversation.unreadCount > 0 && (
                                  <Badge className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center p-0">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <h4 className="font-semibold text-gray-900 truncate">
                                    {otherParticipant?.name}
                                  </h4>
                                  <span className="text-[11px] text-gray-500 ml-2 whitespace-nowrap">
                                    {formatTime(conversation.lastMessageAt)}
                                  </span>
                                </div>

                                <p className="text-xs text-gray-500 truncate mb-1">
                                  {otherParticipant?.university}
                                </p>

                                <div className="truncate">
                                  {lastPreview}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            {selectedConversationId && selectedConversation ? (
              <div className="flex-1 flex flex-col min-h-0 max-h-full overflow-hidden">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="lg:hidden"
                        onClick={() => setSelectedConversationId(null)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      
                      <Avatar className="w-10 h-10">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                          {selectedConversation.participants[0]?.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {selectedConversation.participants[0]?.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {selectedConversation.participants[0]?.university}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Video className="w-4 h-4" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="gap-2"
                            onClick={() => {
                              const selectedConv = conversations?.find(c => c.id === selectedConversationId);
                              const otherParticipant = selectedConv?.participants.find(p => p.id !== currentUserProfile?._id);
                              if (otherParticipant) {
                                router.push(`/profile/${otherParticipant.id}`);
                              }
                            }}
                          >
                            <Info className="w-4 h-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2"
                            onClick={handleArchiveConversation}
                          >
                            <Archive className="w-4 h-4" />
                            Archive Chat
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Flag className="w-4 h-4" />
                            Report
                          </DropdownMenuItem>
                          <Separator />
                          <DropdownMenuItem 
                            className="gap-2 text-red-600"
                            onClick={() => {
                              setUserToBlock({
                                id: selectedConversation.participants[0]?.id,
                                name: selectedConversation.participants[0]?.name,
                              });
                              setShowBlockDialog(true);
                            }}
                          >
                            <Blocks className="w-4 h-4" />
                            Block User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {selectedConversation.metadata.initiatedVia && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {getInitiatedViaText(selectedConversation.metadata.initiatedVia)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 min-h-0 max-h-full">
                  <div className="p-4">
                    <div className="space-y-4">
                    {messages?.map((message) => {
                      const isOwn = message.sender?.id === currentUserProfile?._id;
                      const isSystem = message.content.type === "system";
                      
                      if (isSystem) {
                        return (
                          <div key={message.id} className="flex justify-center">
                            <div className="bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-600 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              {message.content.text}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-xs lg:max-w-md flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                            {!isOwn && (
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs">
                                  {message.sender?.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div className={`rounded-lg p-3 ${
                              isOwn 
                                ? "bg-blue-600 text-white" 
                                : "bg-gray-100 text-gray-900"
                            }`}>
                              {message.replyToMessage && (
                                <div className={`text-xs mb-2 p-2 rounded border-l-2 ${
                                  isOwn 
                                    ? "bg-blue-500 border-blue-400" 
                                    : "bg-gray-50 border-gray-300"
                                }`}>
                                  <div className="font-medium">
                                    {message.replyToMessage.sender?.name}
                                  </div>
                                  <div className="opacity-75">
                                    {message.replyToMessage.text}
                                  </div>
                                </div>
                              )}
                              
                              {/* Render different message types */}
                              {message.content.type === "image" && message.content.metadata?.imageUrl ? (
                                <div className="mb-2">
                                  <img 
                                    src={message.content.metadata.imageUrl} 
                                    alt={message.content.metadata?.fileName || "Shared image"}
                                    className="max-w-xs rounded-lg"
                                  />
                                  {message.content.text && (
                                    <p className="text-sm mt-2">{message.content.text}</p>
                                  )}
                                </div>
                              ) : message.content.type === "image" && message.content.metadata?.fileUrl ? (
                                <div className="mb-2">
                                  <img 
                                    src={message.content.metadata.fileUrl} 
                                    alt={message.content.metadata?.fileName || "Shared image"}
                                    className="max-w-xs rounded-lg"
                                  />
                                  {message.content.text && (
                                    <p className="text-sm mt-2">{message.content.text}</p>
                                  )}
                                </div>
                              ) : message.content.type === "file" ? (
                                <div className="mb-2 p-2 border rounded-lg bg-opacity-20 bg-white">
                                  <div className="flex items-center gap-2">
                                    <File className="w-4 h-4" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{message.content.metadata?.fileName}</p>
                                      <p className="text-xs opacity-75">
                                        {message.content.metadata?.fileSize ? 
                                          `${(message.content.metadata.fileSize / 1024).toFixed(1)} KB` : 
                                          'File'
                                        }
                                      </p>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                      <Download className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm">{message.content.text}</p>
                              )}
                              
                              {message.isEncrypted && (
                                <div className={`text-xs mt-1 flex items-center gap-1 ${
                                  isOwn ? "text-blue-200" : "text-gray-500"
                                }`}>
                                  <Shield className="w-3 h-3" />
                                  Encrypted
                                </div>
                              )}
                              
                              <div className={`text-xs mt-1 ${
                                isOwn ? "text-blue-200" : "text-gray-500"
                              }`}>
                                {formatTime(message.sentAt)}
                                {message.editedAt && " (edited)"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* bottom anchor for auto scroll */}
                    <div ref={messagesEndRef} />
                    </div>
                  </div>
                </ScrollArea>

                {/* Image Preview */}
                {selectedImages.length > 0 && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
                          setSelectedImages([]);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                      {selectedImages.map((image, index) => (
                        <div
                          key={image.id}
                          className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', index.toString());
                            setIsDragging(true);
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                            if (dragIndex !== index) {
                              reorderImages(dragIndex, index);
                            }
                            setIsDragging(false);
                          }}
                          onDragEnd={() => setIsDragging(false)}
                        >
                          <div className="aspect-square relative">
                            <img
                              src={image.preview}
                              alt={image.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="bg-white/90 hover:bg-white text-gray-700"
                                  onClick={() => removeImage(image.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                                <div className="bg-white/90 rounded p-1">
                                  <GripVertical className="w-3 h-3 text-gray-500" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="p-2">
                            <p className="text-xs text-gray-600 truncate" title={image.name}>
                              {image.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {(image.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Drag to reorder • Click X to remove
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
                            setSelectedImages([]);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={sendSelectedImages}
                          disabled={uploadingFile}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {uploadingFile ? "Sending..." : `Send ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''}`}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-end gap-2 relative">
                    {/* File Upload */}
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        multiple
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex-1">
                      <Textarea
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (selectedImages.length > 0) {
                              sendSelectedImages();
                            } else {
                              handleSendMessage();
                            }
                          }
                        }}
                        className="resize-none"
                        rows={1}
                      />
                    </div>
                    
                    {/* Emoji Picker */}
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile className="w-4 h-4" />
                      </Button>
                      
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 right-0 z-50">
                          <EmojiPicker
                            onEmojiClick={handleEmojiSelect}
                            width={300}
                            height={400}
                          />
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => {
                        if (selectedImages.length > 0) {
                          sendSelectedImages();
                        } else {
                          handleSendMessage();
                        }
                      }}
                      disabled={(!messageText.trim() && selectedImages.length === 0) || uploadingFile}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {uploadingFile ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // No conversation selected
              <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-500">
                    Choose a conversation from the sidebar to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Conversation Dialog */}
        <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
              <DialogDescription>
                Choose a friend to start messaging with
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {friendsWithoutConversations && friendsWithoutConversations.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {friendsWithoutConversations.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => handleStartConversation(friend.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                            {friend.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">{friend.name}</div>
                          <div className="text-sm text-gray-500">{friend.university}</div>
                        </div>
                      </div>
                      <MessageCircle className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {friends && friends.length > 0 ? "All friends have conversations" : "No friends yet"}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {friends && friends.length > 0 
                      ? "You already have conversations with all your friends" 
                      : "Add friends first to start conversations with them"
                    }
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewConversationDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block User Dialog */}
        <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Block User</DialogTitle>
              <DialogDescription>
                Are you sure you want to block {userToBlock?.name}? They won&apos;t be able to send you messages anymore.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBlockUser}>
                Block User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Blocked Users Management */}
        {blockedUsers && blockedUsers.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white rounded-lg shadow-lg border p-4 max-w-sm">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <UserX className="w-4 h-4" />
                Blocked Users ({blockedUsers.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {blockedUsers.map((blocked) => (
                  <div key={blocked.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {blocked.user?.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{blocked.user?.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblockUser(blocked.user?.id)}
                      className="text-xs"
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
