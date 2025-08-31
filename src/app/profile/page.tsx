"use client";

import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "../../../convex/_generated/api";
import { 
  Edit, 
  Save, 
  X, 
  Settings, 
  Calendar, 
  MapPin, 
  Heart, 
  TrendingUp, 
  Users, 
  Star,
  Sparkles,
  ArrowRight,
  Clock
} from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/events/event-card";

const INTEREST_EMOJIS: Record<string, string> = {
  tech: '💻',
  career: '💼',
  academic: '📚',
  workshop: '🛠️',
  social: '🎉',
  cultural: '🌍',
  music: '🎵',
  arts: '🎨',
  sports: '⚽',
  food: '🍕',
  volunteering: '🤝',
  networking: '🤝',
  entrepreneurship: '🚀',
  research: '🔬',
  gaming: '🎮',
  photography: '📸',
  travel: '✈️',
};

export default function ProfilePage() {
  const { user } = useUser();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedInterests, setEditedInterests] = useState<string[]>([]);

  // Get user profile
  const userProfile = useQuery(
    api.users.getCurrentUser,
    user ? {} : "skip"
  );

  // Get personalized recommendations
  const recommendedEvents = useQuery(
    api.events.getPersonalizedEvents,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  // Get user's recent RSVPs
  const userRSVPs = useQuery(
    api.rsvps.getUserRSVPs,
    userProfile?._id ? { userId: userProfile._id } : "skip"
  );

  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  const availableInterests = [
    'tech', 'career', 'academic', 'workshop', 'social', 'cultural',
    'music', 'arts', 'sports', 'food', 'volunteering', 'networking',
    'entrepreneurship', 'research', 'gaming', 'photography', 'travel'
  ];

  const handleEditInterests = () => {
    setEditedInterests(userProfile?.interests || []);
    setIsEditing(true);
  };

  const handleSaveInterests = async () => {
    if (!user?.id) return;
    
    try {
      await updateUserProfile({
        clerkId: user.id,
        interests: editedInterests,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating interests:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedInterests([]);
  };

  const toggleInterest = (interest: string) => {
    setEditedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  // Redirect to setup page
  const handleCreateProfile = () => {
    router.push('/profile/setup');
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Please sign in</h2>
            <p className="text-gray-600">You need to be signed in to view your profile.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show loading state while profile is being fetched
  if (userProfile === undefined) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading your profile...</h2>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If user profile doesn't exist, show setup prompt instead of auto-redirecting
  if (userProfile === null) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
            <p className="text-gray-600 mb-6">
              Set up your profile to get personalized event recommendations and connect with other students.
            </p>
            <Button onClick={handleCreateProfile} size="lg">
              <Edit className="w-4 h-4 mr-2" />
              Set Up Profile
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Calculate profile completion
  const profileCompletion = () => {
    let score = 0;
    if (userProfile.name) score += 20;
    if (userProfile.university) score += 20;
    if (userProfile.year) score += 20;
    if (userProfile.interests && userProfile.interests.length > 0) score += 30;
    if (userProfile.location) score += 10;
    return score;
  };

  const completionScore = profileCompletion();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Your Profile"
          description="Manage your profile and discover personalized recommendations"
          actions={
            <div className="flex items-center gap-3">
              <Link href="/profile/setup">
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Completion */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Profile Completion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-gray-600">{completionScore}%</span>
                  </div>
                  <Progress value={completionScore} className="h-2" />
                  
                  {completionScore < 100 && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 mb-2">
                        Complete your profile to get better recommendations!
                      </p>
                      <Link href="/profile/setup">
                        <Button size="sm" className="w-full">
                          Complete Profile
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Profile Info */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {userProfile.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{userProfile.name}</h3>
                    <p className="text-sm text-gray-600">{userProfile.email}</p>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {userProfile.year || 'Year not specified'} at {userProfile.university}
                    </span>
                  </div>
                  
                  {userProfile.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{userProfile.location.address}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Member since {new Date(userProfile._creationTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  Activity Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{userRSVPs?.length || 0}</div>
                    <div className="text-xs text-gray-600">Events RSVPed</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">0</div>
                    <div className="text-xs text-gray-600">Events Created</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">0</div>
                    <div className="text-xs text-gray-600">Connections</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">0</div>
                    <div className="text-xs text-gray-600">Reviews</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Interests & Recommendations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interests */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    Your Interests
                  </CardTitle>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={handleEditInterests}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveInterests}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {userProfile.interests?.length > 0 ? (
                      userProfile.interests.map((interest) => (
                        <Badge key={interest} variant="secondary" className="text-sm py-1 px-3">
                          {INTEREST_EMOJIS[interest] || '🎯'} {interest}
                        </Badge>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">No interests selected yet</p>
                        <Button onClick={handleEditInterests}>
                          Add Your Interests
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Select your interests to get personalized event recommendations
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableInterests.map((interest) => (
                        <button
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={`p-3 rounded-lg border-2 transition-all text-left ${
                            editedInterests.includes(interest)
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="text-lg mb-1">{INTEREST_EMOJIS[interest] || '🎯'}</div>
                          <div className="font-medium text-sm capitalize">{interest}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personalized Recommendations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Recommended for You
                  </CardTitle>
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recommendedEvents && recommendedEvents.length > 0 ? (
                  <div className="space-y-4">
                    {recommendedEvents.slice(0, 3).map((event) => (
                      <div key={event._id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <Link href={`/events/${event._id}`}>
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                {event.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {event.description}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(event.startDate).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {event.location.name}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {event.rsvpCount} going
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                    
                    <div className="text-center pt-4">
                      <Link href="/dashboard">
                        <Button variant="outline">
                          See More Recommendations
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">
                      {userProfile.interests?.length === 0 
                        ? "Add interests to get personalized recommendations!"
                        : "No recommendations available yet. Check back soon!"
                      }
                    </p>
                    {userProfile.interests?.length === 0 && (
                      <Button onClick={handleEditInterests}>
                        Add Your Interests
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}