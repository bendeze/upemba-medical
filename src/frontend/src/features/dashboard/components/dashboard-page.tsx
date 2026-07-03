// dashboard-page.tsx
// Modular Dashboard Page component for Upemba Medical Information System (UMIS)
// Renders operational cards grid and embeds the Beneficiary directory table.

import React from 'react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { EmployeeTable } from '@/features/beneficiaries/components/employee-table';
import { useEmployees, useRegions, useDependents } from '@/features/beneficiaries/hooks/use-beneficiaries';
import { Employee } from '@/features/beneficiaries/types';
import { useLayoutStore } from '@/features/layout/store/use-layout-store';
import { Users, UserCheck, Building2, TrendingUp } from 'lucide-react';

interface DashboardPageProps {
  onViewDetails: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
}

export function DashboardPage({ onViewDetails, onEdit }: DashboardPageProps) {
  const { t } = useTranslation();
  const { setActiveTab } = useLayoutStore();

  // Fetch count statistics (from cached react-query responses)
  const { data: regions } = useRegions();
  const { data: empData } = useEmployees({ page: 1, search: '', regionId: '', siteId: '', status: '' });
  const { data: dependentsData } = useDependents({ page: 1 });

  // Summation details
  const totalEmployees = empData?.count || 0;
  const regionsCount = regions?.length || 0;
  const totalAyantsDroits = dependentsData?.count || 0; // Complete database count of dependents

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Overview Analytics Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Agents */}
        <div className="bg-white p-5 border border-border rounded-xl shadow-sm flex items-start gap-4 hover:shadow-md transition">
          <div className="bg-accent/40 p-3 border border-accent rounded-xl text-primary shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.totalAgents')}</span>
            <span className="block text-2xl font-bold text-slate-800 mt-1">{totalEmployees}</span>
          </div>
        </div>

        {/* Card 2: Dependents */}
        <div 
          onClick={() => setActiveTab('dependents')}
          className="bg-white p-5 border border-border rounded-xl shadow-sm flex items-start gap-4 hover:shadow-md transition cursor-pointer hover:border-teal-400 group"
          title={t('dashboard.viewDependents')}
        >
          <div className="bg-secondary/40 p-3 border border-secondary rounded-xl text-secondary-foreground shrink-0 transition group-hover:bg-teal-50">
            <UserCheck className="h-5 w-5 text-teal-600 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.dependents')}</span>
            <span className="block text-2xl font-bold text-slate-800 mt-1">{totalAyantsDroits}</span>
          </div>
        </div>

        {/* Card 3: Regions */}
        <div 
          onClick={() => setActiveTab('regions')}
          className="bg-white p-5 border border-border rounded-xl shadow-sm flex items-start gap-4 hover:shadow-md transition cursor-pointer hover:border-teal-400 group"
          title={t('dashboard.viewRegions')}
        >
          <div className="bg-muted p-3 border border-border rounded-xl text-muted-foreground shrink-0 transition group-hover:bg-teal-50">
            <Building2 className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.regions')}</span>
            <span className="block text-2xl font-bold text-slate-800 mt-1">{regionsCount}</span>
          </div>
        </div>

        {/* Card 4: Coverage */}
        <div className="bg-white p-5 border border-border rounded-xl shadow-sm flex items-start gap-4 hover:shadow-md transition">
          <div className="bg-primary/10 p-3 border border-primary/20 rounded-xl text-primary shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.coverage')}</span>
            <span className="block text-2xl font-bold text-slate-800 mt-1">100%</span>
          </div>
        </div>
      </div>

      {/* Roster Management Directory Table */}
      <EmployeeTable 
        onViewDetails={onViewDetails} 
        onEdit={onEdit} 
      />
    </div>
  );
}
