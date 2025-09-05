"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import mapboxgl from "mapbox-gl";

interface LocationDetectorProps {
  onLocationDetected: (location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }) => void;
  onError?: (error: string) => void;
  currentLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  className?: string;
}

export function LocationDetector({
  onLocationDetected,
  onError,
  currentLocation,
  className = "",
}: LocationDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);

  // Initialize hidden map for geolocation (only if Mapbox token is available)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    // Check if Mapbox access token is available
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      console.log("Mapbox token not found, using browser geolocation only");
      return;
    }

    try {
      // Set Mapbox access token
      mapboxgl.accessToken = mapboxToken;
      
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [0, 0],
        zoom: 1,
      });

      // Create geolocate control with high precision settings
      geolocateRef.current = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000, // 1 minute cache
        },
        trackUserLocation: false,
        showUserLocation: false,
        showAccuracyCircle: false,
        fitBoundsOptions: {
          maxZoom: 15,
        },
      });

      mapRef.current.addControl(geolocateRef.current);

      // Set up event listeners
      geolocateRef.current.on("geolocate", (e: any) => {
        const { coords } = e;
        setIsDetecting(false);
        setError(null);
        setAccuracy(coords.accuracy);

        onLocationDetected({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
      });

      geolocateRef.current.on("error", (error: any) => {
        setIsDetecting(false);
        let errorMessage = "Unable to get your location";

        if (error.code === 1) {
          errorMessage =
            "Location access denied. Please enable location permissions in your browser settings.";
        } else if (error.code === 2) {
          errorMessage =
            "Location information is unavailable. Please check your internet connection.";
        } else if (error.code === 3) {
          errorMessage = "Location request timed out. Please try again.";
        } else if (error.message && error.message.includes('blocked')) {
          errorMessage = 
            "Location service blocked. Please disable ad blocker for this site or allow mapbox.com requests.";
        }

        setError(errorMessage);
        onError?.(errorMessage);
      });
    } catch (err) {
      console.error("Error initializing map for geolocation:", err);
      setError("Failed to initialize location services");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onLocationDetected, onError]);

  const handleDetectLocation = async () => {
    if (!geolocateRef.current) {
      // Fallback to browser geolocation
      setIsDetecting(true);
      setError(null);

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 60000,
            });
          }
        );

        setIsDetecting(false);
        setAccuracy(position.coords.accuracy);
        onLocationDetected({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      } catch (err: any) {
        setIsDetecting(false);
        let errorMessage = "Unable to get your location";

        if (err.code === 1) {
          errorMessage =
            "Location access denied. Please enable location permissions.";
        } else if (err.code === 2) {
          errorMessage = "Location information is unavailable.";
        } else if (err.code === 3) {
          errorMessage = "Location request timed out.";
        }

        setError(errorMessage);
        onError?.(errorMessage);
      }
      return;
    }

    setIsDetecting(true);
    setError(null);

    try {
      // Trigger Mapbox geolocation
      geolocateRef.current.trigger();
    } catch (err) {
      setIsDetecting(false);
      setError("Failed to detect location");
      onError?.("Failed to detect location");
    }
  };

  const getAccuracyText = (accuracy: number) => {
    if (accuracy < 10) return "Very High";
    if (accuracy < 50) return "High";
    if (accuracy < 100) return "Medium";
    return "Low";
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy < 10) return "text-green-600";
    if (accuracy < 50) return "text-blue-600";
    if (accuracy < 100) return "text-yellow-600";
    return "text-orange-600";
  };

  return (
    <div className={className}>
      {/* Hidden map container for Mapbox geolocation */}
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          width: "1px",
          height: "1px",
        }}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  Enable Location Services
                </h3>
                <p className="text-sm text-gray-600">
                  Get precise location to find events near you
                </p>
              </div>
            </div>

            {currentLocation ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Location Enabled
                  </span>
                </div>
                <div className="mt-1 text-xs text-green-700">
                  <div>
                    Coordinates: {currentLocation.latitude.toFixed(4)},{" "}
                    {currentLocation.longitude.toFixed(4)}
                  </div>
                  {accuracy && (
                    <div className="flex items-center gap-1 mt-1">
                      <span>Accuracy: {Math.round(accuracy)}m</span>
                      <span
                        className={`font-medium ${getAccuracyColor(accuracy)}`}
                      >
                        ({getAccuracyText(accuracy)})
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  className="mt-2 text-green-700 border-green-300 hover:bg-green-100"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3 h-3 mr-2" />
                      Update Location
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  className="w-full"
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Detecting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Detect My Location
                    </>
                  )}
                </Button>

                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>High accuracy GPS positioning</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>Secure HTTPS location access</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span>Location data stays private</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-red-800">
                      Location Error
                    </div>
                    <div className="text-xs text-red-700 mt-1">{error}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDetectLocation}
                  className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            )}

            {isDetecting && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-800">
                    Getting your precise location...
                  </span>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  This may take a few seconds for high accuracy
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
