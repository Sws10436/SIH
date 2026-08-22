import {
  HospitalSummary, HospitalDetail, Bed, PatientStay, HospitalPredictionSummary,
  BedTurnoverPrediction, HospitalReferralScore, GovtCommandOverview, DistrictAlert,
  IoTTelemetryItem, AuditLogItem, SimulationResult
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? '/api' : 'http://localhost:8000/api');

class ApiClient {
  private token: string | null = localStorage.getItem('medflow_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('medflow_token', token);
    } else {
      localStorage.removeItem('medflow_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errText = await response.text();
      try {
        const errJson = JSON.parse(errText);
        throw new Error(errJson.detail || 'API request failed');
      } catch (e: any) {
        throw new Error(e.message || `HTTP ${response.status}`);
      }
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const res = await this.request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async register(data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    hospital_id?: number | null;
    phone?: string;
    department?: string;
    designation?: string;
    abha_id?: string;
  }) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async getUsers() {
    return this.request<any[]>('/auth/users');
  }

  logout() {
    this.setToken(null);
  }

  // Hospitals
  async getHospitals(params: { district_id?: number; specialty?: string; pmjay_only?: boolean; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.district_id) query.set('district_id', params.district_id.toString());
    if (params.specialty) query.set('specialty', params.specialty);
    if (params.pmjay_only) query.set('pmjay_only', 'true');
    if (params.search) query.set('search', params.search);
    return this.request<HospitalSummary[]>(`/hospitals?${query.toString()}`);
  }

  async getHospitalDetail(id: number) {
    return this.request<HospitalDetail>(`/hospitals/${id}`);
  }

  async updateOxygen(hospitalId: number, data: { bulk_tank_current_kl?: number; cylinder_d_type_count?: number }) {
    return this.request(`/hospitals/${hospitalId}/oxygen`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateBlood(hospitalId: number, bloodGroup: string, units: number) {
    return this.request(`/hospitals/${hospitalId}/blood`, {
      method: 'PATCH',
      body: JSON.stringify({ blood_group: bloodGroup, units_available: units }),
    });
  }

  // Beds
  async getBeds(hospitalId?: number) {
    const query = hospitalId ? `?hospital_id=${hospitalId}` : '';
    return this.request<Bed[]>(`/beds${query}`);
  }

  async toggleBedStatus(bedId: number, status: string) {
    return this.request(`/beds/${bedId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async batchToggleBeds(bedIds: number[], newStatus: string) {
    return this.request('/beds/batch-toggle', {
      method: 'POST',
      body: JSON.stringify({ bed_ids: bedIds, new_status: newStatus }),
    });
  }

  // ML Predictions
  async getHospitalPredictions(hospitalId: number) {
    return this.request<HospitalPredictionSummary>(`/predictions/hospital/${hospitalId}`);
  }

  async getPatientPrediction(stayId: number) {
    return this.request<BedTurnoverPrediction>(`/predictions/patient/${stayId}`);
  }

  async getPatientStays(hospitalId?: number) {
    const query = hospitalId ? `?hospital_id=${hospitalId}` : '';
    return this.request<PatientStay[]>(`/predictions/stays${query}`);
  }

  async updatePatientVitals(stayId: number, data: any) {
    return this.request<{ message: string; prediction: any }>(`/predictions/patient/${stayId}/recalculate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Smart Referrals
  async getReferralRecommendations(payload: {
    originating_lat: number;
    originating_lng: number;
    required_specialty: string;
    required_bed_type: string;
    insurance_scheme?: string;
    urgency_level: string;
  }) {
    return this.request<HospitalReferralScore[]>('/referrals/recommend', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createReferral(payload: any) {
    return this.request('/referrals/request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getReferrals() {
    return this.request<any[]>('/referrals');
  }

  async getAmbulances() {
    return this.request<any[]>('/ambulances');
  }

  // Govt Admin
  async getAdminOverview() {
    return this.request<GovtCommandOverview>('/admin/overview');
  }

  async getDistrictAlerts() {
    return this.request<DistrictAlert[]>('/admin/alerts');
  }

  async reallocateResources(payload: {
    from_district_id: number;
    to_district_id: number;
    resource_type: string;
    quantity: number;
    notes?: string;
  }) {
    return this.request<{ message: string; status: string }>('/admin/reallocate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Digital Twin Simulation
  async runSimulation(payload: {
    scenario_type: string;
    patient_influx_surge_pct: number;
    icu_demand_multiplier: number;
    oxygen_consumption_multiplier: number;
    duration_days: number;
  }) {
    return this.request<SimulationResult>('/simulation/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // IoT Telemetry
  async getIoTTelemetry() {
    return this.request<IoTTelemetryItem[]>('/iot/telemetry');
  }

  // Blockchain Audit Trail
  async getAuditLogs(limit: number = 40) {
    return this.request<AuditLogItem[]>(`/audit-logs?limit=${limit}`);
  }

  async verifyAuditTrail() {
    return this.request<{
      is_valid: boolean;
      total_blocks_verified: number;
      last_block_hash: string;
      chain_integrity_status: string;
    }>('/audit-logs/verify');
  }

  // ABDM / FHIR
  async exportFHIRBundle(stayId: number) {
    return this.request<any>(`/abdm/export/${stayId}`);
  }

  async verifyABHA(abhaId: string) {
    return this.request<any>('/abdm/fetch-records', {
      method: 'POST',
      body: JSON.stringify({ abha_id: abhaId }),
    });
  }

  // Rural Gateway
  async queryUSSD(sessionId: string, userInput: string) {
    return this.request<{ session_id: string; message: string; should_continue: boolean }>('/rural/ussd', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, phone_number: '+919876543210', user_input: userInput }),
    });
  }

  async querySMS(senderPhone: string, messageBody: string) {
    return this.request<{ reply_to: string; sms_text: string; hospitals_found: number }>('/rural/sms', {
      method: 'POST',
      body: JSON.stringify({ sender_phone: senderPhone, message_body: messageBody }),
    });
  }

  // Triage Module
  async submitTriage(data: {
    patient_name: string;
    patient_age: number;
    abha_id?: string;
    danger_signs: string;
    fever: boolean;
    chronic_flags: string;
    recommendation: string;
  }) {
    return this.request<any>('/triage/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTriageEncounters(abhaId?: string) {
    const url = abhaId ? `/triage?abha_id=${abhaId}` : '/triage';
    return this.request<any[]>(url);
  }

  // Follow-Ups
  async getFollowUps(status?: string) {
    const url = status ? `/followups?status=${status}` : '/followups';
    return this.request<any[]>(url);
  }

  async scheduleFollowUp(data: { patient_name: string; category: string; abha_id?: string }) {
    const query = new URLSearchParams();
    query.set('patient_name', data.patient_name);
    query.set('category', data.category);
    if (data.abha_id) query.set('abha_id', data.abha_id);
    return this.request<any>(`/followups/schedule?${query.toString()}`, {
      method: 'POST',
    });
  }

  async completeFollowUp(id: number) {
    return this.request<any>(`/followups/${id}/complete`, {
      method: 'POST',
    });
  }

  // Referral Status State Machine
  async updateReferralStatus(id: number, status: string) {
    return this.request<any>(`/referrals/${id}/status?status=${status}`, {
      method: 'POST',
    });
  }

  // IVR System Call
  async queryIVR(language: string, digitsPressed: string) {
    return this.request<any>('/ivr/call', {
      method: 'POST',
      body: JSON.stringify({ language, digits_pressed: digitsPressed }),
    });
  }
}

export const api = new ApiClient();

// WebSocket Real-Time Subscriber
export function createWebSocketSubscriber(onMessage: (event: string, data: any) => void) {
  const defaultWsHost = typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000`
    : 'ws://localhost:8000';
  const wsUrl = (import.meta.env.VITE_WS_URL || defaultWsHost) + '/ws/live';
  let socket: WebSocket | null = null;
  let reconnectTimer: any = null;

  function connect() {
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[MedFlow WS] Connected to live event stream');
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event && payload.data) {
            onMessage(payload.event, payload.data);
          }
        } catch (e) {
          console.error('[MedFlow WS] Parse error', e);
        }
      };

      socket.onclose = () => {
        console.warn('[MedFlow WS] Disconnected. Reconnecting in 3s...');
        reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('[MedFlow WS] Error', err);
        socket?.close();
      };
    } catch (err) {
      reconnectTimer = setTimeout(connect, 4000);
    }
  }

  connect();

  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket) socket.close();
  };
}
