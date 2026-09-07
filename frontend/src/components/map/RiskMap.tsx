import { MapContainer, TileLayer, CircleMarker, Circle, Popup, LayersControl, useMap } from 'react-leaflet';
import { Location, RiskAssessment, HistoricalLandslide, RiskLevel, PriorityLevel } from '../../types';
import { useNavigate } from 'react-router-dom';
import { RiskBadge, PriorityBadge, TrendBadge } from '../shared/Badges';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: '#22c55e',
  MODERATE: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  P1: '#ef4444',
  P2: '#f97316',
  P3: '#eab308',
  P4: '#64748b',
};

const NER_CENTER: [number, number] = [25.5, 92.5];
const NER_ZOOM = 7;

interface Props {
  locations: Array<Location & { latestRisk?: RiskAssessment | null }>;
  landslides?: HistoricalLandslide[];
  selectedLocationId?: string;
  onLocationSelect?: (id: string) => void;
  height?: string;
}

function FlyToLocation({ locationId, locations }: { locationId?: string; locations: Props['locations'] }) {
  const map = useMap();
  useEffect(() => {
    if (locationId) {
      const loc = locations.find((l) => l.id === locationId);
      if (loc) map.flyTo([loc.coordinates.lat, loc.coordinates.lon], 12, { duration: 1.5 });
    }
  }, [locationId, locations, map]);
  return null;
}

