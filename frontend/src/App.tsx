import React, { useState, useEffect } from 'react';
import { UserRole, User } from './types';
import { Navbar } from './components/Navbar';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { UssdSimulatorModal } from './components/UssdSimulatorModal';
import { AccessDeniedView } from './components/AccessDeniedView';
import { LoginPage } from './pages/LoginPage';
import { PatientPortal } from './pages/PatientPortal';
import { HospitalPortal } from './pages/HospitalPortal';
import { GovtCommandCenter } from './pages/GovtCommandCenter';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { IoTMonitorPage } from './pages/IoTMonitorPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { ABDMAdapterPage } from './pages/ABDMAdapterPage';
import { UserRegistryPage } from './pages/UserRegistryPage';
import { FrontlinePortalPage } from './pages/FrontlinePortalPage';
import { api, createWebSocketSubscriber } from './api/client';

// Strict Role-Based Access Control mapping
const ROLE_ALLOWED_TABS: Record<UserRole, string[]> = {
  PATIENT: ['patient-search', 'patient-referral', 'frontline-portal', 'login'],
  HOSPITAL_STAFF: ['hospital-dashboard', 'clinical-turnover', 'abdm-hub', 'frontline-portal', 'login'],
  GOVT_ADMIN: ['govt-overview', 'digital-twin', 'iot-monitor', 'audit-trail', 'user-registry', 'frontline-portal', 'login'],
};

const ROLE_DEFAULT_TAB: Record<UserRole, string> = {
  PATIENT: 'patient-search',
  HOSPITAL_STAFF: 'hospital-dashboard',
  GOVT_ADMIN: 'govt-overview',
};

