"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  Clock,
  MessageCircle,
  Shield
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Id } from "../../../convex/_generated/dataModel";

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Get friends list
  const friends = useQuery(api.friends.getFriends);

  // Get pending friend requests
  const pendingRequests = useQuery(api.friends.getPendingFriendRequests);

  // Search for users (only if query is long enough)
  const searchResults = useQuery(
    api.friends.searchUsers,
    searchQuery.length >= 2 ? { query: searchQuery, limit: 10 } : "skip"
  );

  // Mutations
  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
  const respondToRequest = useMutation(api.friends.respondToFriendRequest);
  const removeFriend = useMutation(api.friends.removeFriend);

  const handleSendRequest = async (receiverClerkId: string) => {
    try {
      await sendFriendRequest({ receiverClerkId });
      toast.success("Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request.");
    }
  };

  const handleRespondToRequest = async (connectionId: string, accept: boolean) => {
    try {
      await respondToRequest({ connectionId: connectionId as Id<"friendConnections">, accept });
      toast.success(accept ? "Friend request accepted!" : "Friend request declined.");
    } catch (error) {
      console.error("Error responding to friend request:", error);
      toast.error("Failed to respond to friend request.");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (confirm("Are you sure you want to remove this friend?")) {
      try {
        await removeFriend({ friendId: friendId as Id<"users"> });
        toast.success("Friend removed.");
      } catch (error) {
        console.error("Error removing friend:", error);
        toast.error("Failed to remove friend.");
      }
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(query.length >= 2);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Friends"
          description="Connect with other students and build your network"
        />

        <div className="space-y-8">
        
        {/* Search Section */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Search className="w-5 h-5 text-blue-600" />
              Find Friends
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Search for students by name to connect with them
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search for students by name..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                />
              </div>

              {isSearching && searchResults && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Search Results ({searchResults.length})
                  </h4>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No users found matching &quot;{searchQuery}&quot;</p>
                      <p className="text-gray-400 text-sm mt-1">Try searching with a different name</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {searchResults.map((result) => (
                        <div key={result.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-white font-semibold text-lg">
                                {result.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{result.name}</h3>
                              <p className="text-sm text-gray-600">
                                {result.university} • {result.year}
                              </p>
                            </div>
                          </div>

                        <div className="flex gap-2">
                          {result.friendshipStatus === "none" && (
                            <Button
                              size="sm"
                              onClick={() => handleSendRequest(result.clerkId)}
                              className="gap-2"
                            >
                              <UserPlus className="w-4 h-4" />
                              Add Friend
                            </Button>
                          )}
                          {result.friendshipStatus === "pending" && (
                            <Button size="sm" variant="outline" disabled>
                              <Clock className="w-4 h-4 mr-2" />
                              Request Sent
                            </Button>
                          )}
                          {result.friendshipStatus === "received_request" && (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  // Note: This would need a connection ID to work properly
                                  // For now, we'll show the user should go to pending requests section
                                  toast.info("Please respond to friend requests in the 'Pending Requests' section below.");
                                }}
                                className="text-green-600 hover:bg-green-50"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  toast.info("Please respond to friend requests in the 'Pending Requests' section below.");
                                }}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          {result.friendshipStatus === "friends" && (
                            <Badge variant="default">Friends</Badge>
                          )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {searchQuery.length > 0 && searchQuery.length < 2 && (
                <p className="text-gray-500 text-sm">
                  Type at least 2 characters to search for friends
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        {pendingRequests && (pendingRequests.received.length > 0 || pendingRequests.sent.length > 0) && (
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="w-5 h-5 text-orange-600" />
                Pending Requests
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Manage your incoming and outgoing friend requests
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-6">
                
                {/* Received Requests */}
                {pendingRequests.received.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-4 text-gray-900 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Received ({pendingRequests.received.length})
                    </h4>
                    <div className="space-y-3">
                      {pendingRequests.received.map((request) => (
                        <div key={request._id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-white font-semibold text-lg">
                                {request.requester?.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{request.requester?.name}</h4>
                              <p className="text-sm text-gray-600">
                                {request.requester?.university}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleRespondToRequest(request._id, true)}
                              className="gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRespondToRequest(request._id, false)}
                              className="gap-1"
                            >
                              <X className="w-4 h-4" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sent Requests */}
                {pendingRequests.sent.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-4 text-gray-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Sent ({pendingRequests.sent.length})
                    </h4>
                    <div className="space-y-3">
                      {pendingRequests.sent.map((request) => (
                        <div key={request._id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-white font-semibold text-lg">
                                {request.receiver?.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{request.receiver?.name}</h4>
                              <p className="text-sm text-gray-600">
                                {request.receiver?.university}
                              </p>
                            </div>
                          </div>
                          
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Friends List */}
        {friends && friends.length > 0 ? (
          <TooltipProvider>
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="w-5 h-5 text-green-600" />
                  My Friends ({friends.length})
                </CardTitle>
                <p className="text-gray-600 text-sm">
                  Your connected friends and study buddies
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-4 md:grid-cols-2">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-xl">
                          {friend.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{friend.name}</h3>
                        <p className="text-sm text-gray-600">
                          {friend.university} • {friend.year}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Friends since {new Date(friend.connectionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {friend.profileVisible ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            window.location.href = `/profile/${friend.id}`;
                          }}
                          className="gap-1"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Profile
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="gap-1 opacity-50 cursor-not-allowed"
                            >
                              <Shield className="w-4 h-4" />
                              Profile
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{friend.name} has turned off profile visibility</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="gap-1 text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </TooltipProvider>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                No friends yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start building your network by searching for and connecting with other students! 
                You can find classmates, study partners, and new friends.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  document.querySelector('input')?.focus();
                }}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                <Search className="w-4 h-4" />
                Find Friends
              </Button>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </AppLayout>
  );
}