export function RiskMap({
  locations,
  landslides = [],
  selectedLocationId,
  onLocationSelect,
  height = '500px',
}: Props) {
  const navigate = useNavigate();

  return (
    <MapContainer
      center={NER_CENTER}
      zoom={NER_ZOOM}
      style={{ height, width: '100%', borderRadius: '0.75rem' }}
      className="z-0"
    >
      <LayersControl position="topright">
        {/* Base Cartographic Layers */}
        <LayersControl.BaseLayer checked name="Apple Light Canvas (ESRI)">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri, DeLorme, NAVTEQ"
            maxZoom={16}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Dark Tactical Canvas (ESRI)">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri, DeLorme, NAVTEQ"
            maxZoom={16}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite Imagery (ESRI World)">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri World Imagery"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OpenStreetMap Standard">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
        </LayersControl.BaseLayer>

        {/* 1. LAYER: OVERALL RISK */}
        <LayersControl.Overlay checked name="1. Overall Multi-Factor Risk">
          <>
            {locations.map((loc) => {
              const risk = loc.latestRisk;
              const level = risk?.riskLevel || 'LOW';
              const score = risk?.finalScore || 0;
              const color = RISK_COLORS[level];
              const isSelected = loc.id === selectedLocationId;

              return (
                <CircleMarker
                  key={`risk-${loc.id}`}
                  center={[loc.coordinates.lat, loc.coordinates.lon]}
                  radius={isSelected ? 16 : level === 'CRITICAL' ? 14 : level === 'HIGH' ? 11 : 8}
                  pathOptions={{
                    color: isSelected ? '#ffffff' : color,
                    fillColor: color,
                    fillOpacity: level === 'CRITICAL' ? 0.9 : 0.75,
                    weight: isSelected ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => onLocationSelect?.(loc.id),
                  }}
                >
                  <Popup>
                    <div className="min-w-[220px]">
                      <div className="font-bold text-white mb-0.5">{loc.name}</div>
                      <div className="text-slate-400 text-xs mb-2">
                        {loc.district}, {loc.state} (~{loc.population.toLocaleString()} pop)
                      </div>
                      {risk ? (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <RiskBadge level={level} />
                            <PriorityBadge priority={risk.priorityLevel || 'P3'} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-300 font-mono my-1">
                            <span>Score: {score.toFixed(1)}/100</span>
                            <span>24h Rain: {risk.inputs.rainfall_24h_mm.toFixed(1)}mm</span>
                          </div>
                          <TrendBadge trend={risk.trend} pct={risk.trendPct} />
                          <div className="mt-2 text-[11px] text-slate-400 pt-1.5 border-t border-surface-border">
                            Slope: {risk.inputs.slope_deg.toFixed(1)}° | Soil Susc: {(risk.componentScores.soil * 100).toFixed(0)}%
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-500 text-xs">Awaiting live telemetry</div>
                      )}
                      <button
                        onClick={() => navigate(`/locations/${loc.id}`)}
                        className="mt-3 w-full text-xs bg-brand text-white rounded-md py-1.5 hover:bg-brand-light font-medium transition-colors"
                      >
                        Inspect Location Full Telemetry →
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </>
        </LayersControl.Overlay>

        {/* 2. LAYER: OPERATIONAL PRIORITY (P1-P4) */}
        <LayersControl.Overlay name="2. Operational Priority (P1-P4)">
          <>
            {locations.map((loc) => {
              const pri = loc.latestRisk?.priorityLevel || 'P4';
              const color = PRIORITY_COLORS[pri];
              return (
                <CircleMarker
                  key={`pri-${loc.id}`}
                  center={[loc.coordinates.lat, loc.coordinates.lon]}
                  radius={pri === 'P1' ? 14 : pri === 'P2' ? 11 : 8}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <div className="font-bold text-white text-xs mb-1">{loc.name}</div>
                      <div className="mb-2"><PriorityBadge priority={pri} /></div>
                      <div className="text-xs text-slate-300">
                        {pri === 'P1' ? 'Immediate Field Verification Required' : pri === 'P2' ? 'High Surveillance Tier' : 'Routine Monitoring'}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </>
        </LayersControl.Overlay>

        {/* 3. LAYER: RAINFALL INTENSITY */}
        <LayersControl.Overlay name="3. 24h Rainfall Accumulation">
          <>
            {locations.map((loc) => {
              const rain = loc.latestRisk?.inputs.rainfall_24h_mm || 0;
              const rainColor =
                rain >= 100
                  ? '#ef4444'
                  : rain >= 50
                  ? '#f97316'
                  : rain >= 20
                  ? '#38bdf8'
                  : '#0284c7';

              return (
                <CircleMarker
                  key={`rain-${loc.id}`}
                  center={[loc.coordinates.lat, loc.coordinates.lon]}
                  radius={Math.min(22, Math.max(6, rain / 5))}
                  pathOptions={{
                    color: rainColor,
                    fillColor: rainColor,
                    fillOpacity: 0.6,
                    weight: 1.5,
                  }}
                >
                  <Popup>
                    <div className="min-w-[160px] text-xs">
                      <div className="font-bold text-white">{loc.name}</div>
                      <div className="text-blue-400 font-mono font-bold mt-1 text-sm">
                        24h Rain: {rain.toFixed(1)} mm
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        72h Rain: {loc.latestRisk?.inputs.rainfall_72h_mm.toFixed(1) || 0} mm
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </>
        </LayersControl.Overlay>

        {/* 4. LAYER: SLOPE GRADIENT (SRTM) */}
        <LayersControl.Overlay name="4. Slope Gradient (SRTM DEM)">
          <>
            {locations.map((loc) => {
              const slope = loc.latestRisk?.inputs.slope_deg || 15;
              const slopeColor =
                slope >= 30 ? '#ef4444' : slope >= 20 ? '#f97316' : slope >= 10 ? '#eab308' : '#22c55e';
              return (
                <CircleMarker
                  key={`slope-${loc.id}`}
                  center={[loc.coordinates.lat, loc.coordinates.lon]}
                  radius={Math.min(18, Math.max(7, slope / 2))}
                  pathOptions={{
                    color: slopeColor,
                    fillColor: slopeColor,
                    fillOpacity: 0.7,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="min-w-[160px] text-xs">
                      <div className="font-bold text-white">{loc.name}</div>
                      <div className="text-orange-400 font-mono font-bold mt-1 text-sm">
                        Slope Angle: {slope.toFixed(1)}°
                      </div>
                      <div className="text-slate-400">SRTM 90m Topography</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </>
        </LayersControl.Overlay>

        {/* 5. LAYER: HISTORICAL LANDSLIDES */}
        <LayersControl.Overlay checked name="5. Historical Landslide Catalog">
          <>
            {landslides.map((ls) => (
              <CircleMarker
                key={`ls-${ls.id}`}
                center={[ls.coordinates.lat, ls.coordinates.lon]}
                radius={6}
                pathOptions={{
                  color: '#c084fc',
                  fillColor: '#9333ea',
                  fillOpacity: 0.85,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="min-w-[190px]">
                    <div className="font-bold text-purple-300 text-xs mb-1">
                      Historical Landslide Event
                    </div>
                    <div className="text-white font-medium text-xs">{ls.locationName}</div>
                    <div className="text-slate-400 text-xs font-mono">{ls.date}</div>
                    <div className="text-slate-300 text-xs mt-1">Trigger: {ls.trigger}</div>
                    {ls.fatalities !== null && (
                      <div className="text-red-400 font-bold text-xs mt-0.5">
                        Fatalities: {ls.fatalities}
                      </div>
                    )}
                    <div className="text-slate-500 text-[10px] mt-1">Source: {ls.source}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        </LayersControl.Overlay>

        {/* 6. LAYER: 5-KM PRE-EMPTIVE EVACUATION & RUNOUT BUFFER */}
        <LayersControl.Overlay checked name="6. 5-km Evacuation Geofence Buffer">
          <>
            {locations.filter((l) => (l.latestRisk?.finalScore || 0) >= 55).map((loc) => {
              const risk = loc.latestRisk;
              const isCrit = risk?.riskLevel === 'CRITICAL';
              return (
                <Circle
                  key={`buffer-5km-${loc.id}`}
                  center={[loc.coordinates.lat, loc.coordinates.lon]}
                  radius={5000}
                  pathOptions={{
                    color: isCrit ? '#ef4444' : '#f97316',
                    fillColor: isCrit ? '#ef4444' : '#f97316',
                    fillOpacity: isCrit ? 0.15 : 0.08,
                    weight: 1.5,
                    dashArray: '6, 6',
                  }}
                >
                  <Popup>
                    <div className="min-w-[220px] text-xs">
                      <div className="font-bold text-red-500 uppercase tracking-wider mb-1">
                        🚨 5-km High-Risk Evacuation Zone
                      </div>
                      <div className="font-bold text-white text-sm mb-1">{loc.name}</div>
                      <div className="text-slate-300 mb-2">
                        {loc.district}, {loc.state} (~{loc.population?.toLocaleString() || '150,000'} pop at risk)
                      </div>
                      <div className="p-2 rounded bg-surface border border-surface-border text-[11px] text-slate-300 space-y-1 mb-2">
                        <div><strong>Target Action:</strong> Pre-emptive civilian evacuation</div>
                        <div><strong>Safe Ridge Shelter:</strong> Local Govt Higher Secondary School</div>
                        <div><strong>Highway Corridor:</strong> Barricaded by Police 5km out</div>
                      </div>
                      <button
                        onClick={() => navigate(`/locations/${loc.id}`)}
                        className="w-full py-1 text-center bg-brand text-white rounded text-[11px] font-medium hover:bg-brand-light"
                      >
                        Inspect Catchment Defense Plan →
                      </button>
                    </div>
                  </Popup>
                </Circle>
              );
            })}
          </>
        </LayersControl.Overlay>
      </LayersControl>

      <FlyToLocation locationId={selectedLocationId} locations={locations} />

      {/* Map Legend */}
      <div className="leaflet-bottom leaflet-left">
        <div className="leaflet-control bg-surface-elevated/95 border border-surface-border rounded-xl p-3.5 m-3 shadow-xl backdrop-blur-sm">
          <div className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
            Risk & GIS Legend
          </div>
          {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as RiskLevel[]).map((level) => (
            <div key={level} className="flex items-center gap-2 mb-1 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: RISK_COLORS[level] }}
              />
              <span className="text-slate-300">{level}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-surface-border text-xs">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-slate-300">NASA/NDMA Historical Event</span>
          </div>
        </div>
      </div>
    </MapContainer>
  );
}
export default RiskMap;

