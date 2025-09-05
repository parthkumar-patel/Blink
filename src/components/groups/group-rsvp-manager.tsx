"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { 
  Users, 
  Plus, 
  UserPlus, 
  Crown,
  Calendar,
  Lock,
  Globe,
  Check,
  X,
  Settings,
  MessageCircle,
  Eye,
  User
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Id } from "../../../convex/_generated/dataModel";

interface GroupRSVPManagerProps {
  eventId: string;
  userRSVPStatus: "going" | "interested" | null;
}

export function GroupRSVPManager({ eventId, userRSVPStatus }: GroupRSVPManagerProps) {
  const { user } = useUser();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [maxMembers, setMaxMembers] = useState<number | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingGroupDetails, setViewingGroupDetails] = useState<any>(null);

  // Get user profile
  const userProfile = useQuery(api.users.getCurrentUser, user ? {} : "skip");

  // Get groups for this event
  const eventGroups = useQuery(api.groupRSVP.getEventGroups, {
    eventId: eventId as Id<"events">,
    includePrivate: false,
  });

  // Get user's groups
  const userGroups = useQuery(api.groupRSVP.getUserGroups);

  // Get user's friends for invitations
  const friends = useQuery(api.friends.getFriends);

  // Get detailed group information when viewing details
  const groupDetails = useQuery(
    api.groupRSVP.getGroupDetails,
    viewingGroupDetails ? { groupId: viewingGroupDetails._id } : "skip"
  );

  // Mutations
  const createGroup = useMutation(api.groupRSVP.createGroupRSVP);
  const joinGroup = useMutation(api.groupRSVP.joinGroup);
  const leaveGroup = useMutation(api.groupRSVP.leaveGroup);
  const inviteToGroup = useMutation(api.groupRSVP.inviteToGroup);

  // Check if user is in any group for this event
  const userEventGroup = userGroups?.find(ug => ug.group?.eventId === eventId);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !userProfile) return;

    setIsCreating(true);
    try {
      await createGroup({
        eventId: eventId as Id<"events">,
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        isPublic,
        maxMembers,
      });

      setShowCreateForm(false);
      setGroupName("");
      setGroupDescription("");
      setMaxMembers(undefined);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group. Make sure you've RSVP'd to the event first.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      await joinGroup({ groupId: groupId as Id<"groupRSVPs"> });
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("Failed to join group. Make sure you've RSVP'd to the event first.");
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (confirm("Are you sure you want to leave this group?")) {
      try {
        await leaveGroup({ groupId: groupId as Id<"groupRSVPs"> });
      } catch (error) {
        console.error("Error leaving group:", error);
        toast.error("Failed to leave group.");
      }
    }
  };

  // Don't show if user hasn't RSVP'd
  if (!userRSVPStatus || userRSVPStatus === "not_going") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Group RSVPs
        </CardTitle>
        <p className="text-sm text-gray-600">
          Join or create a group to attend this event with friends
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        
        {/* User's current group */}
        {userEventGroup && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                  {userEventGroup.group.name}
                  {userEventGroup.membership.role === "organizer" && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </h4>
                <p className="text-sm text-blue-700">
                  {userEventGroup.memberCount} member{userEventGroup.memberCount !== 1 ? 's' : ''}
                  {userEventGroup.group.maxMembers && ` • Max ${userEventGroup.group.maxMembers}`}
                </p>
                {userEventGroup.group.description && (
                  <p className="text-sm text-blue-600 mt-1">
                    {userEventGroup.group.description}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingGroupDetails(userEventGroup.group)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Members
                </Button>
                {userEventGroup.membership.role === "organizer" && friends && friends.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedGroup(userEventGroup.group)}
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleLeaveGroup(userEventGroup.group._id)}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                  Leave
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create new group */}
        {!userEventGroup && (
          <div>
            {!showCreateForm ? (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full gap-2"
                variant="outline"
              >
                <Plus className="w-4 h-4" />
                Create New Group
              </Button>
            ) : (
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Create a Group</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Study buddies, CS friends"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="What's this group about?"
                    className="w-full p-2 border border-gray-300 rounded resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={200}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Public group</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">
                      Others can discover and join
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max members
                    </label>
                    <input
                      type="number"
                      value={maxMembers || ""}
                      onChange={(e) => setMaxMembers(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="No limit"
                      min={2}
                      max={50}
                      className="w-24 p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || isCreating}
                    size="sm"
                    className="gap-2"
                  >
                    <Users className="w-4 h-4" />
                    {isCreating ? "Creating..." : "Create Group"}
                  </Button>
                  <Button
                    onClick={() => setShowCreateForm(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Public groups to join */}
        {!userEventGroup && eventGroups && eventGroups.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Join a Group</h4>
            <div className="space-y-3">
              {eventGroups.map((group) => (
                <div key={group._id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium">{group.name}</h5>
                        <Badge variant="outline" className="text-xs">
                          {group.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {group.isPublic ? "Public" : "Private"}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600">
                        {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                        {group.maxMembers && ` • Max ${group.maxMembers}`}
                      </p>
                      
                      {group.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {group.description}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-1">
                        Organized by {group.organizer?.name}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleJoinGroup(group._id)}
                      disabled={group.maxMembers ? group.memberCount >= group.maxMembers : false}
                      className="gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      {group.maxMembers && group.memberCount >= group.maxMembers ? "Full" : "Join"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!userEventGroup && (!eventGroups || eventGroups.length === 0) && !showCreateForm && (
          <div className="text-center py-6 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No groups for this event yet.</p>
            <p className="text-xs">Be the first to create one!</p>
          </div>
        )}

        {/* Friend invitation modal */}
        {selectedGroup && friends && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Invite Friends to {selectedGroup.name}</h3>
              </div>
              
              <div className="p-4 max-h-64 overflow-y-auto">
                {friends.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No friends to invite. Add friends to invite them to groups!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium text-sm">{friend.name}</p>
                          <p className="text-xs text-gray-500">{friend.university}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await inviteToGroup({
                                groupId: selectedGroup._id,
                                userIds: [friend.id],
                              });
                              toast.success(`Invited ${friend.name} to the group!`);
                            } catch (error) {
                              toast.error("Failed to send invitation.");
                            }
                          }}
                        >
                          Invite
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedGroup(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Group Details Modal */}
        {viewingGroupDetails && groupDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{groupDetails.group.name}</h3>
                    <p className="text-sm text-gray-600">
                      {groupDetails.members.filter(m => m.status === "accepted").length} member
                      {groupDetails.members.filter(m => m.status === "accepted").length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingGroupDetails(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                {groupDetails.group.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {groupDetails.group.description}
                  </p>
                )}
              </div>
              
              <div className="p-4">
                <h4 className="font-medium mb-3">Members</h4>
                <div className="space-y-3">
                  {groupDetails.members
                    .filter(member => member.status === "accepted")
                    .map((member) => (
                    <div key={member._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {member.user?.name?.charAt(0) || "?"}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {member.user?.name || "Private User"}
                            </span>
                            {member.role === "organizer" && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          {member.user && (
                            <p className="text-sm text-gray-600">
                              {member.user.university} • {member.user.year}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {member.user && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              window.location.href = `/profile/${member.user.id}`;
                            }}
                            className="gap-2"
                          >
                            <User className="w-4 h-4" />
                            Profile
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pending members */}
                {groupDetails.members.filter(m => m.status === "pending").length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 text-gray-600">
                      Pending Invitations ({groupDetails.members.filter(m => m.status === "pending").length})
                    </h4>
                    <div className="space-y-2">
                      {groupDetails.members
                        .filter(member => member.status === "pending")
                        .map((member) => (
                        <div key={member._id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 text-sm font-medium">
                              {member.user?.name?.charAt(0) || "?"}
                            </span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {member.user?.name || "Private User"} (invited)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setViewingGroupDetails(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
