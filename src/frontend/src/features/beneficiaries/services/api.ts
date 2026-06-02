import { 
  Region, 
  Site, 
  Employee, 
  Dependent, 
  AuditLog, 
  ImportReport 
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

// Simple helper to fetch the stored JWT token
function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('umis_access_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Global API Request handler
async function apiRequest<T>(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
  body: any = null,
  isMultipart = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  
  if (!isMultipart && body) {
    headers['Content-Type'] = 'application/json';
  }
  
  const config: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    config.body = isMultipart ? body : JSON.stringify(body);
  }
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    let errorDetail = 'An error occurred while connecting to the server.';
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      errorDetail = `HTTP error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

// Helper functions to translate naming fields between frontend (first_name, post_name, last_name)
// and backend (nom, post_nom, prenom) to reconcile with the updated backend employee model.
function mapEmployeeToBackend(frontendEmp: any): any {
  if (!frontendEmp) return frontendEmp;
  const { first_name, last_name, post_name, ...rest } = frontendEmp;
  const mapped: any = { ...rest };
  if (first_name !== undefined) mapped.nom = first_name;
  if (last_name !== undefined) mapped.prenom = last_name;
  if (post_name !== undefined) mapped.post_nom = post_name;
  return mapped;
}

function mapEmployeeFromBackend(backendEmp: any): Employee {
  if (!backendEmp) return backendEmp;
  const { nom, prenom, post_nom, ...rest } = backendEmp;
  return {
    ...rest,
    first_name: nom || '',
    last_name: prenom || '',
    post_name: post_nom || null,
  } as Employee;
}

export const api = {
  // Authentication
  async login(username: string, password: string): Promise<{ access: string; refresh: string }> {
    const data = await apiRequest<{ access: string; refresh: string }>('/token/', 'POST', { username, password });
    localStorage.setItem('umis_access_token', data.access);
    localStorage.setItem('umis_refresh_token', data.refresh);
    return data;
  },

  logout() {
    localStorage.removeItem('umis_access_token');
    localStorage.removeItem('umis_refresh_token');
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('umis_access_token');
  },

  // Regions
  getRegions(): Promise<Region[]> {
    return apiRequest<Region[]>('/v1/regions/');
  },
  
  createRegion(name: string): Promise<Region> {
    return apiRequest<Region>('/v1/regions/', 'POST', { name });
  },

  updateRegion(id: string, name: string): Promise<Region> {
    return apiRequest<Region>(`/v1/regions/${id}/`, 'PUT', { name });
  },

  deleteRegion(id: string): Promise<void> {
    return apiRequest<void>(`/v1/regions/${id}/`, 'DELETE');
  },

  // Sites
  getSites(regionId?: string): Promise<Site[]> {
    const query = regionId ? `?region=${regionId}` : '';
    return apiRequest<Site[]>(`/v1/sites/${query}`);
  },

  createSite(regionId: string, name: string): Promise<Site> {
    return apiRequest<Site>('/v1/sites/', 'POST', { region: regionId, name });
  },

  updateSite(id: string, regionId: string, name: string): Promise<Site> {
    return apiRequest<Site>(`/v1/sites/${id}/`, 'PUT', { region: regionId, name });
  },

  // Employees
  async getEmployees(params: {
    page?: number;
    search?: string;
    regionId?: string;
    siteId?: string;
    status?: string;
  }): Promise<{ count: number; next: string | null; previous: string | null; results: Employee[] }> {
    const queryParts: string[] = [];
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params.regionId) queryParts.push(`site__region=${params.regionId}`);
    if (params.siteId) queryParts.push(`site=${params.siteId}`);
    if (params.status) queryParts.push(`employment_status=${params.status}`);
    
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const data = await apiRequest<{ count: number; next: string | null; previous: string | null; results: any[] }>(
      `/v1/employees/${query}`
    );
    return {
      ...data,
      results: data.results.map(mapEmployeeFromBackend),
    };
  },

  async getEmployee(id: string): Promise<Employee> {
    const data = await apiRequest<any>(`/v1/employees/${id}/`);
    return mapEmployeeFromBackend(data);
  },

  async createEmployee(employee: {
    employee_number: string;
    last_name: string;
    post_name?: string;
    first_name: string;
    site: string;
    address?: string;
    employment_status: string;
  }): Promise<Employee> {
    const backendData = mapEmployeeToBackend(employee);
    const data = await apiRequest<any>('/v1/employees/', 'POST', backendData);
    return mapEmployeeFromBackend(data);
  },

  async updateEmployee(id: string, employee: Partial<{
    employee_number: string;
    last_name: string;
    post_name?: string;
    first_name: string;
    site: string;
    address?: string;
    employment_status: string;
  }>): Promise<Employee> {
    const backendData = mapEmployeeToBackend(employee);
    const data = await apiRequest<any>(`/v1/employees/${id}/`, 'PUT', backendData);
    return mapEmployeeFromBackend(data);
  },

  deleteEmployee(id: string): Promise<void> {
    return apiRequest<void>(`/v1/employees/${id}/`, 'DELETE');
  },

  // Dependents
  addDependent(employeeId: string, dependent: {
    full_name: string;
    gender: 'M' | 'F';
    relationship: 'SPOUSE' | 'CHILD';
    birth_date?: string;
  }): Promise<Dependent> {
    return apiRequest<Dependent>(`/v1/employees/${employeeId}/dependents/`, 'POST', {
      ...dependent,
      employee: employeeId,
    });
  },

  updateDependent(id: string, dependent: Partial<{
    full_name: string;
    gender: 'M' | 'F';
    relationship: 'SPOUSE' | 'CHILD';
    birth_date?: string;
    employee?: string;
  }>): Promise<Dependent> {
    return apiRequest<Dependent>(`/v1/dependents/${id}/`, 'PUT', dependent);
  },

  deleteDependent(id: string): Promise<void> {
    return apiRequest<void>(`/v1/dependents/${id}/`, 'DELETE');
  },

  getDependents(params?: { page?: number; search?: string }): Promise<{ count: number; next: string | null; previous: string | null; results: Dependent[] }> {
    const queryParts: string[] = [];
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiRequest<{ count: number; next: string | null; previous: string | null; results: Dependent[] }>(
      `/v1/dependents/${query}`
    );
  },

  // Excel Import
  importExcel(file: File): Promise<ImportReport> {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<ImportReport>('/v1/beneficiaries/import/', 'POST', formData, true);
  },

  importExcelFromUrl(url: string): Promise<ImportReport> {
    return apiRequest<ImportReport>('/v1/beneficiaries/import-url/', 'POST', { url });
  },

  async exportExcel(filters: {
    search?: string;
    regionId?: string;
    siteId?: string;
    status?: string;
  }): Promise<void> {
    const queryParts: string[] = [];
    if (filters.search) queryParts.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters.regionId) queryParts.push(`site__region=${filters.regionId}`);
    if (filters.siteId) queryParts.push(`site=${filters.siteId}`);
    if (filters.status) queryParts.push(`employment_status=${filters.status}`);
    
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const url = `${API_BASE_URL}/v1/beneficiaries/export/${query}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      let errorDetail = 'An error occurred while downloading the file.';
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        errorDetail = `HTTP error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'umis_roster_export.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Audit Logs
  getAuditLogs(params: { entityType?: string; entityId?: string }): Promise<AuditLog[]> {
    const queryParts: string[] = [];
    if (params.entityType) queryParts.push(`entity_type=${params.entityType}`);
    if (params.entityId) queryParts.push(`entity_id=${params.entityId}`);
    
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return apiRequest<AuditLog[]>(`/v1/audit-logs/${query}`);
  }
};
