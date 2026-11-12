/**
 * AquaPredict AI - Main Application Router & Shell
 * Decision Support System for SIH1692
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { waterApi, Reservoir } from './services/api';

import { DashboardPage } from './pages/DashboardPage';
import { ForecastPage } from './pages/ForecastPage';
import { StoragePage } from './pages/StoragePage';
import { RiskPage } from './pages/RiskPage';
import { ScenarioPage } from './pages/ScenarioPage';
import { MapPage } from './pages/MapPage';
import { HistoryPage } from './pages/HistoryPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { ReportsPage } from './pages/ReportsPage';
import { AboutPage } from './pages/AboutPage';

// Default initial reservoirs for immediate render before network completes
const FALLBACK_RESERVOIRS: Reservoir[] = [
  {
    id: 1,
    name: 'Bhavanisagar',
    state: 'Tamil Nadu',
    district: 'Erode',
    latitude: 11.47,
    longitude: 77.14,
    capacity_mcm: 928,
    current_storage_mcm: 650,
    dead_storage_mcm: 46.4,
    purpose: 'Irrigation & Drinking Water',
    base_population: 2250000,
    base_agri_area_ha: 105000,
    current_demand_mcm: 410,
    storage_percentage: 70.0,
    risk_level: 'LOW',
    risk_score: 24,
  },
  {
    id: 2,
    name: 'Mettur',
    state: 'Tamil Nadu',
    district: 'Salem',
    latitude: 11.80,
    longitude: 77.80,
    capacity_mcm: 2700,
    current_storage_mcm: 1890,
    dead_storage_mcm: 135,
    purpose: 'Irrigation & Drinking Water',
    base_population: 3480000,
    base_agri_area_ha: 175000,
    current_demand_mcm: 680,
    storage_percentage: 70.0,
    risk_level: 'LOW',
    risk_score: 28,
  },
  {
    id: 3,
    name: 'Krishna Raja Sagara',
    state: 'Karnataka',
    district: 'Mandya',
    latitude: 12.53,
    longitude: 76.57,
    capacity_mcm: 1400,
    current_storage_mcm: 880,
    dead_storage_mcm: 70,
    purpose: 'Irrigation & Drinking Water',
    base_population: 1920000,
    base_agri_area_ha: 120000,
    current_demand_mcm: 520,
    storage_percentage: 62.9,
    risk_level: 'MEDIUM',
    risk_score: 42,
  },
  {
    id: 4,
    name: 'Tungabhadra',
    state: 'Karnataka',
    district: 'Ballari',
    latitude: 15.26,
    longitude: 76.34,
    capacity_mcm: 3200,
    current_storage_mcm: 1750,
    dead_storage_mcm: 160,
    purpose: 'Irrigation & Drinking Water',
    base_population: 2550000,
    base_agri_area_ha: 210000,
    current_demand_mcm: 780,
    storage_percentage: 54.7,
    risk_level: 'MEDIUM',
    risk_score: 48,
  }
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedReservoir, setSelectedReservoir] = useState('Bhavanisagar');
  const [reservoirs, setReservoirs] = useState<Reservoir[]>(FALLBACK_RESERVOIRS);

  useEffect(() => {
    waterApi
      .getReservoirs()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setReservoirs(res.data);
          if (!selectedReservoir) {
            setSelectedReservoir(res.data[0].name);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch reservoirs list from API, using fallback data:', err);
      });
  }, []);

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
        {/* Sidebar Navigation */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 z-25 lg:hidden backdrop-blur-xs"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            selectedReservoir={selectedReservoir}
            onSelectReservoir={setSelectedReservoir}
            reservoirs={reservoirs}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage
                    selectedReservoirName={selectedReservoir}
                    onSelectReservoir={setSelectedReservoir}
                    reservoirs={reservoirs}
                  />
                }
              />
              <Route
                path="/forecast"
                element={
                  <ForecastPage
                    selectedReservoirName={selectedReservoir}
                    onSelectReservoir={setSelectedReservoir}
                    reservoirs={reservoirs}
                  />
                }
              />
              <Route
                path="/storage"
                element={
                  <StoragePage
                    selectedReservoirName={selectedReservoir}
                    onSelectReservoir={setSelectedReservoir}
                    reservoirs={reservoirs}
                  />
                }
              />
              <Route
                path="/risk"
                element={
                  <RiskPage
                    selectedReservoirName={selectedReservoir}
                    onSelectReservoir={setSelectedReservoir}
                    reservoirs={reservoirs}
                  />
                }
              />
              <Route
                path="/scenarios"
                element={
                  <ScenarioPage
                    selectedReservoirName={selectedReservoir}
                    onSelectReservoir={setSelectedReservoir}
                    reservoirs={reservoirs}
                  />
                }
              />
              <Route
                path="/map"
                element={
                  <MapPage
                    onSelectReservoir={setSelectedReservoir}
                    reservoirs={reservoirs}
                  />
                }
              />
              <Route
                path="/history"
                element={<HistoryPage reservoirs={reservoirs} />}
              />
              <Route path="/models" element={<ModelPerformancePage />} />
              <Route
                path="/reports"
                element={
                  <ReportsPage
                    selectedReservoirName={selectedReservoir}
                    onSelectReservoir={setSelectedReservoir}
                    reservoirs={reservoirs}
                  />
                }
              />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
