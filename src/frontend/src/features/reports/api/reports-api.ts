const API_BASE = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/v1/reports` : 'http://localhost:8001/api/v1/reports';

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

async function fetchBlobWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('umis_access_token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.blob();
}

export const reportsApi = {
  getOverview: async () => {
    return fetchWithAuth(`${API_BASE}/overview/`);
  },
  getPharmacyReports: async (startDate?: string, endDate?: string) => {
    let url = `${API_BASE}/pharmacy/`;
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    return fetchWithAuth(url);
  },
  getConsultationReports: async () => {
    return fetchWithAuth(`${API_BASE}/consultations/`);
  },
  getExportData: async (type: string, startDate?: string, endDate?: string) => {
    let url = `${API_BASE}/export/?type=${type}`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    return fetchWithAuth(url);
  },
  downloadExportPDF: async (type: string, startDate?: string, endDate?: string) => {
    let url = `${API_BASE}/export/?type=${type}&export_format=pdf`;
    if (startDate) url += `&start_date=${startDate}`;
    if (endDate) url += `&end_date=${endDate}`;
    
    const blob = await fetchBlobWithAuth(url);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${type.toLowerCase()}_report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
};
