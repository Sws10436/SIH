import React, { useState, useEffect } from 'react';
import { Calendar, UserPlus, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../../api/client';

export const FollowUpList: React.FC = () => {
  const [followups, setFollowups] = useState<any[]>([]);
  const [patientName, setPatientName] = useState('');
  const [category, setCategory] = useState('MATERNAL');
  const [abhaId, setAbhaId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchFollowups = async () => {
    try {
      const data = await api.getFollowUps();
      setFollowups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();
  }, []);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName) return;

    try {
      await api.scheduleFollowUp({
        patient_name: patientName,
        category,
        abha_id: abhaId || undefined,
      });
      alert(`Follow-up scheduled successfully! Computed date based on protocol intervals.`);
      setPatientName('');
      setAbhaId('');
      fetchFollowups();
    } catch (e: any) {
      alert(`Failed to schedule follow-up: ` + e.message);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.completeFollowUp(id);
      alert(`Follow-up marked as completed!`);
      fetchFollowups();
    } catch (e: any) {
      alert(`Failed to complete: ` + e.message);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'MATERNAL': return '#db2777';
      case 'CHILD': return '#0284c7';
      case 'CHRONIC': return '#7c3aed';
      default: return '#475569';
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      {/* Schedule Form */}
      <div className="card">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={20} style={{ color: '#0d9488' }} /> Schedule Protocol Follow-up
        </h2>

        <form onSubmit={handleSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Patient Name</label>
            <input
              type="text"
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              className="form-input"
              required
              placeholder="e.g. Laxmi Patel"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Protocol Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="form-select"
            >
              <option value="MATERNAL">Maternal Care (ANC) — 30 Day Interval</option>
              <option value="CHILD">Child Immunization — 45 Day Interval</option>
              <option value="CHRONIC">Chronic Care (Diabetes/TB) — 60 Day Interval</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">ABHA ID (Optional)</label>
            <input
              type="text"
              value={abhaId}
              onChange={e => setAbhaId(e.target.value)}
              className="form-input"
              placeholder="e.g. 1111-2222-3333-4444"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Schedule Follow-up
          </button>
        </form>
      </div>

      {/* Task List / Schedulers */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} /> Frontline Worker Follow-up Scheduler
        </h3>

        {isLoading ? (
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading schedules...</p>
        ) : followups.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No scheduled followups.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {followups.map(f => {
              const isMissed = f.status === 'MISSED';
              return (
                <div
                  key={f.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    background: isMissed ? '#fff5f5' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: getCategoryColor(f.category) + '15',
                      color: getCategoryColor(f.category),
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {f.category}
                    </span>

                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: f.status === 'COMPLETED' ? '#16a34a' : isMissed ? '#dc2626' : '#d97706'
                    }}>
                      {f.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    {f.patient_name}
                  </div>

                  {isMissed && (
                    <div style={{
                      fontSize: '0.74rem',
                      color: '#b91c1c',
                      background: '#fee2e2',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <ShieldAlert size={12} />
                      <span>Follow-up window MISSED. Escalated to worker task list!</span>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '4px',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '6px',
                    fontSize: '0.74rem',
                    color: '#64748b'
                  }}>
                    <span>Due: {new Date(f.follow_up_date).toLocaleDateString()}</span>
                    {f.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleComplete(f.id)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                      >
                        <CheckCircle size={10} style={{ marginRight: '3px' }} /> Resolve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
