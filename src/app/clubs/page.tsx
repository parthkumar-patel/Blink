"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ExternalLink, Mail, MapPin, Instagram, Facebook, Linkedin, Twitter } from "lucide-react";
import { useState } from "react";

export default function ClubsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const allClubs = useQuery(api.clubs.getAllClubs);

  // Filter clubs by category
  const filteredClubs = selectedCategory 
    ? allClubs?.filter(club => club.categories.includes(selectedCategory))
    : allClubs;

  // Get all unique categories
  const allCategories = Array.from(
    new Set(allClubs?.flatMap(club => club.categories) || [])
  ).sort();

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'twitter': return <Twitter className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Student Clubs"
          description="Discover and connect with student organizations at UBC"
          showBreadcrumb={false}
        />

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Clubs ({allClubs?.length || 0})
            </Button>
            {allCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Clubs Grid */}
        {filteredClubs ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredClubs.map((club) => (
              <Card key={club._id} className="h-full flex flex-col">
                {club.image && (
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                    <Image
                      src={club.image}
                      alt={club.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                
                <CardHeader className="flex-1">
                  <CardTitle className="text-lg">{club.name}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {club.description}
                  </CardDescription>
                  
                  {/* Categories */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {club.categories.map((category) => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Location */}
                  {club.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{club.location.address}</span>
                    </div>
                  )}

                  {/* Contact */}
                  {club.contact.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Mail className="w-4 h-4" />
                      <a 
                        href={`mailto:${club.contact.email}`}
                        className="hover:text-blue-600 truncate"
                      >
                        {club.contact.email}
                      </a>
                    </div>
                  )}

                  {/* Social Media */}
                  <div className="flex gap-2 mb-4">
                    {club.websiteUrl && (
                      <a
                        href={club.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:text-blue-600 border rounded"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {Object.entries(club.socialMedia).map(([platform, url]) => 
                      url ? (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:text-blue-600 border rounded"
                        >
                          {getSocialIcon(platform)}
                        </a>
                      ) : null
                    )}
                  </div>

                  {/* AMS Link */}
                  <a
                    href={club.amsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View on AMS <ExternalLink className="w-3 h-3" />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading clubs...</p>
          </div>
        )}

        {filteredClubs && filteredClubs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {selectedCategory 
                ? `No clubs found in the "${selectedCategory}" category.`
                : "No clubs found. Try scraping club data from the admin panel."
              }
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}