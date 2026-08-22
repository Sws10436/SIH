import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Wifi, WifiOff, FileText, Send, CheckCircle, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';

interface OfflineTriageItem {
  id: string;
  patient_name: string;
  patient_age: number;
  abha_id: string;
  danger_signs: string[];
  fever: boolean;
  chronic_flags: string[];
  recommendation: string;
  timestamp: string;
}

export const TriagePWA: React.FC = () => {
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [abhaId, setAbhaId] = useState('');
  const [fever, setFever] = useState(false);
  const [dangerSigns, setDangerSigns] = useState<Record<string, boolean>>({
    unable_to_drink: false,
    vomiting_everything: false,
    convulsions: false,
    lethargic_unconscious: false,
    severe_chest_indrawing: false,
  });
  const [chronicFlags, setChronicFlags] = useState<Record<string, boolean>>({
    hypertension: false,
    diabetes: false,
    tuberculosis: false,
    maternal_high_risk: false,
  });

  const [offlineMode, setOfflineMode] = useState(false);
  const [syncQueue, setSyncQueue] = useState<OfflineTriageItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [recentEncounters, setRecentEncounters] = useState<any[]>([]);

  // Load sync queue and encounters from localStorage on mount
  useEffect(() => {
    const queue = localStorage.getItem('medflow_triage_queue');
    if (queue) {
      setSyncQueue(JSON.parse(queue));
    }
    loadRecentEncounters();
  }, []);

  const loadRecentEncounters = async () => {
    try {
      const data = await api.getTriageEncounters();
      setRecentEncounters(data.slice(0, 5));
    } catch (e) {
      console.error('Failed to load recent encounters', e);
    }
  };

  const getRecommendation = () => {
    const hasDangerSign = Object.values(dangerSigns).some(Boolean);
    const hasChronic = Object.values(chronicFlags).some(Boolean);

    if (hasDangerSign || (fever && hasChronic)) {
      return 'REFER';
    } else if (fever || hasChronic) {
      return 'OBSERVE';
    }
    return 'TREAT';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || patientAge === '') return;

    const selectedDangerSigns = Object.keys(dangerSigns).filter(k => dangerSigns[k]);
    const selectedChronicFlags = Object.keys(chronicFlags).filter(k => chronicFlags[k]);
    const recommendation = getRecommendation();

    const payload = {
      patient_name: patientName,
      patient_age: Number(patientAge),
      abha_id: abhaId || undefined,
      danger_signs: JSON.stringify(selectedDangerSigns),
      fever,
      chronic_flags: JSON.stringify(selectedChronicFlags),
      recommendation,
    };

    if (offlineMode) {
      // Offline: Add to local sync queue
      const newItem: OfflineTriageItem = {
        id: 'local_' + Math.random().toString(36).substring(2, 9),
        patient_name: patientName,
        patient_age: Number(patientAge),
        abha_id: abhaId,
        danger_signs: selectedDangerSigns,
        fever,
        chronic_flags: selectedChronicFlags,
        recommendation,
        timestamp: new Date().toISOString()
      };
      const updatedQueue = [...syncQueue, newItem];
      setSyncQueue(updatedQueue);
      localStorage.setItem('medflow_triage_queue', JSON.stringify(updatedQueue));
      alert(`[Offline Mode] Triage saved locally in queue. Will sync once online.`);
    } else {
      // Online: Submit directly
      try {
        await api.submitTriage(payload);
        alert(`Triage successfully submitted! Recommendation: ${recommendation}`);
        loadRecentEncounters();
      } catch (err: any) {
        alert('Triage submission failed: ' + err.message);
      }
    }

    // Reset Form
    setPatientName('');
    setPatientAge('');
    setAbhaId('');
    setFever(false);
    setDangerSigns({
      unable_to_drink: false,
      vomiting_everything: false,
      convulsions: false,
      lethargic_unconscious: false,
      severe_chest_indrawing: false,
    });
    setChronicFlags({
      hypertension: false,
      diabetes: false,
      tuberculosis: false,
      maternal_high_risk: false,
    });
  };

  const handleSyncQueue = async () => {
    if (syncQueue.length === 0) return;
    setIsSyncing(true);
    let successCount = 0;
    const remainingQueue: OfflineTriageItem[] = [];

    for (const item of syncQueue) {
      try {
        await api.submitTriage({
          patient_name: item.patient_name,
          patient_age: item.patient_age,
          abha_id: item.abha_id || undefined,
          danger_signs: JSON.stringify(item.danger_signs),
          fever: item.fever,
          chronic_flags: JSON.stringify(item.chronic_flags),
          recommendation: item.recommendation,
        });
        successCount++;
      } catch (e) {
        console.error('Failed to sync item', item, e);
        remainingQueue.push(item);
      }
    }

    setSyncQueue(remainingQueue);
    localStorage.setItem('medflow_triage_queue', JSON.stringify(remainingQueue));
    setIsSyncing(false);
    alert(`Successfully synced ${successCount} queued triage forms to MedFlow central backend!`);
    loadRecentEncounters();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
      {/* Form Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} style={{ color: '#0d9488' }} /> Digital Clinical Triage
          </h2>
          <button
            onClick={() => setOfflineMode(!offlineMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: offlineMode ? '#fee2e2' : '#d1fae5',
              color: offlineMode ? '#dc2626' : '#059669',
            }}
          >
            {offlineMode ? <WifiOff size={14} /> : <Wifi size={14} />}
            {offlineMode ? 'Offline Mode Sim' : 'Online Mode'}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="form-input"
              required
              placeholder="e.g. Sunita Rao"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input
                type="number"
                value={patientAge}
                onChange={e => setPatientAge(e.target.value ? Number(e.target.value) : '')}
                className="form-input"
                required
                placeholder="Years"
              />
            </div>
            <div className="form-group">
              <label className="form-label">ABHA ID (14-digit)</label>
              <input
                type="text"
                value={abhaId}
                onChange={e => setAbhaId(e.target.value)}
                className="form-input"
                placeholder="e.g. 1111-2222-3333-4444"
              />
            </div>
          </div>

          {/* Danger Signs Section */}
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#e11d48', marginBottom: '8px' }}>
              ⚠️ Danger Signs (IMNCI Checklist)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.keys(dangerSigns).map(sign => (
                <label key={sign} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dangerSigns[sign]}
                    onChange={e => setDangerSigns({ ...dangerSigns, [sign]: e.target.checked })}
                    style={{ accentColor: '#e11d48' }}
                  />
                  <span>{sign.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fever and Chronic flags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#d97706', marginBottom: '8px' }}>
                🌡️ Symptoms
              </h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={fever}
                  onChange={e => setFever(e.target.checked)}
                  style={{ accentColor: '#d97706' }}
                />
                <span>Active Fever</span>
              </label>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', marginBottom: '8px' }}>
                🧬 Chronic / High-Risk
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.keys(chronicFlags).map(flag => (
                  <label key={flag} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={chronicFlags[flag]}
                      onChange={e => setChronicFlags({ ...chronicFlags, [flag]: e.target.checked })}
                      style={{ accentColor: '#4f46e5' }}
                    />
                    <span>{flag.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            <Send size={14} style={{ marginRight: '6px' }} />
            {offlineMode ? 'Save Locally (Offline Queue)' : 'Submit Triage Central'}
          </button>
        </form>
      </div>

      {/* Sync Queue Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              Local Sync Queue
            </h3>
            {syncQueue.length > 0 && (
              <button
                onClick={handleSyncQueue}
                disabled={isSyncing || offlineMode}
                className="btn btn-sm btn-predict"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={12} className={isSyncing ? 'spin' : ''} />
                {isSyncing ? 'Syncing...' : `Sync ${syncQueue.length} records`}
              </button>
            )}
          </div>
          {syncQueue.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
              No offline records queued. All data is synchronized.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {syncQueue.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.patient_name} ({item.patient_age}y)</div>
                    <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                      Rec: {item.recommendation} | {item.danger_signs.length} danger signs
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Encounters Card */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            Recent Triage Submissions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentEncounters.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.patient_name} ({item.patient_age}y)</div>
                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                    Rec: <strong style={{ color: item.recommendation === 'REFER' ? '#dc2626' : '#059669' }}>{item.recommendation}</strong> | ABHA: {item.abha_id || 'N/A'}
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {new Date(item.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