export function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('PATIENT');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('patient-search');
  const [isWsConnected, setIsWsConnected] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isUssdOpen, setIsUssdOpen] = useState<boolean>(false);

  // Check existing auth token on boot
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.getMe();
        if (user && user.email) {
          setCurrentUser(user);
          const role = user.role as UserRole;
          setCurrentRole(role);
          setActiveTab(ROLE_DEFAULT_TAB[role] || 'patient-search');
        }
      } catch (e) {
        // Unauthenticated - default to Patient portal
      }
    };
    checkAuth();
  }, []);

  // WebSocket Live Updates
  useEffect(() => {
    const unsubscribe = createWebSocketSubscriber((event, data) => {
      setIsWsConnected(true);
      
      // Spawn toast notifications on live events
      let toastTitle = 'MedFlow Live Update';
      let toastMessage = 'System status updated';
      let toastType: 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'INFO' = 'INFO';

      if (event === 'BED_STATUS_CHANGED') {
        toastTitle = 'Ward Bed Status Modified';
        toastMessage = `Bed #${data.bed_number || 'N/A'} changed to ${data.new_status}`;
        toastType = 'SUCCESS';
      } else if (event === 'OXYGEN_LEVEL_UPDATED') {
        toastTitle = 'Oxygen Inventory Sync';
        toastMessage = `Hospital #${data.hospital_id} updated bulk tank reserves to ${data.bulk_tank_current_kl} kL`;
        toastType = 'INFO';
      } else if (event === 'PREDICTION_RECALCULATED') {
        toastTitle = 'ML Bed Turnover Forecast Updated';
        toastMessage = `Discharge probability recalculated: ${Math.round(data.discharge_prob_12h * 100)}% within 12h`;
        toastType = 'SUCCESS';
      } else if (event === 'REFERRAL_DISPATCHED') {
        toastTitle = '🚨 Emergency Smart Referral';
        toastMessage = `Patient ${data.patient_name} routed to ${data.destination_hospital_name}`;
        toastType = 'WARNING';
      } else if (event === 'DISTRICT_ALERT_TRIGGERED') {
        toastTitle = '⚠️ Inter-District Reallocation';
        toastMessage = `${data.quantity} units of ${data.resource} transferred from ${data.from_district} to ${data.to_district}`;
        toastType = 'CRITICAL';
      }

      const newToast: ToastMessage = {
        id: 'toast_' + Date.now() + Math.random().toString(),
        type: toastType,
        title: toastTitle,
        message: toastMessage
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 3)]);
    });

    return () => unsubscribe();
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLoginSuccess = (user: User, role: UserRole) => {
    setCurrentUser(user);
    setCurrentRole(role);
    setActiveTab(ROLE_DEFAULT_TAB[role]);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setActiveTab('login');
  };

  const handleRoleChange = (role: UserRole) => {
    // When changing role, route to allowed tab for that role or login
    setCurrentRole(role);
    setActiveTab(ROLE_DEFAULT_TAB[role]);
  };

  // Check if current tab is permitted for current role
  const isTabPermitted = activeTab === 'login' || (ROLE_ALLOWED_TABS[currentRole] && ROLE_ALLOWED_TABS[currentRole].includes(activeTab));

  return (
    <div className="app-container">
      {/* Dynamic Global Navbar with strict RBAC */}
      <Navbar
        currentRole={currentRole}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isWsConnected={isWsConnected}
        onOpenUssd={() => setIsUssdOpen(true)}
        onOpenLogin={() => setActiveTab('login')}
        onLogout={handleLogout}
      />

      {/* Main View Area with RBAC Enforcement */}
      <main className="main-content">
        {/* Dedicated Login / Portal Access View */}
        {activeTab === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onContinueAsGuest={() => {
              setCurrentRole('PATIENT');
              setActiveTab('patient-search');
            }}
          />
        )}

        {/* RBAC Violation Guard: If tab is not permitted for this role, show AccessDeniedView */}
        {!isTabPermitted && activeTab !== 'login' && (
          <AccessDeniedView
            currentRole={currentRole}
            currentUser={currentUser}
            attemptedTab={activeTab}
            onGoToAllowedPortal={() => setActiveTab(ROLE_DEFAULT_TAB[currentRole])}
            onOpenLogin={() => setActiveTab('login')}
          />
        )}

        {/* Patient Portal Views (PATIENT ONLY) */}
        {isTabPermitted && activeTab === 'patient-search' && <PatientPortal initialTab="search" />}
        {isTabPermitted && activeTab === 'patient-referral' && <PatientPortal initialTab="referral" />}

        {/* Hospital Staff Views (HOSPITAL_STAFF ONLY) */}
        {isTabPermitted && activeTab === 'hospital-dashboard' && <HospitalPortal />}
        {isTabPermitted && activeTab === 'clinical-turnover' && <HospitalPortal />}
        {isTabPermitted && activeTab === 'abdm-hub' && <ABDMAdapterPage />}

        {/* Government Command Center Views (GOVT_ADMIN ONLY) */}
        {isTabPermitted && activeTab === 'govt-overview' && <GovtCommandCenter />}
        {isTabPermitted && activeTab === 'digital-twin' && <DigitalTwinPage />}
        {isTabPermitted && activeTab === 'iot-monitor' && <IoTMonitorPage />}
        {isTabPermitted && activeTab === 'audit-trail' && <AuditTrailPage />}
        {isTabPermitted && activeTab === 'user-registry' && <UserRegistryPage />}
        {isTabPermitted && activeTab === 'frontline-portal' && <FrontlinePortalPage />}
      </main>

      {/* Real-time WebSocket Toasts */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />

      {/* Interactive Rural USSD / SMS Simulator Modal */}
      <UssdSimulatorModal isOpen={isUssdOpen} onClose={() => setIsUssdOpen(false)} />

      {/* Footer */}
      <footer style={{
        background: '#ffffff', borderTop: '1px solid #e2e8f0',
        padding: '16px 24px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>MedFlow India</strong> — Real-Time Predictive Hospital Resource Management & Bed Turnover Platform
          </div>
          <div>
            ABDM / FHIR R4 Interoperable • Cryptographic Audit Chain • Low-Connectivity USSD Fallback
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
