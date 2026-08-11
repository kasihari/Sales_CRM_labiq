// Geolocation helpers built on the browser Geolocation API + Google Geocoding.

export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string | null;
}

export class GeoError extends Error {
  code: "denied" | "unavailable" | "timeout" | "low_accuracy" | "unsupported";
  constructor(code: GeoError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "GeoError";
  }
}

// Accuracy (metres) worse than this is treated as "too low".
export const ACCURACY_THRESHOLD = 150;

// Grab a single GPS fix. Rejects with a typed GeoError.
export function getCurrentPosition(
  opts: { requireAccuracy?: boolean; timeout?: number } = {}
): Promise<GeoFix> {
  const { requireAccuracy = true, timeout = 20000 } = opts;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new GeoError("unsupported", "Geolocation is not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix: GeoFix = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        if (requireAccuracy && fix.accuracy > ACCURACY_THRESHOLD) {
          reject(
            new GeoError(
              "low_accuracy",
              `Location accuracy is low (±${Math.round(fix.accuracy)}m).`
            )
          );
          return;
        }
        resolve(fix);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeoError("denied", "Location permission denied."));
        } else if (err.code === err.TIMEOUT) {
          reject(new GeoError("timeout", "Timed out getting your location."));
        } else {
          reject(new GeoError("unavailable", "Location is unavailable."));
        }
      },
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );
  });
}

// Reverse-geocode to a human address using Google Geocoding API.
// Returns null (never throws) so a missing/blocked key can't break capture.
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
    );
    const data = await res.json();
    if (data.status === "OK" && data.results?.length) {
      return data.results[0].formatted_address as string;
    }
  } catch {
    // ignore — offline or key issue
  }
  return null;
}

// Capture a fix and best-effort reverse-geocode in one call.
export async function captureLocation(opts?: {
  requireAccuracy?: boolean;
}): Promise<GeoFix> {
  const fix = await getCurrentPosition(opts);
  fix.address = await reverseGeocode(fix.latitude, fix.longitude);
  return fix;
}

export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// A short locality label from a full formatted address (first 1-2 parts).
export function shortLocality(address?: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim());
  return parts.slice(0, 2).join(", ");
}
