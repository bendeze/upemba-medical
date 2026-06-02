'use client';

import React, { useState } from 'react';
import { useDependents, useEmployees } from '../hooks/use-beneficiaries';
import { Dependent } from '../types';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Loader2, 
  UserCheck, 
  ArrowLeft,
  Calendar,
  Heart,
  Baby
} from 'lucide-react';
import { useLayoutStore } from '@/features/layout/store/use-layout-store';
import { useBeneficiariesStore } from '../store/use-beneficiaries-store';

export function DependentsPage() {
  const { t } = useTranslation();
  const { setActiveTab } = useLayoutStore();
  const { setSelectedEmployeeId } = useBeneficiariesStore();

  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Queries
  const { data: depData, isLoading } = useDependents({ page, search });
  
  // We fetch employees to map parent names in lookup if needed, but our DependentSerializer already has the basic data.
  // Wait, let's look at what the DependentSerializer returns:
  // id, employee, full_name, gender, birth_date, relationship, created_at, updated_at
  // If we want to show the parent employee name/number, let's fetch employees to do a lookup or let's use the employee ID.
  // Wait! The user can click "View Employee" to open the parent's file drawer directly!
  
  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    if (depData && !depData.next && newPage > page) return;
    setPage(newPage);
  };

  const getRelationshipIcon = (relationship: Dependent['relationship']) => {
    switch (relationship) {
      case 'SPOUSE':
        return <Heart className="h-4 w-4 text-rose-500 shrink-0" />;
      default:
        return <Baby className="h-4 w-4 text-sky-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm glass">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('beneficiaries')}
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
            title={t('regions.backBtn')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-600" />
              {t('dependents.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('dependents.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Visual Filtering Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm max-w-md">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('dependents.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
          />
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
            <p className="text-slate-500 text-sm">{t('dependents.loading')}</p>
          </div>
        ) : !depData || depData.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <UserCheck className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">{t('dependents.noDependents')}</h3>
            <p className="text-slate-500 text-sm max-w-xs mt-1">
              {t('dependents.noDependentsDesc')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">{t('dependents.thName')}</th>
                  <th className="px-6 py-4">{t('dependents.thRelationship')}</th>
                  <th className="px-6 py-4">{t('dependents.thGender')}</th>
                  <th className="px-6 py-4">{t('dependents.thBirthDate')}</th>
                  <th className="px-6 py-4">{t('dependents.thParentEmployee')}</th>
                  <th className="px-6 py-4 text-right">{t('dependents.thActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {depData.results.map((dep) => (
                  <tr 
                    key={dep.id} 
                    className="hover:bg-slate-50/50 transition"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                      <span className="bg-slate-50 p-1.5 border border-slate-200 rounded-lg shrink-0">
                        {getRelationshipIcon(dep.relationship)}
                      </span>
                      {dep.full_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        dep.relationship === 'SPOUSE' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-sky-50 text-sky-700 border border-sky-100'
                      }`}>
                        {t(dep.relationship === 'SPOUSE' ? 'dependents.spouse' : 'dependents.child')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 uppercase font-medium text-xs">
                      {dep.gender === 'F' ? t('dependents.genderFemale') : t('dependents.genderMale')}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {dep.birth_date ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {dep.birth_date}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-sans italic">{t('dependents.notProvided')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 font-semibold">
                      {dep.employee}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedEmployeeId(dep.employee);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition text-xs font-semibold ml-auto cursor-pointer shadow-sm"
                        title={t('dependents.viewEmployeeTooltip')}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {t('dependents.viewEmployeeBtn')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Table Pagination Footer */}
        {depData && depData.count > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="text-slate-500 text-xs">
              {t('dependents.showingPage').replace('{page}', String(page)).replace('{count}', String(depData.count))}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs font-medium transition cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {t('dependents.previous')}
              </button>
              
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={!depData.next || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs font-medium transition cursor-pointer"
              >
                {t('dependents.next')}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
