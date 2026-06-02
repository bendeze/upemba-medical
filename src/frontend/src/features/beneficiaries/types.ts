export interface Region {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  region: string | null;
  region_name: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export type DependentRelationship = 'SPOUSE' | 'CHILD';
export type DependentGender = 'M' | 'F';

export interface Dependent {
  id: string;
  employee: string;
  full_name: string;
  gender: DependentGender;
  birth_date: string | null;
  relationship: DependentRelationship;
  created_at: string;
  updated_at: string;
}

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'RETIRED';

export interface Employee {
  id: string;
  employee_number: string;
  last_name: string;
  post_name: string | null;
  first_name: string;
  site: string | null;
  site_name: string | null;
  region_id: string | null;
  region_name: string | null;
  address: string | null;
  employment_status: EmploymentStatus;
  dependents: Dependent[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  username: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'IMPORT';
  entity_type: string;
  entity_id: string;
  changes: Record<string, [any, any]>;
  timestamp: string;
}

export interface ImportLog {
  level: 'INFO' | 'WARNING' | 'ERROR';
  sheet: string;
  row: number | null;
  message: string;
}

export interface ImportReport {
  success: boolean;
  summary: {
    regions_created: number;
    sites_created: number;
    employees_created: number;
    employees_updated: number;
    dependents_created: number;
    errors_count: number;
    warnings_count: number;
  };
  sheets_processed: Array<{
    name: string;
    rows_processed: number;
    employees_created: number;
    dependents_created: number;
  }>;
  logs: ImportLog[];
}
