import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Sparkles, RefreshCw, Check, AlertCircle,
  Activity, Users, ShieldAlert, Sliders, Database, ArrowRight,
  Wifi, WifiOff, Clock, CheckCircle
} from 'lucide-react';
import { HospitalDetail, Bed, PatientStay, BedTurnoverPrediction } from '../types';
import { api, createWebSocketSubscriber } from '../api/client';
import { PredictionBadge } from '../components/PredictionBadge';

export const HospitalPortal: React.FC = () => {
  const [hospitalsList, setHospitalsList] = useState<any[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number>(1);
  const [hospitalDetail, setHospitalDetail] = useState<HospitalDetail | null>(null);
  const [selectedWard, setSelectedWard] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [isLiveSync, setIsLiveSync] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [justRefreshed, setJustRefreshed] = useState<boolean>(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inpatient Stays & ML Prediction state
  const [patientStays, setPatientStays] = useState<PatientStay[]>([]);
  const [selectedStay, setSelectedStay] = useState<PatientStay | null>(null);
  const [activePrediction, setActivePrediction] = useState<BedTurnoverPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Vitals edit state for ML recalculation demo
  const [editSpo2, setEditSpo2] = useState<number>(98);
  const [editHr, setEditHr] = useState<number>(76);
  const [editMap, setEditMap] = useState<number>(88);
  const [editStage, setEditStage] = useState<string>('STEP_DOWN');
  const [editStability, setEditStability] = useState<number>(0.9);

  // Oxygen edit state
  const [editO2Tank, setEditO2Tank] = useState<number>(16);
  const [editDCyl, setEditDCyl] = useState<number>(50);

  // ABHA Lookup state
  const [abhaSearch, setAbhaSearch] = useState<string>('');
  const [triageHistory, setTriageHistory] = useState<any[]>([]);
  const [isSearchingAbha, setIsSearchingAbha] = useState<boolean>(false);

  // Batch toggle mode (Non-HMS Fallback)
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [selectedBedIds, setSelectedBedIds] = useState<number[]>([]);

  const handleAbhaLookup = async () => {
    if (!abhaSearch) return;
    setIsSearchingAbha(true);
    try {
      const data = await api.getTriageEncounters(abhaSearch);
      setTriageHistory(data);
    } catch (e: any) {
      alert('ABHA Lookup failed: ' + e.message);
    } finally {
      setIsSearchingAbha(false);
    }
  };

  useEffect(() => {
    loadHospitalList();
  }, []);

  const refreshCurrentHospital = async (silent = false) => {
    if (!selectedHospitalId) return;
    if (!silent) {
      setIsRefreshing(true);
      setIsLoading(true);
    }
    try {
      await Promise.all([
        loadHospitalDetail(selectedHospitalId, silent),
        loadStays(selectedHospitalId)
      ]);
      setLastUpdated(new Date());
      if (!silent) {
        setJustRefreshed(true);
        setTimeout(() => setJustRefreshed(false), 2000);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedHospitalId) {
      refreshCurrentHospital(false);
    }
  }, [selectedHospitalId]);

  // Real-time WebSocket sync & periodic polling across ALL portals
  useEffect(() => {
    // 1. WebSocket real-time subscription
    const unsubscribe = createWebSocketSubscriber(() => {
      refreshCurrentHospital(true);
    });

    // 2. 5-second dynamic polling
    if (isLiveSync) {
      pollingRef.current = setInterval(() => {
        refreshCurrentHospital(true);
      }, 5000);
    }

    return () => {
      unsubscribe();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedHospitalId, isLiveSync]);

  const loadHospitalList = async () => {
    try {
      const data = await api.getHospitals();
      setHospitalsList(data);
      if (data.length > 0 && !selectedHospitalId) {
        setSelectedHospitalId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadHospitalDetail = async (hospId: number, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const detail = await api.getHospitalDetail(hospId);
      setHospitalDetail(detail);
      if (detail.oxygen_inventory) {
        setEditO2Tank(detail.oxygen_inventory.bulk_tank_current_kl);
        setEditDCyl(detail.oxygen_inventory.cylinder_d_type_count);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadStays = async (hospId: number) => {
    try {
      const stays = await api.getPatientStays(hospId);
      setPatientStays(stays);
      if (stays.length > 0 && !selectedStay) {
        selectPatientForPrediction(stays[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectPatientForPrediction = async (stay: PatientStay) => {
    setSelectedStay(stay);
    setEditSpo2(stay.current_spo2);
    setEditHr(stay.current_hr);
    setEditMap(stay.current_map);
    setEditStage(stay.treatment_stage);
    setEditStability(stay.vitals_stability_score);
    setIsPredicting(true);
    try {
      const pred = await api.getPatientPrediction(stay.id);
      setActivePrediction(pred);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleRecalculatePrediction = async () => {
    if (!selectedStay) return;
    setIsPredicting(true);
    try {
      const res = await api.updatePatientVitals(selectedStay.id, {
        treatment_stage: editStage,
        current_spo2: editSpo2,
        current_hr: editHr,
        current_map: editMap,
        vitals_stability_score: editStability
      });
      setActivePrediction(res.prediction);
      // Reload hospital capacity and stays
      loadHospitalDetail(selectedHospitalId);
      loadStays(selectedHospitalId);
    } catch (err: any) {
      alert('Prediction recalculation failed: ' + err.message);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleBedToggle = async (bed: Bed, newStatus: string) => {
    setIsToggling(true);
    try {
      await api.toggleBedStatus(bed.id, newStatus);
      // Update local state instantly
      setHospitalDetail(prev => {
        if (!prev) return null;
        return {
          ...prev,
          beds: prev.beds.map(b => b.id === bed.id ? { ...b, status: newStatus as any } : b)
        };
      });
    } catch (err: any) {
      alert('Failed to update bed: ' + err.message);
    } finally {
      setIsToggling(false);
    }
  };

  const handleBatchToggle = async (newStatus: string) => {
    if (selectedBedIds.length === 0) return;
    try {
      await api.batchToggleBeds(selectedBedIds, newStatus);
      setSelectedBedIds([]);
      loadHospitalDetail(selectedHospitalId);
    } catch (err: any) {
      alert('Batch toggle failed: ' + err.message);
    }
  };

  const handleSaveOxygen = async () => {
    try {
      await api.updateOxygen(selectedHospitalId, {
        bulk_tank_current_kl: editO2Tank,
        cylinder_d_type_count: editDCyl
      });
      alert('Oxygen reserves updated & logged to Blockchain Audit Trail!');
      loadHospitalDetail(selectedHospitalId);
    } catch (err: any) {
      alert('Oxygen update failed: ' + err.message);
    }
  };

  const filteredBeds = hospitalDetail?.beds.filter(b => {
    if (selectedWard === 'ALL') return true;
    return b.ward_name.includes(selectedWard) || b.bed_type === selectedWard;
  }) || [];

  return (
    <div>
      {/* Header & Hospital Selector */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={24} style={{ color: '#0d9488' }} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              Hospital Staff & Resource Management Dashboard
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Real-time ward telemetry, bedside status toggles, oxygen/blood sync & ML discharge turnover engine.
          </p>
        </div>

        {/* Hospital Dropdown & Live Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {lastUpdated && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#94a3b8' }}>
              <Clock size={13} />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <button
            onClick={() => setIsLiveSync(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: isLiveSync ? '#f0fdf4' : '#fef2f2',
              color: isLiveSync ? '#16a34a' : '#dc2626',
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {isLiveSync ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isLiveSync ? 'Live Sync Active (5s)' : 'Live Sync Paused'}
          </button>
          <button
            onClick={() => refreshCurrentHospital(false)}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: justRefreshed ? '#ecfdf5' : '#ffffff',
              borderColor: justRefreshed ? '#10b981' : '#cbd5e1',
              color: justRefreshed ? '#059669' : '#0f172a',
              transition: 'all 0.2s ease'
            }}
            title="Refresh ward bed grid & resource feeds"
          >
            {justRefreshed ? (
              <>
                <CheckCircle size={14} style={{ color: '#10b981' }} />
                <span>Wards Updated!</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isRefreshing ? 'Fetching...' : 'Refresh Wards'}</span>
              </>
            )}
          </button>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Active Facility:</span>
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(parseInt(e.target.value))}
            className="form-select"
            style={{ fontWeight: 700, minWidth: '220px' }}
          >
            {hospitalsList.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Resource Snapshot */}
      {hospitalDetail && (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Available General Beds</div>
            <div className="kpi-value" style={{ color: hospitalDetail.general_beds_available > 0 ? '#059669' : '#e11d48' }}>
              {hospitalDetail.general_beds_available}
              <span style={{ fontSize: '1rem', color: '#94a3b8' }}> / {hospitalDetail.general_beds_total}</span>
            </div>
            <div className="kpi-subtext">Ward Occupancy: {Math.round(((hospitalDetail.general_beds_total - hospitalDetail.general_beds_available) / Math.max(hospitalDetail.general_beds_total, 1)) * 100)}%</div>
          </div>

          <div className="kpi-card danger">
            <div className="kpi-label">Available ICU Beds</div>
            <div className="kpi-value" style={{ color: hospitalDetail.icu_beds_available > 0 ? '#059669' : '#e11d48' }}>
              {hospitalDetail.icu_beds_available}
              <span style={{ fontSize: '1rem', color: '#94a3b8' }}> / {hospitalDetail.icu_beds_total}</span>
            </div>
            <div className="kpi-subtext">Critical Threshold: &lt;10%</div>
          </div>

          <div className="kpi-card predict">
            <div className="kpi-label">ML Bed Turnover (12h / 24h)</div>
            <div className="kpi-value" style={{ color: '#4f46e5' }}>
              +{hospitalDetail.predicted_icu_available_12h} <span style={{ fontSize: '1rem', color: '#6366f1' }}>/ +{hospitalDetail.predicted_icu_available_24h} ICU</span>
            </div>
            <div className="kpi-subtext">Forecasted Discharge Probability Engine</div>
          </div>

          <div className="kpi-card warning">
            <div className="kpi-label">Oxygen Reserves (Tank & Cylinders)</div>
            <div className="kpi-value" style={{ color: hospitalDetail.oxygen_inventory && hospitalDetail.oxygen_inventory.bulk_tank_current_kl <= 3 ? '#e11d48' : '#0d9488' }}>
              {hospitalDetail.oxygen_inventory?.bulk_tank_current_kl} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>kL</span>
            </div>
            <div className="kpi-subtext">~{hospitalDetail.oxygen_inventory?.estimated_days_left} Days Buffer Remaining</div>
          </div>
        </div>
      )}

      {/* Main Section: Left = Bed Grid, Right = ML Turnover & Oxygen Control */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {/* Left Column: Live Ward Bed Grid & Fast Non-HMS Toggles */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Ward Bed Grid & Real-Time Status Toggles
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Single-click to toggle status. Updates instantly propagate via WebSockets.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn btn-sm ${batchMode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setBatchMode(!batchMode)}
              >
                <Sliders size={14} /> {batchMode ? 'Exit Batch Toggle' : 'Non-HMS Batch Toggle'}
              </button>
            </div>
          </div>

          {/* Ward filter tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {['ALL', 'General', 'ICU', 'CARDIAC_ICU', 'VENTILATOR', 'OXYGEN_SUPPORTED'].map((ward) => (
              <button
                key={ward}
                onClick={() => setSelectedWard(ward)}
                className={`btn btn-sm ${selectedWard === ward ? 'btn-primary' : 'btn-secondary'}`}
              >
                {ward === 'CARDIAC_ICU' ? 'Cardiac ICU' : ward === 'OXYGEN_SUPPORTED' ? 'O2 Ward' : ward}
              </button>
            ))}
          </div>

          {batchMode && (
            <div style={{
              background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px',
              padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>
                Selected: {selectedBedIds.length} beds (Shift Handover Mode)
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleBatchToggle('AVAILABLE')} className="btn btn-sm btn-primary">Mark Free</button>
                <button onClick={() => handleBatchToggle('OCCUPIED')} className="btn btn-sm btn-secondary">Mark Occupied</button>
                <button onClick={() => handleBatchToggle('CLEANING')} className="btn btn-sm btn-secondary">Mark Cleaning</button>
              </div>
            </div>
          )}

          {/* Bed Grid Cells */}
          <div className="bed-grid">
            {filteredBeds.map((bed) => {
              const isChecked = selectedBedIds.includes(bed.id);
              return (
                <div
                  key={bed.id}
                  className={`bed-cell ${bed.status}`}
                  onClick={() => {
                    if (batchMode) {
                      setSelectedBedIds(prev => isChecked ? prev.filter(id => id !== bed.id) : [...prev, bed.id]);
                    }
                  }}
                  style={{
                    borderWidth: isChecked ? '2px' : '1px',
                    borderColor: isChecked ? '#4f46e5' : undefined
                  }}
                >
                  <div className="bed-header">
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                      {bed.bed_number}
                    </span>
                    <span className={`bed-tag ${bed.status}`}>{bed.status}</span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {bed.ward_name} ({bed.bed_type})
                  </div>

                  {bed.patient_stay && (
                    <div style={{ fontSize: '0.72rem', color: '#334155', background: 'rgba(255,255,255,0.8)', padding: '4px 6px', borderRadius: '4px' }}>
                      <strong>{bed.patient_stay.patient_name}</strong>
                      <div>{bed.patient_stay.diagnosis}</div>
                      <div style={{ color: '#0d9488', fontWeight: 600 }}>SpO2: {bed.patient_stay.spo2}%</div>
                    </div>
                  )}

                  {!batchMode && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBedToggle(bed, 'AVAILABLE'); }}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.68rem', padding: '3px',
                          background: bed.status === 'AVAILABLE' ? '#059669' : '#ffffff',
                          color: bed.status === 'AVAILABLE' ? '#fff' : '#475569',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        Free
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBedToggle(bed, 'OCCUPIED'); }}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.68rem', padding: '3px',
                          background: bed.status === 'OCCUPIED' ? '#475569' : '#ffffff',
                          color: bed.status === 'OCCUPIED' ? '#fff' : '#475569',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        Occupied
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBedToggle(bed, 'CLEANING'); }}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.68rem', padding: '3px',
                          background: bed.status === 'CLEANING' ? '#4f46e5' : '#ffffff',
                          color: bed.status === 'CLEANING' ? '#fff' : '#475569',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        Sanitize
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBedToggle(bed, 'RESERVED'); }}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.68rem', padding: '3px',
                          background: bed.status === 'RESERVED' ? '#d97706' : '#ffffff',
                          color: bed.status === 'RESERVED' ? '#fff' : '#475569',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        Reserved
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Predictive Bed Turnover ML & Oxygen Sync */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ML Inpatient Turnover Engine Panel */}
          <div className="card" style={{ border: '2px solid #e0e7ff', background: '#fafbff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4338ca' }}>
                <Sparkles size={20} />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Predictive Bed Turnover ML Engine
                </h2>
              </div>
              <span className="predict-badge">
                <span className="predict-pulse" />
                Live Inpatient AI
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '14px' }}>
              Select an inpatient to view and test clinical vitals recovery factors, discharge likelihood % and bed turnover forecasts.
            </div>

            {/* Inpatient Stay Selector */}
            <div className="form-group">
              <label className="form-label">Active Inpatient Stay</label>
              <select
                value={selectedStay?.id || ''}
                onChange={(e) => {
                  const s = patientStays.find(st => st.id === parseInt(e.target.value));
                  if (s) selectPatientForPrediction(s);
                }}
                className="form-select"
                style={{ fontWeight: 700 }}
              >
                {patientStays.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.patient_name} ({s.patient_age}y) — Bed {s.bed_number} ({s.diagnosis_category})
                  </option>
                ))}
              </select>
            </div>

            {selectedStay && activePrediction && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>12h Discharge Prob</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: activePrediction.discharge_probability_12h >= 0.65 ? '#059669' : '#4f46e5' }}>
                      {Math.round(activePrediction.discharge_probability_12h * 100)}%
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>24h Discharge Prob</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4338ca' }}>
                      {Math.round(activePrediction.discharge_probability_24h * 100)}%
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>Est. Remaining</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
                      {activePrediction.expected_discharge_hours}h
                    </div>
                  </div>
                </div>

                {/* Explainable Factor Weights */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Explainable Clinical Drivers:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {activePrediction.key_factors.map((kf, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: '0.75rem', background: '#f8fafc',
                          padding: '4px 8px', borderRadius: '6px'
                        }}
                      >
                        <span>{kf.factor}</span>
                        <strong style={{ color: kf.impact === 'Positive' ? '#059669' : '#e11d48' }}>
                          {kf.weight}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Vitals Simulation Sliders */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    Test Vitals Recovery (Interactive ML Simulation):
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b' }}>SpO2 Oxygenation: {editSpo2}%</label>
                      <input
                        type="range" min="80" max="100" value={editSpo2}
                        onChange={(e) => setEditSpo2(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Heart Rate: {editHr} bpm</label>
                      <input
                        type="range" min="50" max="140" value={editHr}
                        onChange={(e) => setEditHr(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Treatment Stage</label>
                    <select
                      value={editStage}
                      onChange={(e) => setEditStage(e.target.value)}
                      className="form-select"
                      style={{ fontSize: '0.8rem', padding: '6px' }}
                    >
                      <option value="ICU_CRITICAL">ICU Critical</option>
                      <option value="STEP_DOWN">Step-Down Ward</option>
                      <option value="ORAL_MEDS">Stable on Oral Meds</option>
                      <option value="DISCHARGE_READY">Discharge Ready</option>
                    </select>
                  </div>

                  <button
                    onClick={handleRecalculatePrediction}
                    className="btn btn-predict btn-sm"
                    disabled={isPredicting}
                    style={{ width: '100%' }}
                  >
                    <RefreshCw size={14} className={isPredicting ? 'animate-spin' : ''} />
                    {isPredicting ? 'Running ML Inference...' : 'Recalculate Discharge ML Prediction'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Oxygen Inventory & Blood Bank Control */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
              Oxygen Reserves & Blood Bank Inventory
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label">Bulk Tank Level (kL)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editO2Tank}
                  onChange={(e) => setEditO2Tank(parseFloat(e.target.value) || 0)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">D-Type 47L Cylinders</label>
                <input
                  type="number"
                  value={editDCyl}
                  onChange={(e) => setEditDCyl(parseInt(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
            </div>

            <button onClick={handleSaveOxygen} className="btn btn-primary btn-sm" style={{ width: '100%', marginBottom: '16px' }}>
              Save Oxygen Reserves (Broadcasts to Govt & Patients)
            </button>

            {/* Blood Bank Units */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Live Blood Bank Units by ABO/Rh Group:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {hospitalDetail?.blood_inventory.map((bi) => (
                  <div
                    key={bi.blood_group}
                    style={{
                      background: bi.units_available <= bi.units_critical_threshold ? '#fff1f2' : '#f8fafc',
                      border: `1px solid ${bi.units_available <= bi.units_critical_threshold ? '#fecdd3' : '#e2e8f0'}`,
                      borderRadius: '8px', padding: '6px', textAlign: 'center'
                    }}
                  >
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{bi.blood_group}</strong>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: bi.units_available <= bi.units_critical_threshold ? '#e11d48' : '#0d9488' }}>
                      {bi.units_available} units
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ABHA Longitudinal Health Record Lookup */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          📑 Longitudinal Health Record Alignment (ABDM / ABHA Sandbox)
        </h3>
        <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px' }}>
          Query a patient's universal ABHA ID to retrieve their cross-tier clinical history, including frontline ASHA/ANM triage checkpoints, prior clinic logs, and hospital visits.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', maxWidth: '500px' }}>
          <input
            type="text"
            value={abhaSearch}
            onChange={(e) => setAbhaSearch(e.target.value)}
            placeholder="Enter Patient ABHA ID (e.g. 1111-2222-3333-4444)"
            className="form-input"
            style={{ flex: 1 }}
          />
          <button
            onClick={handleAbhaLookup}
            disabled={isSearchingAbha}
            className="btn btn-primary"
          >
            {isSearchingAbha ? 'Fetching...' : 'Query ABHA Records'}
          </button>
        </div>

        {triageHistory.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>
              Historical Encounters Found ({triageHistory.length}):
            </h4>
            {triageHistory.map((encounter) => (
              <div
                key={encounter.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  background: '#f8fafc'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                    Frontline Triage Checkpoint — Encounter #{encounter.id}
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: encounter.recommendation === 'REFER' ? '#fee2e2' : '#e0f2fe',
                    color: encounter.recommendation === 'REFER' ? '#ef4444' : '#0284c7',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    Recommendation: {encounter.recommendation}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Patient:</strong> {encounter.patient_name} ({encounter.patient_age} years)</div>
                  <div><strong>Fever:</strong> {encounter.fever ? 'Yes' : 'No'}</div>
                  <div><strong>Danger Signs Checked:</strong> {encounter.danger_signs}</div>
                  <div><strong>Chronic Flags Checked:</strong> {encounter.chronic_flags}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                    Timestamp: {new Date(encounter.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : abhaSearch && !isSearchingAbha ? (
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>No clinical history records found for this ABHA ID.</p>
        ) : null}
      </div>
    </div>
  );
};
