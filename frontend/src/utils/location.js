/**
 * VayuCoupler Geolocation & Nearest Station Detection Utility
 * Ministry of Earth Sciences (MoES) - SIH 2026
 */

/**
 * Calculates Haversine distance between two coordinates in kilometers.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
}

/**
 * Finds the closest air quality monitoring station from user coordinates.
 */
export function findClosestStation(userLat, userLon, stations = []) {
  if (!stations || stations.length === 0) return null;

  let closest = null;
  let minDistance = Infinity;

  for (const station of stations) {
    if (typeof station.lat === 'number' && typeof station.lon === 'number') {
      const dist = calculateDistanceKm(userLat, userLon, station.lat, station.lon);
      if (dist < minDistance) {
        minDistance = dist;
        closest = {
          ...station,
          distanceKm: dist,
        };
      }
    }
  }

  return closest;
}

/**
 * Requests device GPS location and returns the coordinates and closest station.
 */
export async function requestUserLocation(stations = []) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve({
        success: false,
        error: 'Geolocation not supported by device/browser',
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000, // 1 min cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const closest = findClosestStation(latitude, longitude, stations);

        const result = {
          success: true,
          lat: latitude,
          lon: longitude,
          accuracyMeters: Math.round(accuracy || 0),
          closestStation: closest,
          distanceKm: closest?.distanceKm || 0,
        };

        // Cache in localStorage for quick initial render on next launch
        try {
          localStorage.setItem('vayucoupler_user_location', JSON.stringify({
            lat: latitude,
            lon: longitude,
            station_id: closest?.station_id,
            timestamp: Date.now(),
          }));
        } catch (_) {}

        resolve(result);
      },
      (err) => {
        console.warn('Geolocation access failed or denied:', err.message);
        resolve({
          success: false,
          error: err.message || 'Permission denied or location timed out',
        });
      },
      options
    );
  });
}
