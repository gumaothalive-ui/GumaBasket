'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Map icons ────────────────────────────────────────────────────────────────
// No manual alignment offset used to prevent diagonal drift

const storeIcon = L.divIcon({
  html: `<div style="display:flex;align-items:center;background:white;color:black;padding:6px 14px;border-radius:30px;font-weight:700;font-size:12px;white-space:nowrap;box-shadow:0 6px 16px rgba(0,0,0,0.15);border:2px solid #000;">
    <span style="margin-right:6px">📦</span> PICKUP
  </div>`,
  className: '', iconSize: [120, 36], iconAnchor: [60, 36],
});

const homeIcon = L.divIcon({
  html: `<div style="display:flex;align-items:center;background:#05A357;color:white;padding:6px 14px;border-radius:30px;font-weight:700;font-size:12px;white-space:nowrap;box-shadow:0 6px 16px rgba(5,163,87,0.25);">
    <span style="margin-right:6px">📍</span> DROPOFF
  </div>`,
  className: '', iconSize: [120, 36], iconAnchor: [60, 36],
});

// Google Maps-style 3D navigation arrow
const driverIcon = L.divIcon({
  html: `<div class="driver-car-wrap" style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;transition:transform 0.1s linear;">
  <svg viewBox="0 0 54 54" width="54" height="54" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">
    <defs>
      <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#4285F4;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1a73e8;stop-opacity:1" />
      </linearGradient>
    </defs>
    <!-- White base for contrast -->
    <circle cx="27" cy="27" r="22" fill="white"/>
    <!-- Blue arrow -->
    <path d="M27 8 L42 44 L27 36 L12 44 Z" fill="url(#arrowGrad)"/>
    <!-- Internal detail/shading for 3D look -->
    <path d="M27 8 L34 30 L27 36 L20 30 Z" fill="white" opacity="0.2"/>
  </svg>
</div>`,
  className: '', iconSize: [54, 54], iconAnchor: [27, 27],
});

// ── Geometry helpers ──────────────────────────────────────────────────────────
function calcBearing(p1: [number, number], p2: [number, number]): number {
  const lat1 = p1[0] * Math.PI / 180, lat2 = p2[0] * Math.PI / 180;
  const dLon = (p2[1] - p1[1]) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function calcDistMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371e3;
  const lat1 = p1[0] * Math.PI / 180, lat2 = p2[0] * Math.PI / 180;
  const dLat = (p2[0] - p1[0]) * Math.PI / 180, dLon = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Straight-line fallback when OSRM is unavailable
function interpolateLine(from: [number, number], to: [number, number], steps = 100): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as [number, number];
  });
}

const SIM_SPEED_M_PER_S = 14; // ~50 km/h — realistic city speed

// ── OSRM types ────────────────────────────────────────────────────────────────
interface OSRMStep {
  maneuver: { location: [number, number]; type: string; modifier?: string };
  name: string;
  distance: number;
  polylineIdx?: number;
}

function mapStepsToPolyline(coords: [number, number][], steps: OSRMStep[]): OSRMStep[] {
  return steps.map(step => {
    const [manLng, manLat] = step.maneuver.location;
    let minDist = Infinity, nearestIdx = 0;
    coords.forEach(([lat, lng], i) => {
      const d = (lat - manLat) ** 2 + (lng - manLng) ** 2;
      if (d < minDist) { minDist = d; nearestIdx = i; }
    });
    return { ...step, polylineIdx: nearestIdx };
  });
}

