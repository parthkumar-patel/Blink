"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { format } from "date-fns";

// Set Mapbox access token - only if available
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (mapboxToken) {
  mapboxgl.accessToken = mapboxToken;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  aiSummary?: string;
  startDate: number;
  endDate: number;
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    isVirtual: boolean;
  };
  organizer: {
    name: string;
    verified: boolean;
  };
  categories: string[];
  tags?: string[];
  price: {
    isFree: boolean;
    amount: number;
    currency?: string;
  };
  rsvpCount: number;
  capacity?: number;
  images?: string[];
}

interface EventMapProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onRSVP?: (eventId: string, status: "going" | "interested") => void;
  userRSVPs?: Record<string, "going" | "interested">;
  height?: string;
  center?: [number, number];
  zoom?: number;
}

// Helper function to create popup content
function createPopupContent(
  event: Event,
  options: {
    dateLabel: string;
    timeLabel: string;
    truncatedDescription: string;
    userRSVPStatus?: "going" | "interested";
  }
): string {
  const { dateLabel, timeLabel, truncatedDescription, userRSVPStatus } =
    options;

  return `
    <div class="event-popup-content" style="font-family: system-ui, -apple-system, sans-serif;">
      <div class="p-4 max-w-sm">
        ${
          event.images && event.images.length > 0
            ? `
          <div class="mb-3">
            <img src="${event.images[0]}" alt="${event.title}" 
                 style="width: 100%; height: 128px; object-fit: cover; border-radius: 8px;" />
          </div>
        `
            : ""
        }
        
        <h3 style="font-weight: 700; font-size: 18px; margin-bottom: 8px; color: #111827; line-height: 1.25;">
          ${event.title}
        </h3>
        
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px;">
          ${event.categories
            .slice(0, 2)
            .map(
              (category) => `
            <span style="background-color: ${getCategoryColor(category)}20; color: ${getCategoryColor(category)}; padding: 4px 8px; font-size: 12px; border-radius: 9999px;">
              ${category}
            </span>
          `
            )
            .join("")}
          ${
            event.categories.length > 2
              ? `
            <span style="background-color: #f3f4f6; color: #4b5563; padding: 4px 8px; font-size: 12px; border-radius: 9999px;">
              +${event.categories.length - 2}
            </span>
          `
              : ""
          }
        </div>
        
        <div style="margin-bottom: 12px;">
          <div style="display: flex; align-items: center; font-size: 14px; color: #4b5563; margin-bottom: 4px;">
            <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span>${dateLabel}</span>
          </div>
          
          <div style="display: flex; align-items: center; font-size: 14px; color: #4b5563; margin-bottom: 4px;">
            <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${timeLabel}</span>
          </div>
          
          <div style="display: flex; align-items: center; font-size: 14px; color: #4b5563; margin-bottom: 4px;">
            <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${event.location.name}
            </span>
          </div>
          
          <div style="display: flex; align-items: center; font-size: 14px; color: #4b5563;">
            <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <span>
              ${event.organizer.name}
              ${event.organizer.verified ? '<span style="color: #3b82f6;">✓</span>' : ""}
            </span>
          </div>
        </div>
        
        <p style="font-size: 14px; color: #374151; margin-bottom: 12px; line-height: 1.5;">
          ${truncatedDescription}
        </p>
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-weight: 600; font-size: 18px; color: ${event.price.isFree ? "#059669" : "#ea580c"};">
              ${event.price.isFree ? "Free" : `$${event.price.amount}`}
            </span>
            <div style="display: flex; align-items: center; font-size: 14px; color: #6b7280;">
              <svg style="width: 16px; height: 16px; margin-right: 4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <span>${event.rsvpCount} going</span>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button id="going-btn-${event._id}" 
                  style="flex: 1; padding: 8px 12px; font-size: 14px; font-weight: 500; border-radius: 8px; border: none; cursor: pointer; transition: background-color 0.2s; ${
                    userRSVPStatus === "going"
                      ? "background-color: #2563eb; color: white;"
                      : "background-color: #eff6ff; color: #2563eb;"
                  }">
            ${userRSVPStatus === "going" ? "Going ✓" : "Going"}
          </button>
          
          <button id="interested-btn-${event._id}" 
                  style="flex: 1; padding: 8px 12px; font-size: 14px; font-weight: 500; border-radius: 8px; border: none; cursor: pointer; transition: background-color 0.2s; ${
                    userRSVPStatus === "interested"
                      ? "background-color: #16a34a; color: white;"
                      : "background-color: #f0fdf4; color: #16a34a;"
                  }">
            ${userRSVPStatus === "interested" ? "Interested ✓" : "Interested"}
          </button>
          
          <button id="view-details-btn-${event._id}" 
                  style="padding: 8px 12px; font-size: 14px; font-weight: 500; color: #4b5563; background-color: #f9fafb; border-radius: 8px; border: none; cursor: pointer; transition: background-color 0.2s;">
            Details
          </button>
        </div>
      </div>
    </div>
  `;
}

