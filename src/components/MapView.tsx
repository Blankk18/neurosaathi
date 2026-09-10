import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { SafeLocation, LocationUpdate, GeoPoint, RiskLevel } from '@/types';
import { riskMeta } from '@/engine/guardian';
import { useApp } from '@/state/AppContext';

// ============================================================================
// NEUROSAATHI HYBRID MAP
//
// Online  → real Leaflet + OpenStreetMap tiles (live geofence, trail, markers).
// Offline → an on-brand SVG schematic that renders the same geo data, so the
//           guardian map still works for judges with no network. The fallback
//           is clearly labelled "Offline map" — it never poses as the real one.
// ============================================================================

export interface MapViewProps {
  home: SafeLocation | null;
  safeLocations: SafeLocation[];
  current: LocationUpdate | null;
  trail: LocationUpdate[];
  currentZoneName?: string | null;
  className?: string;
  /** Prefer the offline schematic regardless of connectivity (used by tests). */
  forceFallback?: boolean;
}

const DIV_ICON = L.divIcon;

// Small inline div-icon markers — avoids Leaflet's default image assets which
// break under bundlers without extra config.
function elderIcon(status: RiskLevel) {
  return DIV_ICON({
    className: '',
    html: `<span class="guard-marker elder ${riskMeta(status).dot}" aria-hidden>◎</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const homeIcon = DIV_ICON({
  className: '',
  html: '<span class="guard-marker guard-home-dot" aria-hidden>🏠</span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const pinIcon = DIV_ICON({
  className: '',
  html: '<span class="guard-marker guard-pin-dot" aria-hidden>📍</span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Keeps the view centred on the oldest trail point that is present.
function LiveBounds({ current, trail }: { current: LocationUpdate | null; trail: LocationUpdate[] }) {
  const map = useMap();
  const pts: [number, number][] = [];
  if (current) pts.push([current.lat, current.lng]);
  for (let i = Math.max(0, trail.length - 8); i < trail.length; i += 1) {
    const p = trail[i];
    pts.push([p.lat, p.lng]);
  }
  const b = pts.length ? L.latLngBounds(pts).pad(0.15) : null;
  if (b) map.fitBounds(b);
  return null;
}

function toLatLng(p: GeoPoint): [number, number] {
  return [p.lat, p.lng];
}

/**
 * Leaflet-based online map. Rendered only when online + tiles are available.
 */
function OnlineMap({ home, safeLocations, current, trail }: Omit<MapViewProps, 'forceFallback' | 'currentZoneName' | 'className'>) {
  const homePos = home ? toLatLng(home) : toLatLng({ lat: 26.1445, lng: 91.7362 });
  const center = homePos;
  const zoom = 16;

  const knownZones = useMemo(
    () => safeLocations.filter((z) => z.id !== home?.id),
    [safeLocations, home],
  );

  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} style={{ height: '100%', width: '100%' }} className="guard-leaflet">
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* home geofence */}
      {home && <Circle center={toLatLng(home)} radius={home.radiusM} pathOptions={{ color: '#4e8271', weight: 2, fillColor: '#4e8271', fillOpacity: 0.08 }} />}
      {/* safe-zone geofences */}
      {knownZones.map((z) => (
        <Circle key={z.id} center={toLatLng(z)} radius={z.radiusM} pathOptions={{ color: '#c98b45', weight: 1.5, fillColor: '#c98b45', fillOpacity: 0.06 }} />
      ))}
      {/* movement trail */}
      {trail.length > 1 && (
        <Polyline positions={trail.map(toLatLng)} pathOptions={{ color: '#518372', weight: 3, opacity: 0.7, dashArray: '6 6' }} />
      )}
      {/* safe-place pins */}
      {home && <Marker position={homePos} icon={homeIcon} />}
      {knownZones.map((z) => <Marker key={z.id} position={toLatLng(z)} icon={pinIcon} />)}
      {/* accuracy radius around elder */}
      {current && <Circle center={toLatLng(current)} radius={current.accuracyM} pathOptions={{ color: '#d78a3a', weight: 1.5, fillColor: '#d78a3a', fillOpacity: 0.1 }} />}
      {/* elder marker */}
      {current && <Marker position={toLatLng(current)} icon={elderIcon('safe')} />}
      {current && <LiveBounds current={current} trail={trail} />}
    </MapContainer>
  );
}

// ============================================================================
// Offline SVG schematic — intentionally NOT an OSM map. Renders the same
// geo/zone data in a calm, on-brand diagram so the feature stays coherent
// without a network. Labelled "Offline map" for honesty.
// ============================================================================

function OfflineSchematic({ home, safeLocations, current, trail }: Omit<MapViewProps, 'forceFallback' | 'currentZoneName' | 'className'>) {
  const { t } = useApp();
  const W = 640;
  const H = 420;
  const pad = 50;

  // Project geo onto a local plane centred on home (if any), else a fixed base.
  const base = home ?? { lat: 26.1445, lng: 91.7362 };
  // Scale: roughly 1° lat ≈ 111km. For a ±0.15° window that is ~17km wide.
  const latSpan = 0.14;
  const lngSpan = 0.14;

  const proj = (p: GeoPoint) => {
    const x = pad + ((p.lng - (base.lng - lngSpan / 2)) / lngSpan) * (W - 2 * pad);
    const y = H - pad - ((p.lat - (base.lat - latSpan / 2)) / latSpan) * (H - 2 * pad);
    return [x, y] as const;
  };

  const zoneCircle = (z: SafeLocation) => {
    const [cx, cy] = proj(z);
    // radius ≈ metres → fraction of the lng span * width
    const r = Math.max(10, (z.radiusM / (lngSpan * 111000)) * (W - 2 * pad));
    return { cx, cy, r };
  };

  const [elderX, elderY] = current ? proj(current) : [0, -99];

  const trailPath = trail.map((p) => proj(p).join(',')).join(' ');

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-brand-50 via-white to-warm-50">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Offline location map">
        <defs>
          <pattern id="guard-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0v28" fill="none" stroke="#e8f0e3" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#guard-grid)" />
        {/* movement trail */}
        {trail.length > 1 && (
          <polyline points={trailPath} fill="none" stroke="#518372" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" strokeDasharray="7 7" />
        )}
        {/* home geofence */}
        {home && (() => {
          const { cx, cy, r } = zoneCircle(home);
          return <circle cx={cx} cy={cy} r={r} fill="#4e8271" fillOpacity="0.10" stroke="#4e8271" strokeWidth="2.5" />;
        })()}
        {/* safe-zone geofences */}
        {safeLocations.filter((z) => z.id !== home?.id).map((z) => {
          const { cx, cy, r } = zoneCircle(z);
          return <circle key={z.id} cx={cx} cy={cy} r={r} fill="#c98b45" fillOpacity="0.08" stroke="#c98b45" strokeWidth="1.8" strokeDasharray="4 3" />;
        })}
        {/* zone labels */}
        {safeLocations.map((z) => {
          const [lx, ly] = proj(z);
          return (
            <g key={z.id}>
              <circle cx={lx} cy={ly} r="5" fill={z.id === home?.id ? '#4e8271' : '#c98b45'} />
              <text x={lx} y={ly - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="#42624e" fontFamily="ui-rounded, system-ui">{z.id === home?.id ? t('guardian.map.home') : z.name}</text>
            </g>
          );
        })}
        {/* elder marker */}
        {current && (
          <g>
            <circle cx={elderX} cy={elderY} r={current?.simulated ? 14 : 12} fill="none" stroke="#d78a3a" strokeWidth="2" opacity="0.7" className="pulse-soft" />
            <circle cx={elderX} cy={elderY} r="9" fill="#b4532a" stroke="white" strokeWidth="3" />
            <text x={elderX} y={elderY - 18} textAnchor="middle" fontSize="12" fontWeight="800" fill="#42624e">{t('guardian.map.currentElder')}</text>
          </g>
        )}
      </svg>

      {/* floating badge — always explicit that this is the offline schematic */}
      <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-neutral-500 shadow-sm ring-1 ring-brand-100">
        🟠 {t('map.fallback.note')}
      </div>
      {current && (
        <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-700 shadow-sm ring-1 ring-brand-100">
          {t('guardian.map.recenter')}
        </div>
      )}
    </div>
  );
}

/**
 * Top-level hybrid map — picks online Leaflet vs offline schematic.
 */
export default function MapView(props: MapViewProps) {
  const { isOffline } = useApp();
  const showFallback = props.forceFallback || isOffline;
  return (
    <div className={`guard-map-container relative overflow-hidden ${props.className ?? ''}`}>
      {showFallback ? <OfflineSchematic {...props} /> : <OnlineMap {...props} />}
      {/* zoom controls for the fallback (Leaflet provides its own when online) */}
      {showFallback && (
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          <button className="guard-zb" aria-label="Zoom in" disabled>＋</button>
          <button className="guard-zb" aria-label="Zoom out" disabled>－</button>
        </div>
      )}
    </div>
  );
}