// ── Turn instruction builder ──────────────────────────────────────────────────
function buildTurnInstruction(step: OSRMStep): string {
  const { type, modifier } = step.maneuver;
  const street = step.name?.trim() || '';
  const on     = street ? ` onto ${street}` : '';
  const along  = street ? ` along ${street}` : '';
  switch (type) {
    case 'depart':       return `Head ${modifier || 'forward'}${along}`;
    case 'arrive':       return `You have arrived at your destination`;
    case 'continue':     return `Continue straight${along}`;
    case 'merge':        return `Merge${on}`;
    case 'end of road':
      if (modifier === 'left')  return `At the end of the road, turn left${on}`;
      if (modifier === 'right') return `At the end of the road, turn right${on}`;
      return `At the end of the road, continue${on}`;
    case 'fork':
      if (modifier?.includes('left'))  return `Keep left at the fork${on}`;
      if (modifier?.includes('right')) return `Keep right at the fork${on}`;
      return `Stay on the road at the fork`;
    case 'roundabout':
    case 'rotary':       return `At the roundabout, take the exit${on}`;
    case 'turn':
    case 'new name':
      if (modifier === 'left')         return `Turn left${on}`;
      if (modifier === 'right')        return `Turn right${on}`;
      if (modifier === 'slight left')  return `Keep slight left${on}`;
      if (modifier === 'slight right') return `Keep slight right${on}`;
      if (modifier === 'sharp left')   return `Take a sharp left${on}`;
      if (modifier === 'sharp right')  return `Take a sharp right${on}`;
      if (modifier === 'uturn')        return `Make a U-turn`;
      if (modifier === 'straight')     return `Continue straight${on}`;
      return street ? `Continue on ${street}` : '';
    default:             return street ? `Continue on ${street}` : '';
  }
}

// ── Fetch road route (OSRM first for Turn-by-Turn steps) ─────
async function fetchOSRMRoute(
  from: [number, number],
  to: [number, number]
): Promise<{ coords: [number, number][]; steps: OSRMStep[] }> {
  const SERVERS = [
    'https://routing.openstreetmap.de/routed-car',
    'https://router.project-osrm.org',
  ];
  const path = `${from[1]},${from[0]};${to[1]},${to[0]}`;
  const qs   = '?overview=full&geometries=geojson&steps=true';

  for (const server of SERVERS) {
    try {
      const res  = await fetch(`${server}/route/v1/driving/${path}${qs}`, { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.length) {
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          (c: number[]) => [c[1], c[0]] as [number, number]
        );
        const steps = mapStepsToPolyline(coords, data.routes[0].legs[0].steps || []);
        console.info(`✅ OSRM route from ${server}: ${coords.length} points`);
        return { coords, steps };
      }
    } catch (e) {
      console.warn(`OSRM ${server} failed:`, e);
    }
  }

  // Fallback: Valhalla
  try {
    const res = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [ { lat: from[0], lon: from[1] }, { lat: to[0], lon: to[1] } ],
        costing: 'auto',
        directions_options: { units: 'kilometers' }
      }),
      signal: AbortSignal.timeout(6000)
    });
    const data = await res.json();
    if (data.trip && data.trip.legs && data.trip.legs.length > 0) {
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
        coords.push([lat / 1e6, lng / 1e6] as [number, number]);
      }
      console.info(`✅ Valhalla fallback route: ${coords.length} points`);
      return { coords, steps: [] }; 
    }
  } catch (e) {
    console.warn(`Valhalla fallback failed:`, e);
  }

  console.warn('⚠️ All routing failed — using straight-line last resort');
  return { coords: interpolateLine(from, to, 120), steps: [] };
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  tripState: string;
  storeCoords?: [number, number];
  customerCoords?: [number, number];
  driverCoords?: [number, number];
  storeName?: string;
  onArrival?: (dest: string) => void;
  onTurn?: (msg: string) => void;
  onUpdate?: (data: { 
    distanceRem: number; 
    timeRem: number; 
    nextStepDist?: number; 
    nextStepInstruction?: string 
  }) => void;
}

