import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Database,
  Droplets,
  Layers,
  ArrowRight,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Info
} from 'lucide-react';

import { waterApi, Reservoir } from '../services/api';
import { RiskBadge } from '../components/RiskBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

// Custom SVG marker factory based on risk level
const createCustomMarker = (riskLevel: string, storagePct: number) => {
  const color =
    riskLevel === 'CRITICAL'
      ? '#dc2626'
      : riskLevel === 'HIGH'
      ? '#ea580c'
      : riskLevel === 'MEDIUM'
      ? '#eab308'
      : '#16a34a';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 10px;
          font-weight: bold;
          font-family: monospace;
        ">
          ${Math.round(storagePct)}%
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

interface MapPageProps {
  onSelectReservoir: (name: string) => void;
  reservoirs: Reservoir[];
}

export const MapPage: React.FC<MapPageProps> = ({ onSelectReservoir, reservoirs }) => {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedRisk, setSelectedRisk] = useState<string>('All');

  const states = ['All', ...Array.from(new Set(reservoirs.map((r) => r.state)))];

  const filteredReservoirs = reservoirs.filter((r) => {
    const matchesState = selectedState === 'All' || r.state === selectedState;
    const matchesRisk = selectedRisk === 'All' || r.risk_level === selectedRisk;
    return matchesState && matchesRisk;
  });

  // Center around Peninsular India
  const centerPosition: [number, number] = [14.5, 76.5];

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Geospatial Basin Monitoring
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-xs text-sky-600 font-medium">OpenStreetMap & Leaflet Integration</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Peninsular India Reservoir Network Map
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time geospatial distribution of 14 major reservoirs across Tamil Nadu, Karnataka, Kerala, Andhra Pradesh, Telangana, and Maharashtra.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-medium text-slate-600">Risk:</span>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Tiers</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Map Legend */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-800">Risk Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
              <span>Low Risk (&gt;60%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span>Medium Risk (40–60%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
              <span>High Risk (20–40%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" />
              <span>Critical (&lt;20%)</span>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            Showing {filteredReservoirs.length} of {reservoirs.length} Reservoirs
          </span>
        </div>

        {/* Leaflet Map Container */}
        <div className="h-[520px] w-full relative z-10">
          <MapContainer
            center={centerPosition}
            zoom={6}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredReservoirs.map((res) => {
              const markerIcon = createCustomMarker(res.risk_level, res.storage_percentage);
              return (
                <Marker
                  key={res.id}
                  position={[res.latitude, res.longitude]}
                  icon={markerIcon}
                  eventHandlers={{
                    click: () => onSelectReservoir(res.name),
                  }}
                >
                  <Popup>
                    <div className="p-1 min-w-[200px]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-slate-900">{res.name}</span>
                        <RiskBadge level={res.risk_level} score={res.risk_score} size="sm" />
                      </div>

                      <div className="text-[11px] text-slate-500 mb-2">
                        {res.district}, {res.state}
                      </div>

                      <div className="space-y-1 text-xs border-t border-slate-100 pt-2 mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Capacity:</span>
                          <span className="font-mono font-semibold">{res.capacity_mcm} MCM</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Current Storage:</span>
                          <span className="font-mono font-semibold text-sky-700">
                            {res.current_storage_mcm} MCM ({res.storage_percentage}%)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Monthly Demand:</span>
                          <span className="font-mono font-semibold">{res.current_demand_mcm} MCM</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectReservoir(res.name);
                          navigate('/storage');
                        }}
                        className="w-full text-center py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};
