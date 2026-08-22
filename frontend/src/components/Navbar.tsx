import React from 'react';
import { UserRole, User as UserType } from '../types';
import { 
  Activity, ShieldCheck, PhoneCall, Building2, User, Landmark, 
  Cpu, Link2, Sparkles, Radio, LogIn, LogOut, Lock, Users
} from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  currentUser: UserType | null;
  onRoleChange: (role: UserRole) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isWsConnected: boolean;
  onOpenUssd: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  currentUser,
  onRoleChange,
  activeTab,
  onTabChange,
  isWsConnected,
  onOpenUssd,
  onOpenLogin,
  onLogout
}) => {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="#" className="brand-logo" onClick={(e) => { 
            e.preventDefault(); 
            onTabChange(currentRole === 'PATIENT' ? 'patient-search' : currentRole === 'HOSPITAL_STAFF' ? 'hospital-dashboard' : 'govt-overview'); 
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #0d9488, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}>
              <Activity size={22} />
            </div>
            <span>Med<span style={{ color: '#0d9488' }}>Flow</span></span>
            <span className="brand-badge">India</span>
          </a>

          {/* Live WS Pulse */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '0.75rem', fontWeight: 600,
            background: isWsConnected ? '#ecfdf5' : '#fff1f2',
            color: isWsConnected ? '#059669' : '#e11d48',
            padding: '3px 8px', borderRadius: '9999px',
            border: `1px solid ${isWsConnected ? '#d1fae5' : '#ffe4e6'}`
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: isWsConnected ? '#10b981' : '#f43f5e'
            }} />
            {isWsConnected ? 'Live Real-Time Sync' : 'Reconnecting...'}
          </div>
        </div>

        {/* Dynamic Navigation Links strictly enforced per active role */}
        <nav className="nav-links">
          {currentRole === 'PATIENT' && (
            <>
              <button
                className={`nav-item ${activeTab === 'patient-search' ? 'active' : ''}`}
                onClick={() => onTabChange('patient-search')}
              >
                <Building2 size={16} /> Hospital Finder
              </button>
              <button
                className={`nav-item ${activeTab === 'patient-referral' ? 'active' : ''}`}
                onClick={() => onTabChange('patient-referral')}
              >
                <Sparkles size={16} /> Smart Emergency Referral
              </button>
            </>
          )}

          {currentRole === 'HOSPITAL_STAFF' && (
            <>
              <button
                className={`nav-item ${activeTab === 'hospital-dashboard' ? 'active' : ''}`}
                onClick={() => onTabChange('hospital-dashboard')}
              >
                <Building2 size={16} /> Ward & Bed Grid
              </button>
              <button
                className={`nav-item ${activeTab === 'clinical-turnover' ? 'active' : ''}`}
                onClick={() => onTabChange('clinical-turnover')}
              >
                <Sparkles size={16} /> ML Turnover Engine
              </button>
              <button
                className={`nav-item ${activeTab === 'abdm-hub' ? 'active' : ''}`}
                onClick={() => onTabChange('abdm-hub')}
              >
                <Link2 size={16} /> ABDM / FHIR Standard
              </button>
            </>
          )}

          {currentRole === 'GOVT_ADMIN' && (
            <>
              <button
                className={`nav-item ${activeTab === 'govt-overview' ? 'active' : ''}`}
                onClick={() => onTabChange('govt-overview')}
              >
                <Landmark size={16} /> State Command Center
              </button>
              <button
                className={`nav-item ${activeTab === 'digital-twin' ? 'active' : ''}`}
                onClick={() => onTabChange('digital-twin')}
              >
                <Cpu size={16} /> Digital Twin Simulator
              </button>
              <button
                className={`nav-item ${activeTab === 'iot-monitor' ? 'active' : ''}`}
                onClick={() => onTabChange('iot-monitor')}
              >
                <Radio size={16} /> IoT Telemetry
              </button>
              <button
                className={`nav-item ${activeTab === 'audit-trail' ? 'active' : ''}`}
                onClick={() => onTabChange('audit-trail')}
              >
                <ShieldCheck size={16} /> Blockchain Audit Chain
              </button>
              <button
                className={`nav-item ${activeTab === 'user-registry' ? 'active' : ''}`}
                onClick={() => onTabChange('user-registry')}
              >
                <Users size={16} /> User Registry
              </button>
            </>
          )}

          {/* Frontline Worker Portal Launcher */}
          <button
            className={`nav-item ${activeTab === 'frontline-portal' ? 'active' : ''}`}
            onClick={() => onTabChange('frontline-portal')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Users size={16} /> Frontline Worker
          </button>

          {/* Rural USSD / SMS Simulator Launcher */}
          <button
            onClick={onOpenUssd}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}
            title="Test Rural Offline USSD (*999#) & SMS Gateway"
          >
            <PhoneCall size={14} style={{ color: '#0d9488' }} />
            <span>Rural USSD/SMS</span>
          </button>
        </nav>

        {/* Stakeholder Role Badge & Account Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Active Role Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: currentRole === 'PATIENT' ? '#f0fdfa' : currentRole === 'HOSPITAL_STAFF' ? '#eff6ff' : '#f5f3ff',
            border: `1px solid ${currentRole === 'PATIENT' ? '#ccfbf1' : currentRole === 'HOSPITAL_STAFF' ? '#dbeafe' : '#ede9fe'}`,
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: currentRole === 'PATIENT' ? '#0d9488' : currentRole === 'HOSPITAL_STAFF' ? '#2563eb' : '#7c3aed'
          }}>
            <Lock size={12} />
            <span>
              {currentRole === 'PATIENT' ? 'Patient Portal' : currentRole === 'HOSPITAL_STAFF' ? 'Hospital Staff Portal' : 'Govt Command Portal'}
            </span>
          </div>

          {/* User Account / Login State */}
          {currentUser ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '4px 10px',
              borderRadius: '9999px'
            }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: currentRole === 'PATIENT' ? '#0d9488' : currentRole === 'HOSPITAL_STAFF' ? '#2563eb' : '#7c3aed',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {currentUser.full_name.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                  {currentUser.full_name.split(' ')[0]}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginLeft: '4px'
                }}
                title="Sign Out / Switch Account"
              >
                <LogOut size={13} />
                <span>Exit</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              <LogIn size={14} />
              <span>Sign In / Switch Role</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
