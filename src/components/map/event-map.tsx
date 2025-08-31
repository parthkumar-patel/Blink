"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

interface Event {
  _id: string;
  title: string;
  description: string;
  startDate: number;
  location: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    isVirtual: boolean;
  };
  categories: string[];
  price: {
    isFree: boolean;
    amount: number;
  };
}

interface EventMapProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  height?: string;
  center?: [number, number];
  zoom?: number;
}

export default function EventMap({
  events,
  onEventClick,
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

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: center,
      zoom: zoom,
      pitch: 45, // 3D tilt
      bearing: 0,
      antialias: true, // Better rendering
    });

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
              ["get", "height"]
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "min_height"]
            ],
            "fill-extrusion-opacity": 0.6
          }
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
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background-color: ${getCategoryColor(event.categories[0])};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
        font-weight: bold;
      `;
      markerElement.innerHTML = getCategoryIcon(event.categories[0]);

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(`
        <div class="p-3 max-w-xs">
          <h3 class="font-semibold text-sm mb-1">${event.title}</h3>
          <p class="text-xs text-gray-600 mb-2">${event.location.name}</p>
          <p class="text-xs text-gray-500 mb-2">${new Date(
            event.startDate
          ).toLocaleDateString()}</p>
          <div class="flex items-center justify-between">
            <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              ${event.categories[0]}
            </span>
            <span class="text-xs font-medium ${
              event.price.isFree ? "text-green-600" : "text-orange-600"
            }">
              ${event.price.isFree ? "Free" : `$${event.price.amount}`}
            </span>
          </div>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([event.location.longitude, event.location.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Add click handler
      markerElement.addEventListener("click", () => {
        if (onEventClick) {
          onEventClick(event);
        }
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
  }, [events, isLoaded, onEventClick]);

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