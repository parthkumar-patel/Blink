"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Bell, Shield, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { LocationDetector } from "@/components/location/location-detector";

interface PreferencesFormProps {
  onSave?: () => void;
}

export function PreferencesForm({ onSave }: PreferencesFormProps) {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);
  const updatePreferences = useMutation(api.users.updateUserPreferences);
  const updateUserLocation = useMutation(api.users.updateUserLocation);

  const [isLoading, setIsLoading] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [preferences, setPreferences] = useState({
    maxDistance: currentUser?.preferences?.maxDistance || 25,
    notificationSettings: {
      email: currentUser?.preferences?.notificationSettings?.email ?? true,
      push: currentUser?.preferences?.notificationSettings?.push ?? true,
      sms: currentUser?.preferences?.notificationSettings?.sms ?? false,
    },
    privacySettings: {
      profileVisible:
        currentUser?.preferences?.privacySettings?.profileVisible ?? true,
      showInBuddyMatching:
        currentUser?.preferences?.privacySettings?.showInBuddyMatching ?? true,
    },
    buddyMatchingEnabled:
      currentUser?.preferences?.buddyMatchingEnabled ?? true,
  });

  // Update local state when user data loads
  useEffect(() => {
    if (currentUser?.preferences) {
      setPreferences({
        maxDistance: currentUser.preferences.maxDistance,
        notificationSettings: currentUser.preferences.notificationSettings,
        privacySettings: currentUser.preferences.privacySettings,
        buddyMatchingEnabled: currentUser.preferences.buddyMatchingEnabled,
      });
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      await updatePreferences({
        clerkId: user.id,
        preferences,
      });

      toast.success("Preferences updated successfully!");
      onSave?.();
    } catch (error) {
      console.error("Failed to update preferences:", error);
      toast.error("Failed to update preferences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateNotificationSetting = (
    key: keyof typeof preferences.notificationSettings,
    value: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [key]: value,
      },
    }));
  };

  const updatePrivacySetting = (
    key: keyof typeof preferences.privacySettings,
    value: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings,
        [key]: value,
      },
    }));
  };

  const handleLocationDetected = async (location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }) => {
    if (!user?.id) return;

    try {
      await updateUserLocation({
        clerkId: user.id,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: "Vancouver, BC (Current Location)",
        },
      });

      setLocationAccuracy(location.accuracy || null);
      toast.success("Location updated successfully!");
    } catch (error) {
      console.error("Failed to update location:", error);
      toast.error("Failed to update location. Please try again.");
    }
  };

  const handleLocationError = (error: string) => {
    console.error("Location detection error:", error);
    toast.error("Unable to detect location. Please try again.");
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Distance Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Event Discovery Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="distance-slider">
              Maximum Distance for Event Recommendations
            </Label>
            <div className="px-3">
              <Slider
                id="distance-slider"
                min={1}
                max={100}
                step={1}
                value={[preferences.maxDistance]}
                onValueChange={(value) =>
                  setPreferences((prev) => ({ ...prev, maxDistance: value[0] }))
                }
                className="w-full"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Show events within {preferences.maxDistance} km of your location
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Update Your Location</Label>
            <p className="text-sm text-muted-foreground">
              Update your location for more accurate event recommendations. We
              use high-precision GPS for the best results.
            </p>

            <LocationDetector
              onLocationDetected={handleLocationDetected}
              onError={handleLocationError}
              currentLocation={
                currentUser?.location?.latitude &&
                currentUser?.location?.longitude
                  ? {
                      latitude: currentUser.location.latitude,
                      longitude: currentUser.location.longitude,
                    }
                  : null
              }
              className="mt-4"
            />

            {currentUser?.location && locationAccuracy && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">Location Recently Updated</span>
                </div>
                <div className="text-sm text-blue-700">
                  <div>Address: {currentUser.location.address}</div>
                  <div>
                    Accuracy: {Math.round(locationAccuracy)}m (
                    {locationAccuracy < 10
                      ? "Very High"
                      : locationAccuracy < 50
                        ? "High"
                        : locationAccuracy < 100
                          ? "Medium"
                          : "Low"}{" "}
                    precision)
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive event reminders and updates via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={preferences.notificationSettings.email}
              onCheckedChange={(checked) =>
                updateNotificationSetting("email", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get real-time notifications in your browser
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={preferences.notificationSettings.push}
              onCheckedChange={(checked) =>
                updateNotificationSetting("push", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive important updates via text message
              </p>
            </div>
            <Switch
              id="sms-notifications"
              checked={preferences.notificationSettings.sms}
              onCheckedChange={(checked) =>
                updateNotificationSetting("sms", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Privacy & Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="profile-visible">Profile Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Allow other users to see your profile information
              </p>
            </div>
            <Switch
              id="profile-visible"
              checked={preferences.privacySettings.profileVisible}
              onCheckedChange={(checked) =>
                updatePrivacySetting("profileVisible", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="buddy-matching-visible">
                Show in Buddy Matching
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow others to find you as a potential event companion
              </p>
            </div>
            <Switch
              id="buddy-matching-visible"
              checked={preferences.privacySettings.showInBuddyMatching}
              onCheckedChange={(checked) =>
                updatePrivacySetting("showInBuddyMatching", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Buddy Matching Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Social Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="buddy-matching-enabled">
                Enable Buddy Matching
              </Label>
              <p className="text-sm text-muted-foreground">
                Get matched with other students for events you're both
                interested in
              </p>
            </div>
            <Switch
              id="buddy-matching-enabled"
              checked={preferences.buddyMatchingEnabled}
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({
                  ...prev,
                  buddyMatchingEnabled: checked,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