export default function EventMap({
  events,
  onEventClick,
  onRSVP,
  userRSVPs = {},
  height = "400px",
  center = [-123.246, 49.2606], // UBC coordinates
  zoom = 12,
}: EventMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Don't initialize map if no token is available
    if (!mapboxToken) {
      console.log("Mapbox token not available, map will not be displayed");
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: center,
        zoom: zoom,
        pitch: 45, // 3D tilt
        bearing: 0,
        antialias: true, // Better rendering
      });
    } catch (error) {
      console.error("Error initializing Mapbox map:", error);
      return;
    }

    map.current.on("load", () => {
      // Add 3D buildings layer
      if (map.current) {
        map.current.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.6,
          },
        });
      }
      setIsLoaded(true);
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom]);

  // Update markers when events change
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add new markers
    events.forEach((event) => {
      if (event.location.isVirtual) return; // Skip virtual events

      // Create marker element
      const markerElement = document.createElement("div");
      markerElement.className = "event-marker";
      markerElement.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${getCategoryColor(event.categories[0])};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: white;
        font-weight: bold;
        transition: transform 0.2s ease;
      `;
      markerElement.innerHTML = getCategoryIcon(event.categories[0]);

      // Add hover effect
      markerElement.addEventListener("mouseenter", () => {
        markerElement.style.transform = "scale(1.1)";
      });
      markerElement.addEventListener("mouseleave", () => {
        markerElement.style.transform = "scale(1)";
      });

      // Format dates
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      const dateLabel = format(startDate, "MMM d, yyyy");
      const timeLabel = `${format(startDate, "h:mm a")} - ${format(endDate, "h:mm a")}`;

      // Get user RSVP status
      const userRSVPStatus = userRSVPs[event._id];

      // Truncate description for popup
      const description = event.aiSummary || event.description;
      const truncatedDescription =
        description.length > 120
          ? description.substring(0, 120) + "..."
          : description;

      // Create comprehensive popup content
      const popupContent = createPopupContent(event, {
        dateLabel,
        timeLabel,
        truncatedDescription,
        userRSVPStatus,
      });

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        maxWidth: "320px",
        className: "event-popup",
      }).setHTML(popupContent);

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([event.location.longitude, event.location.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Add popup event listeners after it's added to DOM
      popup.on("open", () => {
        // Add event listeners for RSVP buttons
        const goingBtn = document.getElementById(`going-btn-${event._id}`);
        const interestedBtn = document.getElementById(
          `interested-btn-${event._id}`
        );
        const viewDetailsBtn = document.getElementById(
          `view-details-btn-${event._id}`
        );

        if (goingBtn && onRSVP) {
          goingBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            onRSVP(event._id, "going");
          });
        }

        if (interestedBtn && onRSVP) {
          interestedBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            onRSVP(event._id, "interested");
          });
        }

        if (viewDetailsBtn && onEventClick) {
          viewDetailsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            onEventClick(event);
          });
        }
      });

      // Add click handler for marker
      markerElement.addEventListener("click", () => {
        // Close other popups
        markers.current.forEach((m) => {
          const popup = m.getPopup();
          if (m !== marker && popup && popup.isOpen()) {
            popup.remove();
          }
        });
      });

      markers.current.push(marker);
    });

    // Fit map to show all markers if there are events
    if (events.length > 0) {
      const nonVirtualEvents = events.filter((e) => !e.location.isVirtual);
      if (nonVirtualEvents.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        nonVirtualEvents.forEach((event) => {
          bounds.extend([event.location.longitude, event.location.latitude]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }
    }
  }, [events, isLoaded, onEventClick, onRSVP, userRSVPs]);

  // Show fallback if no Mapbox token
  if (!mapboxToken) {
    return (
      <div className="relative">
        <div 
          style={{ height }} 
          className="w-full rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
        >
          <div className="text-center p-8">
            <div className="text-gray-600 text-lg font-medium mb-2">Map View Unavailable</div>
            <div className="text-gray-500 text-sm">
              Configure Mapbox access token to enable interactive maps
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        style={{ height }}
        className="w-full rounded-lg overflow-hidden"
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-gray-500">Loading map...</div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    tech: "#3B82F6", // blue
    career: "#10B981", // green
    music: "#8B5CF6", // purple
    sports: "#F59E0B", // amber
    food: "#EF4444", // red
    arts: "#EC4899", // pink
    academic: "#6366F1", // indigo
    social: "#06B6D4", // cyan
    volunteering: "#84CC16", // lime
    cultural: "#F97316", // orange
    workshop: "#6B7280", // gray
    networking: "#14B8A6", // teal
    gaming: "#A855F7", // violet
    wellness: "#22C55E", // green
  };
  return colors[category] || "#6B7280";
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    tech: "💻",
    career: "💼",
    music: "🎵",
    sports: "⚽",
    food: "🍕",
    arts: "🎨",
    academic: "📚",
    social: "👥",
    volunteering: "🤝",
    cultural: "🎭",
    workshop: "🔧",
    networking: "🤝",
    gaming: "🎮",
    wellness: "🧘",
  };
  return icons[category] || "📍";
}
