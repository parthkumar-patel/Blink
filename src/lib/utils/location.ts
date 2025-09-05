/**
 * Calculate the distance between two geographic points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Get user's current location using the Geolocation API with high accuracy
 * @returns Promise that resolves to user's coordinates with accuracy info
 */
export function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage = "Unable to get your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please enable location permissions in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              "Location information is unavailable. Please try again.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000, // 1 minute cache
      }
    );
  });
}

/**
 * Get user's current location using Mapbox GeolocateControl for higher precision
 * This creates a temporary map instance to use Mapbox's geolocation capabilities
 * @returns Promise that resolves to user's coordinates with high accuracy
 */
export function getMapboxLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number;
}> {
  return new Promise((resolve, reject) => {
    // Check if mapbox is available and token is configured
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (typeof window === "undefined" || !window.mapboxgl || !mapboxToken) {
      // Fallback to regular geolocation
      return getCurrentLocation().then(resolve).catch(reject);
    }

    try {
      // Set Mapbox token
      window.mapboxgl.accessToken = mapboxToken;
      
      // Create a temporary hidden map container
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.top = "-9999px";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = "1px";
      tempContainer.style.height = "1px";
      document.body.appendChild(tempContainer);

      // Create temporary map
      const tempMap = new window.mapboxgl.Map({
        container: tempContainer,
        style: "mapbox://styles/mapbox/light-v11",
        center: [0, 0],
        zoom: 1,
      });

      // Create geolocate control with high accuracy
      const geolocate = new window.mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        },
        trackUserLocation: false,
        showUserLocation: false,
        showAccuracyCircle: false,
      });

      // Add control to map
      tempMap.addControl(geolocate);

      // Set up event listeners
      geolocate.on("geolocate", (e) => {
        const { coords } = e;

        // Clean up
        tempMap.remove();
        document.body.removeChild(tempContainer);

        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
      });

      geolocate.on("error", (error) => {
        // Clean up
        tempMap.remove();
        document.body.removeChild(tempContainer);

        let errorMessage = "Unable to get your location";
        if (error.code === 1) {
          errorMessage =
            "Location access denied. Please enable location permissions.";
        } else if (error.code === 2) {
          errorMessage = "Location information is unavailable.";
        } else if (error.code === 3) {
          errorMessage = "Location request timed out.";
        }

        reject(new Error(errorMessage));
      });

      // Wait for map to load, then trigger geolocation
      tempMap.on("load", () => {
        // Trigger the geolocation
        geolocate.trigger();
      });

      // Fallback timeout
      setTimeout(() => {
        if (tempMap && tempContainer.parentNode) {
          tempMap.remove();
          document.body.removeChild(tempContainer);
          reject(new Error("Location request timed out"));
        }
      }, 20000);
    } catch (error) {
      // Fallback to regular geolocation if Mapbox fails
      getCurrentLocation().then(resolve).catch(reject);
    }
  });
}

/**
 * Filter events by distance from a given location
 * @param events Array of events to filter
 * @param userLocation User's current location
 * @param maxDistance Maximum distance in kilometers
 * @returns Filtered events with distance information
 */
export function filterEventsByDistance<
  T extends {
    location: {
      latitude: number;
      longitude: number;
      isVirtual: boolean;
    };
  },
>(
  events: T[],
  userLocation: { latitude: number; longitude: number },
  maxDistance: number
): (T & { distance: number })[] {
  return events
    .map((event) => {
      // Virtual events have no distance
      if (event.location.isVirtual) {
        return { ...event, distance: 0 };
      }

      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        event.location.latitude,
        event.location.longitude
      );

      return { ...event, distance };
    })
    .filter(
      (event) => event.location.isVirtual || event.distance <= maxDistance
    )
    .sort((a, b) => a.distance - b.distance); // Sort by distance
}
