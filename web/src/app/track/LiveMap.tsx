'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';

// Fix for default marker icons not showing in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Modern minimalist light icons
const storeIcon = L.divIcon({
  html: `<div style="background: white; border: 3px solid #05a357; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">🏬</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const homeIcon = L.divIcon({
  html: `<div style="background: white; border: 3px solid black; padding: 6px; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"><svg viewBox="0 0 24 24" fill="black" width="20" height="20"><path d="M12 3l8 6v12h-5v-7H9v7H4V9l8-6z"/></svg></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Function to generate rotated sleek white Tesla icon
const getCarIcon = (heading: number) => {
  return L.divIcon({
    html: `
      <div style="transform: rotate(${heading}deg); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.4));">
        <svg viewBox="0 0 100 180" width="28" height="50">
          <rect x="12" y="25" width="12" height="30" rx="4" fill="#111" />
          <rect x="76" y="25" width="12" height="30" rx="4" fill="#111" />
          <rect x="12" y="125" width="12" height="30" rx="4" fill="#111" />
          <rect x="76" y="125" width="12" height="30" rx="4" fill="#111" />
          <path d="M 30 5 Q 50 -3 70 5 L 85 45 Q 90 90 85 135 L 75 170 Q 50 183 25 170 L 15 135 Q 10 90 15 45 Z" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5" />
          <path d="M 25 55 Q 50 40 75 55 L 78 85 Q 80 110 75 145 Q 50 135 25 145 L 22 85 Q 20 110 25 55 Z" fill="#0f172a" />
          <path d="M 22 15 L 32 10 L 35 15 L 20 25 Z" fill="#d8b4fe" />
          <path d="M 78 15 L 68 10 L 65 15 L 80 25 Z" fill="#d8b4fe" />
          <path d="M 20 165 L 35 168 L 40 173 L 22 171 Z" fill="#ef4444" />
          <path d="M 80 165 L 65 168 L 60 173 L 78 171 Z" fill="#ef4444" />
        </svg>
      </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const START_PT: [number, number] = [-33.98438, 25.65936]; // Boardwalk Mall Gqeberha
const END_PT: [number, number] = [-33.99000, 25.66000];

function MapBounds({ route, shouldRecenter }: { route: [number, number][], shouldRecenter: number }) {
  const map = useMap();
  useEffect(() => {
    if (route.length > 0) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { 
        paddingTopLeft: [50, 50],
        paddingBottomRight: [50, 350],
        animate: true,
        maxZoom: 16 // Don't zoom in *too* much when framing the whole route
      });
    }
  }, [map, route, shouldRecenter]);
  return null;
}

// Auto-follow logic to keep camera planted firmly over the driver
function DriverTracker({ driverPos, isAutoFollowing, setAutoFollowing }: { driverPos: [number, number], isAutoFollowing: boolean, setAutoFollowing: (val: boolean) => void }) {
  const map = useMap();

  useEffect(() => {
    if (isAutoFollowing && driverPos) {
      const zoom = 17; // High zoom, tight tracking
      // Calculate pixel offset to push the car higher on the screen 
      // so the bottom sheet doesn't overlap it.
      const targetPoint = map.project(driverPos, zoom);
      targetPoint.y += window.innerHeight * 0.25; // Shift center DOWN, car UP
      const offsetLatLng = map.unproject(targetPoint, zoom);
      map.setView(offsetLatLng, zoom, { animate: false });
    }
  }, [driverPos, isAutoFollowing, map]);

  useEffect(() => {
    const handleDrag = () => setAutoFollowing(false);
    map.on('dragstart', handleDrag);
    map.on('zoomstart', handleDrag);
    return () => { 
      map.off('dragstart', handleDrag);
      map.off('zoomstart', handleDrag); 
    }
  }, [map, setAutoFollowing]);
  return null;
}

export default function LiveMap({ 
  isActive, 
  onProgress,
  customerLocation,
  storeLocation,
  orderRef
}: { 
  isActive: boolean;
  onProgress?: (data: { pct: number, mins: number }) => void;
  customerLocation?: [number, number];
  storeLocation?: [number, number];
  orderRef?: string;
}) {
  const actualStart = storeLocation || START_PT;
  const actualEnd = customerLocation || END_PT;

  const [routeLine, setRouteLine] = useState<[number, number][]>([]);
  const [driverPosition, setDriverPosition] = useState<[number, number]>(actualStart);
  const [driverHeading, setDriverHeading] = useState(135);
  const [shouldRecenter, setShouldRecenter] = useState(0);
  const [isAutoFollowing, setIsAutoFollowing] = useState(true);
  const [hasRealDriver, setHasRealDriver] = useState(false);
  
  // To render sliced route line
  const [currentSegment, setCurrentSegment] = useState(0);

  // Fetch true street route via Valhalla & OSRM Open Routing API
  useEffect(() => {
    const fetchRoute = async () => {
      // Primary: Valhalla (Maximum precision, no simplification)
      try {
        const res = await fetch('https://valhalla1.openstreetmap.de/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            locations: [ { lat: actualStart[0], lon: actualStart[1] }, { lat: actualEnd[0], lon: actualEnd[1] } ],
            costing: 'auto',
            directions_options: { units: 'kilometers' }
          })
        });
        const data = await res.json();
        if (data.trip?.legs?.length > 0) {
          const shape = data.trip.legs[0].shape;
          const coords: [number, number][] = [];
          let index = 0, lat = 0, lng = 0;
          while (index < shape.length) {
            let b, shift = 0, result = 0;
            do { b = shape.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            lat += (result & 1) ? ~(result >> 1) : (result >> 1);
            shift = 0; result = 0;
            do { b = shape.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
            lng += (result & 1) ? ~(result >> 1) : (result >> 1);
            coords.push([lat / 1e6, lng / 1e6]);
          }
          setRouteLine(coords);
          setDriverPosition(coords[0]);
          return;
        }
      } catch (err) {
        console.warn("Valhalla Error:", err);
      }

      // Fallback 1: OSM DE
      try {
        const locs = `${actualStart[1]},${actualStart[0]};${actualEnd[1]},${actualEnd[0]}`;
        let res = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${locs}?overview=full&geometries=geojson`);
        let data = await res.json();
        
        if (data.code === 'Ok' && data.routes?.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          setRouteLine(coords);
          setDriverPosition(coords[0]);
          return;
        }
      } catch (err) {
        console.warn("OSRM DE failed, trying OSRM Demo...");
      }

      // Fallback 2: OSRM Demo
      try {
        const locs = `${actualStart[1]},${actualStart[0]};${actualEnd[1]},${actualEnd[0]}`;
        let res = await fetch(`https://router.project-osrm.org/route/v1/driving/${locs}?overview=full&geometries=geojson`);
        let data = await res.json();
        
        if (data.code === 'Ok' && data.routes?.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          setRouteLine(coords);
          setDriverPosition(coords[0]);
          return;
        }
      } catch (err) {
        console.warn("OSRM Demo failed...");
      }
      
      // If ALL fail, we have to draw something, but at least we tried 3 engines.
      setRouteLine([actualStart, actualEnd]);
    };
    fetchRoute();
  }, [actualStart[0], actualStart[1], actualEnd[0], actualEnd[1]]);

  function calcDistMeters(p1: [number, number], p2: [number, number]): number {
    const R = 6371e3;
    const lat1 = p1[0] * Math.PI/180, lat2 = p2[0] * Math.PI/180;
    const dLat = (p2[0]-p1[0]) * Math.PI/180, dLon = (p2[1]-p1[1]) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function snapToRoute(pt: [number, number], route: [number, number][]): [number, number] {
    if (route.length < 2) return pt;
    let minDist = Infinity;
    let snapped: [number, number] = pt;

    for (let i = 0; i < route.length - 1; i++) {
      const A = route[i];
      const B = route[i + 1];
      
      const dx = B[0] - A[0];
      const dy = B[1] - A[1];
      const len2 = dx * dx + dy * dy;
      
      let t = 0;
      if (len2 !== 0) {
        t = ((pt[0] - A[0]) * dx + (pt[1] - A[1]) * dy) / len2;
      }
      
      t = Math.max(0, Math.min(1, t)); // Clamp to segment
      
      const projX = A[0] + t * dx;
      const projY = A[1] + t * dy;
      
      const dist2 = (pt[0] - projX) ** 2 + (pt[1] - projY) ** 2;
      
      if (dist2 < minDist) {
        minDist = dist2;
        snapped = [projX, projY];
      }
    }
    return snapped;
  }

  // Real GPS tracking loop
  useEffect(() => {
    if (!isActive || !orderRef) {
      setHasRealDriver(false);
      return;
    }

    let prevPos = [...actualStart] as [number, number];
    const initialDist = calcDistMeters(actualStart, actualEnd);

    // Fetch REAL location from drivers table for this specific order
    const fetchInterval = setInterval(async () => {
      try {
        let { data, error } = await supabase
          .from('drivers')
          .select('lat, lng')
          .eq('current_order_ref', orderRef)
          .order('last_ping', { ascending: false })
          .limit(1)
          .single();
          
        // Fallback: If this order was accepted before the strict linking code was added,
        // or the driver disconnected, just grab the most recently active driver for the demo.
        if (error || !data) {
          const fallback = await supabase
            .from('drivers')
            .select('lat, lng')
            .order('last_ping', { ascending: false })
            .limit(1)
            .single();
          data = fallback.data;
        }
          
        if (data?.lat && data?.lng) {
          setHasRealDriver(true);
          let rawPos: [number, number] = [data.lat, data.lng];
          
          // Snap GPS directly to the OSRM route centerline to prevent drift
          const newPos: [number, number] = routeLine.length > 0 ? snapToRoute(rawPos, routeLine) : rawPos;
          
          // Calculate heading based on snapped position to stay parallel to road
          const lat1 = prevPos[0] * Math.PI / 180;
          const lat2 = newPos[0] * Math.PI / 180;
          const dLon = (newPos[1] - prevPos[1]) * Math.PI / 180;
          const y = Math.sin(dLon) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
          let brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
          
          // Only update heading if moved sufficiently
          if (calcDistMeters(prevPos, newPos) > 3) {
            setDriverHeading(brng);
          }

          setDriverPosition(newPos);
          prevPos = newPos;

          // Calculate ETA
          const distRemaining = calcDistMeters(newPos, actualEnd);
          const pct = Math.min(1, Math.max(0, 1 - (distRemaining / initialDist)));
          const minsRemaining = Math.max(0, Math.round(distRemaining / 400)); // ~24km/h average city speed
          
          if (onProgress) {
            onProgress({ pct, mins: minsRemaining });
          }
        } else {
          // If the query returns no data (driver went offline or hasn't updated yet)
          setHasRealDriver(false);
        }
      } catch (err) {
        console.warn("Real tracking error", err);
        setHasRealDriver(false);
      }
    }, 3000);
    
    return () => clearInterval(fetchInterval);
  }, [isActive, orderRef, actualStart[0], actualStart[1], actualEnd[0], actualEnd[1]]);

  return (
    <div style={{ height: '100vh', width: '100vw', zIndex: 1, position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        <MapContainer 
        center={actualStart} 
        zoom={17}
        style={{ height: '100%', width: '100%', pointerEvents: 'all' }}
        zoomControl={false}
        attributionControl={false}
      >
        <DriverTracker driverPos={driverPosition} isAutoFollowing={isAutoFollowing} setAutoFollowing={setIsAutoFollowing} />

        
        {/* We use highly detailed Google Maps roadmap tiles to show all malls, businesses, and street names perfectly */}
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          maxZoom={21}
        />
        
        {/* Route Border */}
        {routeLine.length > 0 && (
          <Polyline 
            positions={routeLine} 
            color="#2563eb" 
            weight={10} 
            opacity={0.9}
            lineCap="round"
            lineJoin="round"
            smoothFactor={0}
            noClip={true}
          />
        )}

        {/* Completed Route (Faded grey path) */}
        {routeLine.length > 0 && hasRealDriver && (
          <Polyline 
            positions={[...routeLine.slice(0, currentSegment + 1), driverPosition]} 
            color="#9ca3af" 
            weight={6} 
            opacity={1}
            lineCap="round"
            lineJoin="round"
            smoothFactor={0}
            noClip={true}
          />
        )}

        {/* Remaining Route Highlight */}
        {routeLine.length > 0 && (
          <Polyline 
            positions={hasRealDriver ? [driverPosition, ...routeLine.slice(currentSegment + 1)] : routeLine} 
            color="#60a5fa" 
            weight={6} 
            opacity={1}
            lineCap="round"
            lineJoin="round"
            smoothFactor={0}
            noClip={true}
          />
        )}

        {/* Store Marker */}
        <Marker position={actualStart} icon={storeIcon} zIndexOffset={10}>
          <Popup>Cash and Carry (Pickup)</Popup>
        </Marker>

        {/* Home Marker */}
        <Marker position={actualEnd} icon={homeIcon} zIndexOffset={10}>
          <Popup>Your Location (Dropoff)</Popup>
        </Marker>

        {/* Animated Driver Marker firmly planted on route geometry */}
        {hasRealDriver && (
          <Marker position={driverPosition} icon={getCarIcon(driverHeading)} zIndexOffset={100}>
            <Popup>Driver is arriving soon</Popup>
          </Marker>
        )}

      </MapContainer>

      {/* Recenter button — outside MapContainer to avoid z-index conflicts */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShouldRecenter(Date.now());
          setIsAutoFollowing(true);
        }}
        style={{
          position: 'absolute',
          bottom: 220,
          right: 16,
          zIndex: 50,
          background: 'white',
          border: '2px solid #e2e8f0',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          pointerEvents: 'all'
        }}
        title="Recenter Route"
      >
        🧭
      </button>
    </div>
  );
}
