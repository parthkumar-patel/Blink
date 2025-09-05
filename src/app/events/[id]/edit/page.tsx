"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Tag,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

const CATEGORIES = [
  "tech",
  "career",
  "academic",
  "workshop",
  "social",
  "cultural",
  "music",
  "arts",
  "sports",
  "food",
  "volunteering",
  "networking",
  "entrepreneurship",
  "research",
  "gaming",
  "photography",
  "travel",
];

export default function EditEventPage() {
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    locationName: "",
    locationAddress: "",
    isVirtual: false,
    categories: [] as string[],
    tags: [] as string[],
    capacity: "",
    isFree: true,
    price: "",
    currency: "CAD",
    registrationUrl: "",
    websiteUrl: "",
    socialUrls: [] as string[],
  });

  // Get the event data
  const event = useQuery(
    api.events.getEvent,
    eventId ? { eventId: eventId as any } : "skip"
  );

  // Check if user can edit this event
  const canEdit = useQuery(
    api.events.canEditEvent,
    user?.id && eventId ? { eventId: eventId as any, clerkId: user.id } : "skip"
  );

  const updateEvent = useMutation(api.events.updateEvent);

  // Populate form when event data loads
  useEffect(() => {
    if (event) {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);

      setFormData({
        title: event.title,
        description: event.description,
        startDate: format(startDate, "yyyy-MM-dd"),
        startTime: format(startDate, "HH:mm"),
        endDate: format(endDate, "yyyy-MM-dd"),
        endTime: format(endDate, "HH:mm"),
        locationName: event.location.name,
        locationAddress: event.location.address,
        isVirtual: event.location.isVirtual,
        categories: event.categories,
        tags: event.tags,
        capacity: event.capacity?.toString() || "",
        isFree: event.price.isFree,
        price: event.price.amount.toString(),
        currency: event.price.currency,
        registrationUrl: event.externalLinks?.registration || "",
        websiteUrl: event.externalLinks?.website || "",
        socialUrls: event.externalLinks?.social || [],
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !eventId) return;

    setIsSubmitting(true);
    try {
      // Combine date and time
      const startDateTime = new Date(
        `${formData.startDate}T${formData.startTime}`
      ).getTime();
      const endDateTime = new Date(
        `${formData.endDate}T${formData.endTime}`
      ).getTime();

      await updateEvent({
        eventId: eventId as any,
        clerkId: user.id,
        title: formData.title,
        description: formData.description,
        startDate: startDateTime,
        endDate: endDateTime,
        location: {
          name: formData.locationName,
          address: formData.locationAddress,
          latitude: event?.location.latitude || 49.2606, // Keep existing coordinates
          longitude: event?.location.longitude || -123.246,
          isVirtual: formData.isVirtual,
        },
        categories: formData.categories,
        tags: formData.tags,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        price: {
          amount: formData.isFree ? 0 : parseFloat(formData.price),
          currency: formData.currency,
          isFree: formData.isFree,
        },
        externalLinks: {
          registration: formData.registrationUrl || undefined,
          website: formData.websiteUrl || undefined,
          social:
            formData.socialUrls.length > 0 ? formData.socialUrls : undefined,
        },
      });

      toast.success("Event updated successfully!");
      router.push("/my-events/manage");
    } catch (error: any) {
      console.error("Failed to update event:", error);
      toast.error(error.message || "Failed to update event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag.trim()],
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Please sign in to edit events.</p>
        </div>
      </AppLayout>
    );
  }

  if (event === undefined || canEdit === undefined) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Event not found</h2>
            <p className="text-gray-600 mb-4">
              The event you're looking for doesn't exist.
            </p>
            <Link href="/my-events/manage">
              <Button>Back to My Events</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!canEdit) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to edit this event.
            </p>
            <Link href="/my-events/manage">
              <Button>Back to My Events</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/my-events/manage">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Events
            </Button>
          </Link>
          <PageHeader
            title="Edit Event"
            description="Update your event details"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe your event"
                  rows={4}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isVirtual"
                  checked={formData.isVirtual}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isVirtual: checked }))
                  }
                />
                <Label htmlFor="isVirtual">This is a virtual event</Label>
              </div>

              {!formData.isVirtual && (
                <>
                  <div>
                    <Label htmlFor="locationName">Venue Name *</Label>
                    <Input
                      id="locationName"
                      value={formData.locationName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          locationName: e.target.value,
                        }))
                      }
                      placeholder="e.g., UBC Student Union Building"
                      required={!formData.isVirtual}
                    />
                  </div>

                  <div>
                    <Label htmlFor="locationAddress">Address *</Label>
                    <Input
                      id="locationAddress"
                      value={formData.locationAddress}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          locationAddress: e.target.value,
                        }))
                      }
                      placeholder="e.g., 6138 Student Union Blvd, Vancouver, BC"
                      required={!formData.isVirtual}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Categories & Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Categories & Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Categories *</Label>
                <p className="text-sm text-gray-600 mb-3">
                  Select all that apply
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`p-2 text-sm rounded-lg border transition-colors ${
                        formData.categories.includes(category)
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <p className="text-sm text-gray-600 mb-3">
                  Add custom tags (press Enter to add)
                </p>
                <Input
                  placeholder="Add a tag..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                />
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags.map((tag, index) => (
                      <Badge
                        key={`tag-${index}`}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Capacity & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Capacity & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="capacity">Event Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      capacity: e.target.value,
                    }))
                  }
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isFree"
                  checked={formData.isFree}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isFree: checked }))
                  }
                />
                <Label htmlFor="isFree">This is a free event</Label>
              </div>

              {!formData.isFree && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      required={!formData.isFree}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          currency: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="CAD">CAD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* External Links */}
          <Card>
            <CardHeader>
              <CardTitle>External Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="registrationUrl">Registration URL</Label>
                <Input
                  id="registrationUrl"
                  type="url"
                  value={formData.registrationUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      registrationUrl: e.target.value,
                    }))
                  }
                  placeholder="https://example.com/register"
                />
              </div>

              <div>
                <Label htmlFor="websiteUrl">Event Website</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      websiteUrl: e.target.value,
                    }))
                  }
                  placeholder="https://example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Link href="/my-events/manage">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Event
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
