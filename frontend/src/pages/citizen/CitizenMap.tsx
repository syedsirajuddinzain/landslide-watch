import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface HazardPin {
  id: string;
  title: string;
  distanceKm: number;
  severity: string;
  type: string;
  description: string;
}

interface CitizenMapProps {
  userCoordinates: { lat: number; lon: number };
  locationName: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  nearbyHazards?: HazardPin[];
  citizenReports?: any[];
  height?: string;
}

function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    if (typeof lat === 'number' && !isNaN(lat) && typeof lon === 'number' && !isNaN(lon)) {
      try {
        map.flyTo([lat, lon], 12, { duration: 1.2 });
      } catch {}
    }
  }, [lat, lon, map]);
  return null;
}

export function CitizenMap({
  userCoordinates,
  locationName,
  riskLevel = 'HIGH',
  riskScore = 50,
  nearbyHazards = [],
  citizenReports = [],
  height = '320px',
}: CitizenMapProps) {
  const safeLat = (typeof userCoordinates?.lat === 'number' && !isNaN(userCoordinates.lat)) ? userCoordinates.lat : 23.7307;
  const safeLon = (typeof userCoordinates?.lon === 'number' && !isNaN(userCoordinates.lon)) ? userCoordinates.lon : 92.7173;
  const safeScore = (typeof riskScore === 'number' && !isNaN(riskScore)) ? riskScore : 50;

  const riskColor =
    riskLevel === 'CRITICAL'
      ? '#dc2626'
      : riskLevel === 'HIGH'
      ? '#ea580c'
      : riskLevel === 'MODERATE'
      ? '#d97706'
      : '#2d6a4f';

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#C8D8BC] shadow-sm" style={{ height }}>
      <MapContainer
        center={[safeLat, safeLon]}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <RecenterMap lat={safeLat} lon={safeLon} />

        {/* CartoDB Positron basemap */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={18}
        />

        {/* Catchment Surveillance Radius */}
        <Circle
          center={[safeLat, safeLon]}
          radius={3000}
          pathOptions={{
            color: riskColor,
            fillColor: riskColor,
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '4, 6',
          }}
        />

        {/* User GPS Pin */}
        <CircleMarker
          center={[safeLat, safeLon]}
          radius={9}
          pathOptions={{
            color: '#ffffff',
            fillColor: '#2563eb',
            fillOpacity: 1,
            weight: 3,
          }}
        >
          <Popup>
            <div className="text-xs p-1">
              <strong className="block text-[#0F2018] font-bold">Your Location</strong>
              <div className="text-[#1A3028] mt-0.5">{locationName || 'Monitored Region'}</div>
              <div className="mt-1 font-mono text-[11px] font-bold" style={{ color: riskColor }}>
                Status: {riskLevel} ({safeScore.toFixed(1)}/100)
              </div>
            </div>
          </Popup>
        </CircleMarker>

        {/* Nearby Hazard Pins */}
        {nearbyHazards.map((h, i) => {
          const latOffset = (i % 2 === 0 ? 0.015 : -0.012) * (i + 1);
          const lonOffset = (i % 3 === 0 ? -0.018 : 0.014) * (i + 1);
          const pinColor = h.severity === 'CRITICAL' ? '#dc2626' : '#ea580c';

          return (
            <CircleMarker
              key={h.id}
              center={[userCoordinates.lat + latOffset, userCoordinates.lon + lonOffset]}
              radius={7}
              pathOptions={{
                color: '#ffffff',
                fillColor: pinColor,
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs p-1 max-w-[200px]">
                  <strong className="text-rose-700 block font-bold">⚠️ {h.title}</strong>
                  <div className="text-slate-600 text-[11px] mt-0.5">{h.description}</div>
                  <div className="text-slate-500 font-mono text-[10px] mt-1">
                    Distance: ~{h.distanceKm} km away
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Citizen Ground Reports Pins */}
        {citizenReports.map((r) => {
          if (!r.coordinates?.lat || !r.coordinates?.lon) return null;
          return (
            <CircleMarker
              key={r.id}
              center={[r.coordinates.lat, r.coordinates.lon]}
              radius={6}
              pathOptions={{
                color: '#ffffff',
                fillColor: r.status === 'VERIFIED' ? '#dc2626' : '#d97706',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs p-1 max-w-[220px]">
                  <strong className="text-amber-800 block font-bold">
                    📍 {r.observationType?.replace(/_/g, ' ') || 'Citizen Hazard'}
                  </strong>
                  {r.locationName && (
                    <div className="text-[#0F2018] font-semibold text-[11px]">{r.locationName}</div>
                  )}
                  {r.description && (
                    <div className="text-[#1A3028] text-[11px] mt-0.5 italic">"{r.description}"</div>
                  )}
                  <div className="text-[#1A3028] font-mono text-[10px] mt-1">
                    Status: {r.status}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Floating Legend */}
      <div className="absolute bottom-2 left-2 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#C8D8BC] text-[11px] shadow-sm flex items-center gap-3">
        <span className="flex items-center gap-1 font-medium text-[#0F2018]">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
          You
        </span>
        <span className="flex items-center gap-1 font-medium text-[#0F2018]">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
          Hazard Zone
        </span>
        <span className="flex items-center gap-1 font-medium text-[#0F2018]">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
          Citizen Report
        </span>
      </div>
    </div>
  );
}
export default CitizenMap;
