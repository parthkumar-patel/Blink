"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { api } from "../../../convex/_generated/api";

export function MessageNotificationBadge() {
  const { user } = useUser();
  
  const conversations = useQuery(
    api.messaging.getUserConversations,
    user ? { limit: 20 } : "skip"
  );

  const totalUnreadCount = conversations?.reduce((total, conv) => total + conv.unreadCount, 0) || 0;

  if (totalUnreadCount === 0) {
    return null;
  }

  return (
    <Badge 
      variant="destructive" 
      className="ml-1 px-2 py-0.5 text-xs font-medium rounded-full"
    >
      {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
    </Badge>
  );
}
