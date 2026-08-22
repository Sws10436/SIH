import React, { useState, useEffect } from 'react';
import { Ambulance, CheckCircle, Clock, AlertTriangle, Play, HelpCircle, Activity } from 'lucide-react';
import { api } from '../../api/client';

export const ReferralTracker: React.FC = () => {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReferrals = async () => {
    try {
      const data = await api.getReferrals();
      setReferrals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
    // Poll status updates every 4 seconds to catch dynamic overdue transitions
    const interval = setInterval(fetchReferrals, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (id: number, nextStatus: string) => {
    try {
      await api.updateReferralStatus(id, nextStatus);
      alert(`Referral status successfully updated to: ${nextStatus}`);
      fetchReferrals();
    } catch (e: any) {
      alert(`Failed to update status: ` + e.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'created':
        return <Clock size={16} style={{ color: '#0284c7' }} />;
      case 'in_transit':
        return <Ambulance size={16} style={{ color: '#d97706', animation: 'bounce 1s infinite' }} />;
      case 'arrived':
        return <Activity size={16} style={{ color: '#4f46e5' }} />;
      case 'treated':
        return <CheckCircle size={16} style={{ color: '#16a34a' }} />;
      case 'closed':
        return <CheckCircle size={16} style={{ color: '#475569' }} />;
      case 'overdue':
        return <AlertTriangle size={16} style={{ color: '#e11d48' }} />;
      case 'lost':
        return <AlertTriangle size={16} style={{ color: '#7f1d1d' }} />;
      default:
        return <HelpCircle size={16} />;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'created': return { bg: '#e0f2fe', text: '#0369a1' };
      case 'in_transit': return { bg: '#fef3c7', text: '#b45309' };
      case 'arrived': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'treated': return { bg: '#d1fae5', text: '#065f46' };
      case 'closed': return { bg: '#f1f5f9', text: '#334155' };
      case 'overdue': return { bg: '#ffe4e6', text: '#be123c', border: '1px solid #fecdd3' };
      case 'lost': return { bg: '#fca5a5', text: '#7f1d1d', border: '2px solid #ef4444' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
          🏥 Referral Loop Tracker (Closure State Machine)
        </h2>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
          Tracking District-Wide Transport Loop Closures
        </span>
      </div>

      {isLoading ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading referral loops...</p>
      ) : referrals.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>No active referral loops found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {referrals.map((r) => {
            const style = getStatusBadgeStyle(r.status);
            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  background: r.status === 'lost' ? '#fff5f5' : r.status === 'overdue' ? '#fffafb' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      {r.patient_name} ({r.patient_age}y)
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span><strong>Target:</strong> {r.destination_hospital_name}</span>
                      <span>•</span>
                      <span><strong>Specialty:</strong> {r.required_specialty}</span>
                      {r.abha_id && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#4f46e5' }}><strong>ABHA:</strong> {r.abha_id}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status chip */}
                  <span style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: style.bg,
                    color: style.text,
                    border: style.border,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {getStatusIcon(r.status)}
                    {r.status.toUpperCase().replace('_', ' ')}
                  </span>
                </div>

                {/* Overdue/Lost alerts */}
                {(r.status === 'overdue' || r.status === 'lost') && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    color: '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertTriangle size={14} />
                    <span>
                      {r.status === 'lost'
                        ? 'CRITICAL WARNING: This referral has been marked as LOST. Patient failed to arrive within 2 hours.'
                        : 'WARNING: This transit is OVERDUE. No update received for more than 1 hour.'}
                    </span>
                  </div>
                )}

                {/* Actions Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '10px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Created: {new Date(r.created_at).toLocaleString()}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {r.status === 'created' && (
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'in_transit')}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Play size={12} /> Dispatch Ambulance
                      </button>
                    )}
                    {r.status === 'in_transit' && (
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'arrived')}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <CheckCircle size={12} /> Arrived at Ward
                      </button>
                    )}
                    {r.status === 'arrived' && (
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'treated')}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <CheckCircle size={12} /> Treat Patient
                      </button>
                    )}
                    {r.status === 'treated' && (
                      <button
                        onClick={() => handleUpdateStatus(r.id, 'closed')}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <CheckCircle size={12} /> Close Referral Loop
                      </button>
                    )}
                    {/* Admin manual overrides for overdue/lost */}
                    {['overdue', 'lost'].includes(r.status) && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'arrived')}
                          className="btn btn-secondary btn-sm"
                        >
                          Manual Arrival
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(r.id, 'closed')}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel / Close
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
