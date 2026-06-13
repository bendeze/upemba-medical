import { Medicine, PharmacyStock, MedicineBatch, StockMovement, GlobalSettings, MedicalCenter } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/v1/pharmacy` : 'http://localhost:8001/api/v1/pharmacy';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('umis_access_token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
}

export const pharmacyApi = {
  getMedicalCenters: async () => {
    const res = await fetchWithAuth(`${API_BASE}/medical-centers/`);
    return (Array.isArray(res) ? res : (res.results || [])) as MedicalCenter[];
  },
  createMedicalCenter: (data: Partial<MedicalCenter>) => fetchWithAuth(`${API_BASE}/medical-centers/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as Promise<MedicalCenter>,

  getMedicines: async () => {
    const res = await fetchWithAuth(`${API_BASE}/medicines/`);
    return (Array.isArray(res) ? res : (res.results || [])) as Medicine[];
  },
  createMedicine: (data: Partial<Medicine>) => fetchWithAuth(`${API_BASE}/medicines/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as Promise<Medicine>,
  updateMedicine: (id: string, data: Partial<Medicine>) => fetchWithAuth(`${API_BASE}/medicines/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as Promise<Medicine>,
  
  getStock: async (medicalCenterId?: string) => {
    const url = medicalCenterId ? `${API_BASE}/pharmacy-stock/?medical_center=${medicalCenterId}` : `${API_BASE}/pharmacy-stock/`;
    const res = await fetchWithAuth(url);
    return (Array.isArray(res) ? res : (res.results || [])) as PharmacyStock[];
  },

  getBatches: async (medicalCenterId?: string) => {
    const url = medicalCenterId ? `${API_BASE}/medicine-batches/?medical_center=${medicalCenterId}` : `${API_BASE}/medicine-batches/`;
    const res = await fetchWithAuth(url);
    return (Array.isArray(res) ? res : (res.results || [])) as MedicineBatch[];
  },

  getMovements: async (medicalCenterId?: string) => {
    const url = medicalCenterId ? `${API_BASE}/stock-movements/?medical_center=${medicalCenterId}` : `${API_BASE}/stock-movements/`;
    const res = await fetchWithAuth(url);
    return (Array.isArray(res) ? res : (res.results || [])) as StockMovement[];
  },

  createMovement: (data: { medical_center_id: string; medicine_id: string; movement_type: string; quantity: number; expiration_date?: string; date?: string; notes?: string }) => {
    return fetchWithAuth(`${API_BASE}/stock-movements/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }) as Promise<StockMovement>;
  },

  getSettings: () => fetchWithAuth(`${API_BASE}/settings/`) as Promise<GlobalSettings>,
  updateSettings: (data: Partial<GlobalSettings>) => fetchWithAuth(`${API_BASE}/settings/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }) as Promise<GlobalSettings>,

  importRequisition: async (siteId: string, file: File) => {
    const token = localStorage.getItem('umis_access_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/import-requisition/${siteId}/`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to import requisition');
    }
    return response.json();
  },

  importConsumption: async (siteId: string, file: File) => {
    const token = localStorage.getItem('umis_access_token');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/import-consumption/${siteId}/`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to import consumption');
    }
    return response.json();
  }
};
