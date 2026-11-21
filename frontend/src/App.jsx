import { useEffect, useState } from 'react';
import {
  Leaf,
  Camera,
  Sparkles,
  Scale,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  PackageCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  fetchMetrics,
  fetchBatches,
  createBatch,
  claimBatch,
  scanWasteImage,
  fetchForecast,
} from './api';

const CATEGORY_STYLES = {
  ORGANIC: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PLASTIC: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  CARDBOARD: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  METAL: 'bg-slate-400/15 text-slate-200 border-slate-400/30',
  GLASS: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  EWASTE: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

export default function App() {
  const [metrics, setMetrics] = useState({
    total_weight_kg: 0,
    total_co2_saved_kg: 0,
    total_batches: 0,
    diverted_batches: 0,
  });
  const [batches, setBatches] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [businessType, setBusinessType] = useState('SUPERMARKET');
  const [collectorName, setCollectorName] = useState('Colombo EcoRecycler');

  // Scanner state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [donorName, setDonorName] = useState('Cargills Food City - Boralesgamuwa');
  const [locationText, setLocationText] = useState('Boralesgamuwa, Western Province');
  const [publishing, setPublishing] = useState(false);

  // Feedback banner
  const [toast, setToast] = useState(null);
  const [claimingId, setClaimingId] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadDashboard = async () => {
    try {
      const [mData, bData] = await Promise.all([fetchMetrics(), fetchBatches()]);
      setMetrics(mData);
      setBatches(bData);
    } catch (err) {
      showToast('error', `Backend connection error: ${err.message}`);
    }
  };

  const loadForecast = async (bType) => {
    try {
      const fData = await fetchForecast(bType, 7);
      setForecast(fData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadForecast(businessType);
  }, [businessType]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setScanResult(null);
  };

  const handleRunScan = async () => {
    if (!selectedFile) return;
    setScanning(true);
    try {
      const result = await scanWasteImage(selectedFile);
      setScanResult(result);
      showToast('success', `AI Vision scan complete (${result.model_used})`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setScanning(false);
    }
  };

  const handlePublishBatch = async () => {
    if (!scanResult) return;
    setPublishing(true);
    try {
      await createBatch({
        title: scanResult.suggested_title,
        category: scanResult.category,
        weight_kg: scanResult.estimated_weight_kg,
        contamination_score: scanResult.contamination_score,
        donor_name: donorName,
        location_name: locationText,
        notes: scanResult.ai_notes,
      });
      showToast('success', 'Verified batch published to live marketplace!');
      setScanResult(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      await loadDashboard();
    } catch (err) {
      showToast('error', `Failed to publish: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleClaim = async (batchId) => {
    setClaimingId(batchId);
    try {
      await claimBatch(batchId, collectorName || 'Partner Collector');
      showToast('success', `Batch #${batchId} atomically claimed by ${collectorName}!`);
      await loadDashboard();
    } catch (err) {
      showToast('error', err.message);
      await loadDashboard();
    } finally {
      setClaimingId(null);
    }
  };

  const maxForecastKg = forecast
    ? Math.max(...forecast.daily_forecast.map((d) => d.predicted_weight_kg), 1)
    : 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">WastePulse</h1>
              <p className="text-xs text-slate-400">
                AI Circular Economy &amp; Surplus Diversion Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 hidden sm:inline">Active Collector:</label>
            <input
              type="text"
              value={collectorName}
              onChange={(e) => setCollectorName(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              placeholder="Collector Org Name"
            />
            <button
              onClick={loadDashboard}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
              title="Refresh Live Feed"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div
            className={`px-4 py-3 rounded-xl border flex items-center gap-2 text-sm ${
              toast.type === 'error'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Analytics Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Total Material Logged</span>
              <Scale className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {metrics.total_weight_kg.toLocaleString()}{' '}
              <span className="text-base font-normal text-slate-400">kg</span>
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Net CO₂ Emissions Avoided</span>
              <Leaf className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-400 mt-2">
              {metrics.total_co2_saved_kg.toLocaleString()}{' '}
              <span className="text-base font-normal text-slate-400">kg CO₂e</span>
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Batches Diverted</span>
              <PackageCheck className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-3xl font-bold text-white mt-2">
              {metrics.diverted_batches}{' '}
              <span className="text-base font-normal text-slate-400">/ {metrics.total_batches}</span>
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>7-Day Predicted Surplus</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-amber-300 mt-2">
              {forecast ? `${forecast.total_predicted_kg} kg` : '—'}
            </p>
          </div>
        </section>

        {/* Main 2-Column Workspace: AI Vision Scanner + ML Forecast */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: AI Vision Contamination Scanner */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">AI Vision Contamination Scanner</h2>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Gemini Vision
              </span>
            </div>

            {/* Image Upload Box */}
            <label className="block border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-4 text-center cursor-pointer transition bg-slate-950/50">
              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Waste preview"
                    className="max-h-56 mx-auto rounded-lg object-contain"
                  />
                  {scanning && (
                    <div className="absolute inset-0 bg-slate-950/75 rounded-lg flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                      <span className="text-sm font-medium text-emerald-300">
                        Analyzing material purity &amp; weight...
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 space-y-2">
                  <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-sm font-medium text-slate-300">
                    Click to upload waste or surplus batch photo
                  </p>
                  <p className="text-xs text-slate-500">JPG, PNG, or WEBP</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>

            {selectedFile && !scanResult && (
              <button
                onClick={handleRunScan}
                disabled={scanning}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Scanning with Gemini Vision...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Run Contamination &amp; Material Scan
                  </>
                )}
              </button>
            )}

            {/* AI Scan Output Card */}
            {scanResult && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        CATEGORY_STYLES[scanResult.category] || CATEGORY_STYLES.PLASTIC
                      }`}
                    >
                      {scanResult.category}
                    </span>
                    <h3 className="text-base font-semibold text-white mt-1.5">
                      {scanResult.suggested_title}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Est. Weight</span>
                    <span className="text-lg font-bold text-white">
                      {scanResult.estimated_weight_kg} kg
                    </span>
                  </div>
                </div>

                {/* Contamination Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Contamination Score</span>
                    <span
                      className={
                        scanResult.contamination_score > 0.5
                          ? 'text-rose-400 font-semibold'
                          : 'text-emerald-400 font-semibold'
                      }
                    >
                      {Math.round(scanResult.contamination_score * 100)}% (
                      {scanResult.is_recyclable ? 'Recyclable Grade' : 'Requires Pre-Sorting'})
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        scanResult.contamination_score > 0.5 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(scanResult.contamination_score * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  {scanResult.ai_notes}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Donor / Business Name"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    placeholder="Pickup Location"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <button
                  onClick={handlePublishBatch}
                  disabled={publishing}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition"
                >
                  {publishing ? 'Publishing...' : 'Publish Verified Batch to Marketplace'}
                </button>
              </div>
            )}
          </div>

          {/* Right: 7-Day ML Surplus Forecast */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">7-Day Surplus Forecast</h2>
                </div>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="SUPERMARKET">Supermarket</option>
                  <option value="RESTAURANT">Restaurant</option>
                  <option value="WAREHOUSE">Warehouse</option>
                  <option value="MANUFACTURER">Manufacturer</option>
                </select>
              </div>

              {forecast && (
                <>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Peak Surplus Alert</p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {forecast.peak_surplus_day.day_name} ({forecast.peak_surplus_day.date}) —{' '}
                        <span className="text-amber-300">
                          {forecast.peak_surplus_day.predicted_weight_kg} kg
                        </span>
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {forecast.peak_surplus_day.primary_category}
                    </span>
                  </div>

                  {/* Bar Chart */}
                  <div className="pt-4">
                    <div className="grid grid-cols-7 gap-2 items-end h-44 px-2">
                      {forecast.daily_forecast.map((day) => {
                        const heightPct = Math.max(
                          15,
                          Math.round((day.predicted_weight_kg / maxForecastKg) * 100)
                        );
                        return (
                          <div
                            key={day.date}
                            className="flex flex-col items-center justify-end h-full gap-1.5"
                          >
                            <span className="text-[11px] font-medium text-slate-300">
                              {day.predicted_weight_kg}
                            </span>
                            <div
                              className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400 transition-all duration-300"
                              style={{ height: `${heightPct}%` }}
                              title={`${day.date}: ${day.predicted_weight_kg} kg (${day.predicted_co2_saved_kg} kg CO2e)`}
                            />
                            <span className="text-xs font-semibold text-slate-400">
                              {day.day_name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
              Model: {forecast?.model_algorithm || 'RidgeSurplusRegressor'} • Forecasts help
              collectors pre-allocate trucks before peak commercial surplus days.
            </p>
          </div>
        </section>

        {/* Live Surplus Batch Marketplace */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Live Surplus Marketplace</h2>
            </div>
            <span className="text-xs text-slate-400">{batches.length} total batches</span>
          </div>

          {batches.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-400 text-sm">
              No batches listed yet. Scan an image above to publish your first verified batch!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((batch) => {
                const isAvailable = batch.status === 'AVAILABLE';
                return (
                  <div
                    key={batch.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            CATEGORY_STYLES[batch.category] || CATEGORY_STYLES.PLASTIC
                          }`}
                        >
                          {batch.category}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                            isAvailable
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {batch.status}
                        </span>
                      </div>

                      <h3 className="font-semibold text-white text-base">{batch.title}</h3>

                      <div className="text-xs text-slate-400 space-y-1">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {batch.donor_name} • {batch.location_name || batch.location}
                        </p>
                        <p>
                          Weight: <strong className="text-slate-200">{batch.weight_kg} kg</strong> •
                          CO₂ Offset:{' '}
                          <strong className="text-emerald-400">{batch.co2_saved_kg} kg</strong>
                        </p>
                        <p>
                          Contamination:{' '}
                          <span className="text-slate-200">
                            {Math.round((batch.contamination_score || 0) * 100)}%
                          </span>
                        </p>
                      </div>
                    </div>

                    {isAvailable ? (
                      <button
                        onClick={() => handleClaim(batch.id)}
                        disabled={claimingId === batch.id}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition"
                      >
                        {claimingId === batch.id ? 'Locking Batch...' : 'Claim Batch for Pickup'}
                      </button>
                    ) : (
                      <div className="text-xs text-center py-2 px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                        Claimed by <strong className="text-slate-200">{batch.claimed_by}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
