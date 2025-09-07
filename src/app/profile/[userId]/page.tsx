"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  User,
  Calendar,
  GraduationCap,
  Star,
  Heart,
  Users,
  Award,
  Activity,
  MessageCircle,
  UserPlus,
  Shield,
  Clock,
  ArrowLeft
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const userId = params.userId as string;
  const sendFriendRequest = useMutation(api.friends.sendFriendRequest);
  const createOrGetConversation = useMutation(api.messaging.createOrGetConversation);

  // Get the user profile
  const userProfile = useQuery(api.users.getUserById, { 
    userId: userId as Id<"users"> 
  });

  // Get current user profile for comparison
  const currentUserProfile = useQuery(api.users.getCurrentUser, currentUser ? {} : "skip");

  // Get user's attendance stats
  const attendanceStats = useQuery(api.attendance.getUserAttendanceStats, {
    userId: userId as Id<"users">
  });

  // Get user's recent attendance history
  const attendanceHistory = useQuery(api.attendance.getUserAttendanceHistory, {
    userId: userId as Id<"users">,
    limit: 10
  });

  // Get mutual friends if not viewing own profile
  const mutualFriends = useQuery(
    api.friends.getMutualFriends,
    currentUserProfile && userProfile && currentUserProfile._id !== userProfile._id
      ? { otherUserId: userId as Id<"users"> }
      : "skip"
  );

  // Get friendship status
  const friendshipStatus = useQuery(
    api.friends.getFriendshipStatus,
    currentUserProfile && userProfile && currentUserProfile._id !== userProfile._id
      ? { otherUserId: userId as Id<"users"> }
      : "skip"
  );

  const handleSendFriendRequest = async () => {
    if (!currentUser?.id || !userProfile?.clerkId) return;
    
    try {
      await sendFriendRequest({
        receiverClerkId: userProfile.clerkId,
      });
      toast.success(`Friend request sent to ${userProfile.name}!`);
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request. Please try again.");
    }
  };

  const handleMessage = async () => {
    if (!currentUserProfile?._id || !userProfile?._id) return;
    
    try {
      await createOrGetConversation({
        participantIds: [currentUserProfile._id, userProfile._id],
        initiatedVia: "profile_message",
      });
      
      toast.success("Opening conversation...");
      router.push("/messages");
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to start conversation. Please try again.");
    }
  };

  if (!userProfile) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                User not found
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                This user profile doesn&apos;t exist or is private. They may have restricted their profile visibility in their privacy settings.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isOwnProfile = currentUserProfile?._id === userProfile._id;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>

        <div className="space-y-8">
        {/* Profile Header */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-3xl">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                <div className="text-center sm:text-left">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {userProfile.name}
                  </h1>
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{userProfile.university}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <span className="font-medium">{userProfile.year}</span>
                    </div>
                  </div>
                  
                  {userProfile.interests && userProfile.interests.length > 0 && (
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      {userProfile.interests.slice(0, 6).map((interest, index) => (
                        <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                          {interest}
                        </Badge>
                      ))}
                      {userProfile.interests.length > 6 && (
                        <Badge variant="outline" className="text-sm px-3 py-1">
                          +{userProfile.interests.length - 6} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!isOwnProfile && (
                <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
                  {friendshipStatus === "none" && (
                    <Button 
                      onClick={handleSendFriendRequest}
                      className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </Button>
                  )}
                  {friendshipStatus === "pending" && (
                    <Button variant="outline" disabled className="gap-2">
                      <Clock className="w-4 h-4" />
                      Request Sent
                    </Button>
                  )}
                  {friendshipStatus === "received_request" && (
                    <Button variant="outline" className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Respond to Request
                    </Button>
                  )}
                  {friendshipStatus === "friends" && (
                    <Button 
                      onClick={handleMessage}
                      variant="outline" 
                      className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </Button>
                  )}
                  <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                    <Shield className="w-4 h-4" />
                    Report
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Activity Stats */}
            {attendanceStats && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Activity className="w-6 h-6 text-purple-600" />
                    Activity Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {attendanceStats.totalEventsAttended}
                      </div>
                      <div className="text-sm font-medium text-blue-700">Events Attended</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {Math.round(attendanceStats.attendanceRate * 100)}%
                      </div>
                      <div className="text-sm font-medium text-green-700">Attendance Rate</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-3xl font-bold text-yellow-600 mb-1">
                        {attendanceStats.averageRatingGiven?.toFixed(1) || "N/A"}
                      </div>
                      <div className="text-sm font-medium text-yellow-700">Avg Rating Given</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600 mb-1">
                        {attendanceStats.feedbackGiven}
                      </div>
                      <div className="text-sm font-medium text-purple-700">Feedback Given</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Events */}
            {attendanceHistory && attendanceHistory.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Award className="w-6 h-6 text-orange-600" />
                    Recent Events Attended
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {attendanceHistory.slice(0, 5).map((attendance) => (
                      <div key={attendance._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div>
                          <h4 className="font-semibold text-gray-900">{attendance.event?.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Attended on {new Date(attendance.confirmedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {attendance.rating && (
                          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">{attendance.rating}/5</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Mutual Friends */}
            {mutualFriends && mutualFriends.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                    Mutual Friends ({mutualFriends.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {mutualFriends.slice(0, 6).map((friend) => (
                      <div key={friend.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {friend.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">{friend.name}</span>
                        </div>
                      </div>
                    ))}
                    {mutualFriends.length > 6 && (
                      <p className="text-sm text-gray-500 mt-3 text-center">
                        +{mutualFriends.length - 6} more mutual friends
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interests */}
            {userProfile.interests && userProfile.interests.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="w-5 h-5 text-red-500" />
                    Interests
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {userProfile.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1.5 text-sm hover:bg-gray-200 transition-colors">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Notice */}
            {!isOwnProfile && (
              <Card className="shadow-sm border-dashed">
                <CardContent className="p-6 text-center">
                  <Shield className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <h4 className="font-medium text-gray-700 mb-2">Privacy Protected</h4>
                  <p className="text-sm text-gray-500">
                    This profile respects user privacy settings. Some information may be limited based on their preferences.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
      </div>
    </AppLayout>
  );
}
