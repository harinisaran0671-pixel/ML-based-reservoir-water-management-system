import React, { useState, useEffect } from 'react';
import {
  TableProperties,
  Search,
  Filter,
  Upload,
  FileCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle2,
  FileText
} from 'lucide-react';

import { waterApi, Reservoir } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

interface HistoryPageProps {
  reservoirs: Reservoir[];
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ reservoirs }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedReservoir, setSelectedReservoir] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // CSV Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const states = ['All', ...Array.from(new Set(reservoirs.map((r) => r.state)))];

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await waterApi.getHistoricalData({
        page,
        limit,
        reservoir: selectedReservoir,
        state: selectedState,
        search: searchTerm || undefined,
      });

      setData(res.data.data);
      setTotalPages(res.data.total_pages);
      setTotalRecords(res.data.total_records);
    } catch (err: any) {
      console.error('Fetch history error:', err);
      setError(err.response?.data?.detail || 'Failed to retrieve historical records from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit, selectedReservoir, selectedState]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadFile(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadLoading(true);
      setUploadResult(null);
      const res = await waterApi.uploadCSV(formData);
      setUploadResult(res.data);
      if (res.data.success) {
        fetchData();
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadResult({
        success: false,
        error_count: 1,
        errors: [err.response?.data?.detail || 'Failed to process file through backend validation pipeline.'],
      });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Multi-Decadal Hydrological Ledger
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-xs text-sky-600 font-medium">SQLite Database ({totalRecords} Records)</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Historical Water Demand & Reservoir Storage Archives
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Granular monthly historical records across 14 reservoirs detailing population, climate inputs, sectoral draft, and storage levels.
        </p>
      </div>

      {/* CSV Upload & Validation Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Upload Dataset CSV</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit external basin monitoring records to backend validation service.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
            Expected: .csv format
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/60">
          <input
            type="file"
            accept=".csv"
            id="csv-file-input"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="csv-file-input"
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-sky-600" />
            <span>Select CSV File</span>
          </label>

          <div className="text-xs text-slate-500 flex-1">
            {uploadFile ? (
              <span className="font-mono text-slate-800 font-semibold">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
            ) : (
              <span>Upload CSV containing date, state, reservoir, population, rainfall, temperature, and demand metrics.</span>
            )}
          </div>

          {uploadLoading && (
            <span className="text-xs font-medium text-sky-600 animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
              Validating against backend schema...
            </span>
          )}
        </div>

        {/* Validation Result Box */}
        {uploadResult && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs ${
              uploadResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {uploadResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>CSV Validated Successfully ({uploadResult.valid_records} valid rows)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>CSV Validation Failed ({uploadResult.error_count} error issues detected)</span>
                </>
              )}
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <ul className="list-disc list-inside mt-2 space-y-1 text-rose-800 font-mono text-[11px]">
                {uploadResult.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search district, reservoir, season..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-sky-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* State Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-500 font-medium">State:</span>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setPage(1);
              }}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Reservoir Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-500 font-medium">Reservoir:</span>
            <select
              value={selectedReservoir}
              onChange={(e) => {
                setSelectedReservoir(e.target.value);
                setPage(1);
              }}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Reservoirs</option>
              {reservoirs.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner message="Querying SQLite database ledger..." />}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Main Table */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">State</th>
                  <th className="py-3 px-3">Reservoir</th>
                  <th className="py-3 px-3 text-right">Population</th>
                  <th className="py-3 px-3 text-right">Rainfall (mm)</th>
                  <th className="py-3 px-3 text-right">Temp (°C)</th>
                  <th className="py-3 px-3 text-right">Agri Area (ha)</th>
                  <th className="py-3 px-3 text-right">Domestic (MCM)</th>
                  <th className="py-3 px-3 text-right">Industrial (MCM)</th>
                  <th className="py-3 px-3 text-right">Agri Demand (MCM)</th>
                  <th className="py-3 px-3 text-right font-bold text-slate-900">Total Demand (MCM)</th>
                  <th className="py-3 px-3 text-right">Storage (MCM)</th>
                  <th className="py-3 px-3 text-right">Storage %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">{row.date}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{row.state}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.reservoir}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {row.population?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sky-600">
                      {row.rainfall_mm}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {row.temperature_c}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {row.agricultural_area_ha?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {row.domestic_demand_mcm}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {row.industrial_demand_mcm}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                      {row.agricultural_demand_mcm}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {row.total_demand_mcm}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-indigo-700">
                      {row.storage_mcm}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                      <span
                        className={
                          row.storage_percentage < 30
                            ? 'text-rose-600'
                            : row.storage_percentage < 50
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }
                      >
                        {row.storage_percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing Page <span className="font-bold text-slate-900">{page}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span> ({totalRecords} records)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-medium text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-medium text-xs flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