export default function DispatchMap({
  tripState,
  storeCoords,
  customerCoords,
  driverCoords,
  storeName = 'Unit Cash & Carry',
  onArrival,
  onTurn,
  onUpdate,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const START_PT = storeCoords;
  const END_PT   = customerCoords;
  // Driver origin: Sydenham, Gqeberha — ~3 km from Unit Cash & Carry, Korsten
  const DRIVER_ORIGIN: [number, number] = driverCoords || [-33.9345, 25.5960];

  const mapRef          = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef    = useRef<L.Polyline | null>(null);   // active blue route (center)
  const routeCasingRef  = useRef<L.Polyline | null>(null);   // active blue route (casing)
  const greyLineRef     = useRef<L.Polyline | null>(null);   // upcoming grey route
  const rafRef          = useRef<number | null>(null);

  const onArrivalRef = useRef(onArrival);
  const onTurnRef    = useRef(onTurn);
  const onUpdateRef  = useRef(onUpdate);
  useEffect(() => { onArrivalRef.current = onArrival; }, [onArrival]);
  useEffect(() => { onTurnRef.current    = onTurn;    }, [onTurn]);
  useEffect(() => { onUpdateRef.current  = onUpdate;  }, [onUpdate]);

  const routesRef = useRef({
    toStore:       [] as [number, number][],
    toCustomer:    [] as [number, number][],
    storeSteps:    [] as OSRMStep[],
    customerSteps: [] as OSRMStep[],
  });

  const spokenStepsRef = useRef(new Set<string>());
  const [routesLoaded, setRoutesLoaded] = useState(false);

  // ── Init map — once per mount (parent changes key on new trip) ────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DRIVER_ORIGIN,
      zoom: 15,
      zoomControl: true, // Re-enabled as requested
      attributionControl: false,
      renderer: L.canvas(), // High performance for high-density polylines
    });

    // High-detail Google Maps Roadmap tiles (includes buildings, streets, and labels)
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxZoom: 21,
      crossOrigin: true,
      attribution: '&copy; Google Maps'
    }).addTo(map);

    // Driver marker
    driverMarkerRef.current = L.marker(DRIVER_ORIGIN, { icon: driverIcon, zIndexOffset: 200 }).addTo(map);

    // Route polylines: Double-layered for Google Maps style "casing"
    greyLineRef.current  = L.polyline([], { 
      color: '#9e9e9e', 
      weight: 6,  
      opacity: 0.5, 
      lineCap: 'round', 
      lineJoin: 'round', 
      dashArray: '1, 12', 
      smoothFactor: 0, 
      noClip: true 
    }).addTo(map);

    routeCasingRef.current = L.polyline([], {
      color: '#1a73e8', // Darker blue casing
      weight: 14,       
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 0,
      noClip: true,
      interactive: false
    }).addTo(map);

    routeLineRef.current = L.polyline([], { 
      color: '#4285F4', // Google navigation light blue (center)
      weight: 8,       
      opacity: 1,    
      lineCap: 'round', 
      lineJoin: 'round',
      smoothFactor: 0, 
      noClip: true,     
      interactive: false,
      className: 'route-pulse-anim' // Custom CSS animation class
    }).addTo(map);

    // Add animation style once
    if (!document.getElementById('map-animations')) {
      const style = document.createElement('style');
      style.id = 'map-animations';
      style.innerHTML = `
        @keyframes routeFlow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .route-pulse-anim {
          stroke-dasharray: 12, 12;
          animation: routeFlow 1s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }

    // ── Dynamic Scaling: Adjust weight based on zoom level ──────────────────
    const updateWeight = () => {
      const z = map.getZoom();
      // Center line scaling
      const baseWeight = Math.max(3, Math.pow(2, (z - 11) / 2.5) * 5);
      routeLineRef.current?.setStyle({ weight: baseWeight });
      // Casing should be slightly thicker than center
      routeCasingRef.current?.setStyle({ weight: baseWeight * 1.5 });
      greyLineRef.current?.setStyle({ weight: baseWeight * 0.6 });
    };

    map.on('zoomend', updateWeight);
    updateWeight(); // initial call

    // Store marker
    if (START_PT) {
      L.marker(START_PT, { icon: storeIcon, zIndexOffset: 10 })
        .addTo(map)
        .bindPopup(`<b>${storeName}</b><br/>4 Jackson St, Korsten, Gqeberha`);
    }

    mapRef.current = map;

    // ── Handle resizing: Invalidate map when container changes size ──────────
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    if (tripState !== 'idle' && tripState !== 'delivered' && START_PT && END_PT) {
      // Customer dropoff marker
      L.marker(END_PT, { icon: homeIcon, zIndexOffset: 10 })
        .addTo(map)
        .bindPopup('<b>Customer Dropoff</b>');

      // Fit overview first
      const bounds = L.latLngBounds([DRIVER_ORIGIN, START_PT, END_PT]);
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          updateWeight();
        }
      }, 400);

      // Fetch both road routes
      (async () => {
        const [r1, r2] = await Promise.all([
          fetchOSRMRoute(DRIVER_ORIGIN, START_PT),
          fetchOSRMRoute(START_PT, END_PT),
        ]);
        routesRef.current.toStore       = r1.coords;
        routesRef.current.storeSteps    = r1.steps;
        routesRef.current.toCustomer    = r2.coords;
        routesRef.current.customerSteps = r2.steps;

        // Snap driver to actual road start
        if (!driverCoords && r1.coords.length) {
          driverMarkerRef.current?.setLatLng(r1.coords[0]);
        }

        setRoutesLoaded(true);
      })();

    } else {
      // Idle: just show driver position
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.setView(DRIVER_ORIGIN, 16);
        }
      }, 300);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional — parent changes key to remount

  const driverLat = driverCoords?.[0];
  const driverLng = driverCoords?.[1];
  const startLat  = START_PT?.[0];
  const startLng  = START_PT?.[1];
  const endLat    = END_PT?.[0];
  const endLng    = END_PT?.[1];

  // ── Simulation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverMarkerRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const routes   = routesRef.current;
    const routeLine = tripState === 'to_store'
      ? routes.toStore
      : tripState === 'to_customer'
        ? routes.toCustomer
        : [];

    // Update route lines on map
    if (tripState === 'to_store') {
      routeLineRef.current?.setLatLngs(routes.toStore);
      routeCasingRef.current?.setLatLngs(routes.toStore);
      greyLineRef.current?.setLatLngs(routes.toCustomer);  // upcoming leg (dashed grey)
    } else if (tripState === 'to_customer') {
      routeLineRef.current?.setLatLngs(routes.toCustomer);
      routeCasingRef.current?.setLatLngs(routes.toCustomer);
      greyLineRef.current?.setLatLngs([]);                  // clear previous leg
    } else {
      routeLineRef.current?.setLatLngs([]);
      routeCasingRef.current?.setLatLngs([]);
      greyLineRef.current?.setLatLngs([]);
    }

    if (routeLine.length === 0) {
      // No active route — idle GPS position
      if (driverCoords) {
        driverMarkerRef.current.setLatLng(driverCoords);
        map.setView(driverCoords, 19, { animate: true }); // Zoom in close when idle
      }
      return;
    }

    // ── Instant zoom to driver start position (once per leg) ────────────
    // Using setView instead of flyTo because the requestAnimationFrame loop's
    // panTo calls will instantly cancel any ongoing flyTo animation.
    // This guarantees the map snaps to zoom 19 to see buildings clearly.
    map.setView(routeLine[0], 19, { animate: false });

    // Pre-compute total route length once (not every frame)
    let totalRouteDist = 0;
    for (let i = 1; i < routeLine.length; i++) {
      totalRouteDist += calcDistMeters(routeLine[i - 1], routeLine[i]);
    }

    let lastTime     = performance.now();
    let traveledDist = 0;

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime  = time;
      traveledDist += SIM_SPEED_M_PER_S * dt;

      // Driver has reached the end of the route
      if (traveledDist >= totalRouteDist) {
        const dest = routeLine[routeLine.length - 1];
        driverMarkerRef.current?.setLatLng(dest);
        map.panTo(dest, { animate: false });            // don't force zoom on arrival
        if (tripState === 'to_store')         onArrivalRef.current?.('store');
        else if (tripState === 'to_customer') onArrivalRef.current?.('customer');
        return; // Stop the loop
      }

      // Find where the driver is along the route
      let accumulated = 0;
      let currentPos: [number, number] = routeLine[0];
      let bearing = 0;
      let currentSegmentIdx = 0;

      for (let i = 0; i < routeLine.length - 1; i++) {
        const p1   = routeLine[i];
        const p2   = routeLine[i + 1];
        const segDist = calcDistMeters(p1, p2);

        if (accumulated + segDist >= traveledDist) {
          const ratio = (traveledDist - accumulated) / segDist;
          currentPos = [
            p1[0] + (p2[0] - p1[0]) * ratio,
            p1[1] + (p2[1] - p1[1]) * ratio,
          ];
          currentSegmentIdx = i;
          // Calculate perfect visual angle using screen projection (fixes Web Mercator distortion)
          const pt1 = map.project(L.latLng(p1[0], p1[1]), map.getZoom());
          const pt2 = map.project(L.latLng(p2[0], p2[1]), map.getZoom());
          bearing = (Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x) * 180 / Math.PI + 90) % 360;
          break;
        }
        accumulated += segDist;
      }

      // ── Navigation Telemetry: Send remaining distance/time to parent ──
      const distRem = Math.max(0, totalRouteDist - traveledDist);
      const timeRem = Math.max(0, distRem / SIM_SPEED_M_PER_S);

      // ── Next Maneuver logic ───────────────────────────────────────────
      const activeSteps = tripState === 'to_store'
        ? routes.storeSteps
        : tripState === 'to_customer'
          ? routes.customerSteps
          : [];

      // Find the upcoming maneuver
      const nextStep = activeSteps.find(s => s.polylineIdx !== undefined && s.polylineIdx > currentSegmentIdx);
      let nextStepDist: number | undefined;
      let nextStepInstruction: string | undefined;

      if (nextStep) {
        // Simple distance from current pos to maneuver location
        const manLoc = L.latLng(nextStep.maneuver.location[1], nextStep.maneuver.location[0]);
        nextStepDist = map.distance(currentPos, manLoc);
        nextStepInstruction = buildTurnInstruction(nextStep);
      }

      onUpdateRef.current?.({ 
        distanceRem: distRem, 
        timeRem, 
        nextStepDist, 
        nextStepInstruction 
      });

      // ── Turn-by-turn Voice ───────────────────────────────────────────
      if (nextStep && nextStepDist !== undefined && nextStepDist < 150) {
        const stepId = `${tripState}-${nextStep.polylineIdx}`;
        if (!spokenStepsRef.current.has(stepId)) {
          spokenStepsRef.current.add(stepId);
          onTurnRef.current?.(nextStepInstruction || 'Turn ahead');
        }
      }

      // Update car icon rotation to face direction of travel
      const wrap = containerRef.current?.querySelector('.driver-car-wrap') as HTMLElement | null;
      if (wrap) wrap.style.transform = `rotate(${bearing}deg)`;

      // Move marker and follow driver — panTo preserves user zoom level
      driverMarkerRef.current?.setLatLng(currentPos);
      map.panTo(currentPos, { animate: false });      // smooth because RAF runs at 60fps

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLat, driverLng, tripState, startLat, startLng, endLat, endLng, routesLoaded]);

  return (
    <div 
      style={{ 
        height: '100%', 
        width: '100%', 
        position: 'absolute', 
        top: 0, 
        left: 0,
        overflow: 'hidden',
        background: '#e5e7eb',
        perspective: '1200px' 
      }}
    >
      <div
        ref={containerRef}
        style={{ 
          height: '125%', // Balanced oversize
          width: '100%', 
          position: 'absolute', 
          top: '-12.5%', // Center the oversized map
          left: 0,
          transition: 'transform 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
          transform: (tripState === 'to_store' || tripState === 'to_customer') 
            ? 'rotateX(30deg) translateY(5%) scale(1.12)' 
            : 'rotateX(0deg) translateY(0) scale(1)'
        }}
      />
      
      {/* Subtle Horizon Fade — less 'floating', more grounded */}
      {(tripState === 'to_store' || tripState === 'to_customer') && (
        <>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '35%',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none',
            zIndex: 1000
          }} />
          {/* Very faint vignette for focus */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '10%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0) 100%)',
            pointerEvents: 'none',
            zIndex: 1000
          }} />
        </>
      )}
    </div>
  );
}
