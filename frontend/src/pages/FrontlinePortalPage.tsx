import React, { useState } from 'react';
import { FileText, ClipboardList, CalendarDays, Sparkles } from 'lucide-react';
import { TriagePWA } from '../modules/triage/TriagePWA';
import { ReferralTracker } from '../modules/referral-tracker/ReferralTracker';
import { FollowUpList } from '../modules/followup/FollowUpList';

export const FrontlinePortalPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'triage' | 'referrals' | 'followups'>('triage');

  return (
    <div style={{ padding: '4px' }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #4f46e5 100%)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '24px 32px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(8px)',
            padding: '4px 12px', borderRadius: '9999px', fontSize: '0.78rem',
            fontWeight: 700, marginBottom: '10px'
          }}>
            <Sparkles size={14} style={{ color: '#5eead4' }} />
            ASHA / ANM Frontline Toolkit (PS 26133 Continuity Tier)
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '8px' }}>
            Rural & Underserved Care Delivery Portal
          </h1>
          <p style={{ fontSize: '0.92rem', opacity: 0.9 }}>
            Empowering community health workers with offline triage decision trees, status tracking loop closures, and high-risk follow-up recall engines.
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSubTab('triage')}
            className={`btn ${subTab === 'triage' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px' }}
          >
            <FileText size={16} /> Offline Triage Form
          </button>
          <button
            onClick={() => setSubTab('referrals')}
            className={`btn ${subTab === 'referrals' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px' }}
          >
            <ClipboardList size={16} /> Referral Loop Tracker
          </button>
          <button
            onClick={() => setSubTab('followups')}
            className={`btn ${subTab === 'followups' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px' }}
          >
            <CalendarDays size={16} /> Follow-up Recall Engine
          </button>
        </div>
      </div>

      {/* Dynamic Sub-tab Render */}
      <div>
        {subTab === 'triage' && <TriagePWA />}
        {subTab === 'referrals' && <ReferralTracker />}
        {subTab === 'followups' && <FollowUpList />}
      </div>
    </div>
  );
};
