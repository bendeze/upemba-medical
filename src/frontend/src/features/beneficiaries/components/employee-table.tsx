'use client';

import React from 'react';
import { 
  useEmployees, 
  useRegions, 
  useSites, 
  useDeleteEmployee 
} from '../hooks/use-beneficiaries';
import { useBeneficiariesStore } from '../store/use-beneficiaries-store';
import { Employee, EmploymentStatus } from '../types';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { api } from '../services/api';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Plus, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  Edit, 
  Trash2, 
  Eye,
  Loader2,
  Users,
  X
} from 'lucide-react';

interface EmployeeTableProps {
  onViewDetails: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ onViewDetails, onEdit }) => {
  const { t } = useTranslation();
  
  // Custom states for delete and export
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteModalError, setDeleteModalError] = React.useState<string | null>(null);
  
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  // Connect store states
  const { 
    search, setSearch,
    regionId, setRegionId,
    siteId, setSiteId,
    status, setStatus,
    page, setPage,
    setCreateOpen,
    setImportOpen,
    resetFilters
  } = useBeneficiariesStore();

  // Queries
  const { data: regions } = useRegions();
  const { data: sites } = useSites(regionId || undefined);
  const { data: empData, isLoading, isPlaceholderData } = useEmployees({
    page,
    search,
    regionId,
    siteId,
    status
  });

  // Mutations
  const deleteEmployeeMutation = useDeleteEmployee();

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    if (empData && !empData.next && newPage > page) return;
    setPage(newPage);
  };

  const handleDeleteTrigger = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteModalError(null);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      await api.exportExcel({
        search,
        regionId,
        siteId,
        status,
      });
    } catch (err: any) {
      setExportError(err.message || t('table.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadgeClass = (status: EmploymentStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'SUSPENDED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RETIRED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Error Alert */}
      {exportError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-center justify-between shadow-sm">
          <span>{exportError}</span>
          <button onClick={() => setExportError(null)} className="text-red-500 hover:text-red-700 cursor-pointer p-1 rounded-md hover:bg-red-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Header Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm glass">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            {t('table.title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t('table.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            {t('table.importBtn')}
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 text-teal-600 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-teal-600" />
            )}
            {t('table.exportBtn')}
          </button>
          
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-medium text-sm transition shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {t('table.addBtn')}
          </button>
        </div>
      </div>

      {/* 2. Visual Filtering Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('table.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
          />
        </div>

        {/* Region */}
        <div className="relative">
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none cursor-pointer"
          >
            <option value="">{t('table.allRegions')}</option>
            {regions?.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Site */}
        <div className="relative">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            disabled={!regionId}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none disabled:opacity-50 cursor-pointer"
          >
            <option value="">{t('table.allSites')}</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none cursor-pointer"
          >
            <option value="">{t('table.allStatuses')}</option>
            <option value="ACTIVE">{t('table.statusActive')}</option>
            <option value="INACTIVE">{t('table.statusInactive')}</option>
            <option value="SUSPENDED">{t('table.statusSuspended')}</option>
            <option value="RETIRED">{t('table.statusRetired')}</option>
          </select>
        </div>

        {/* Reset */}
        <button
          onClick={resetFilters}
          className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          {t('table.resetFilters')}
        </button>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
            <p className="text-slate-500 text-sm">{t('table.loading')}</p>
          </div>
        ) : !empData || empData.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Users className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">{t('table.noEmployees')}</h3>
            <p className="text-slate-500 text-sm max-w-xs mt-1">
              {t('table.noEmployeesDesc')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">{t('table.thEmpNumber')}</th>
                  <th className="px-6 py-4">{t('table.thName')}</th>
                  <th className="px-6 py-4">{t('table.thRegionSite')}</th>
                  <th className="px-6 py-4">{t('table.thStatus')}</th>
                  <th className="px-6 py-4">{t('table.thDependents')}</th>
                  <th className="px-6 py-4 text-right">{t('table.thActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {empData.results.map((emp) => (
                  <tr 
                    key={emp.id} 
                    className={`hover:bg-slate-50/50 transition cursor-pointer ${isPlaceholderData ? 'opacity-70' : ''}`}
                    onClick={() => onViewDetails(emp)}
                  >
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">
                      {emp.employee_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {emp.last_name} {emp.post_name || ''}
                      </div>
                      <div className="text-slate-500 text-xs">{emp.first_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700">{emp.region_name || t('common.no_region')}</div>
                      <div className="text-slate-500 text-xs">{emp.site_name || t('common.unassigned')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(emp.employment_status)}`}>
                        {t(`table.status${emp.employment_status.charAt(0).toUpperCase()}${emp.employment_status.slice(1).toLowerCase()}` as any)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-100 font-mono text-xs">
                        {emp.dependents?.length || 0} {t('table.dependentsCount')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewDetails(emp)}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                          title={t('table.actionView')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEdit(emp)}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-teal-600 transition cursor-pointer"
                          title={t('table.actionEdit')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTrigger(emp.id, `${emp.last_name} ${emp.first_name}`)}
                          className="p-1.5 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                          title={t('table.actionDelete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Table Pagination Footer */}
        {empData && empData.count > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="text-slate-500 text-xs">
              {t('table.showingPage').replace('{page}', String(page)).replace('{count}', String(empData.count))}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs font-medium transition cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {t('table.previous')}
              </button>
              
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={!empData.next || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-xs font-medium transition cursor-pointer"
              >
                {t('table.next')}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom React Delete Confirmation Overlay Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              {t('table.actionDelete')}
            </h3>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              {t('table.deleteConfirm').replace('{name}', deleteTarget.name)}
            </p>
            {deleteModalError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                {deleteModalError}
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteModalError(null); }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-semibold text-sm transition cursor-pointer"
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    setDeleteModalError(null);
                    await deleteEmployeeMutation.mutateAsync(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (err: any) {
                    setDeleteModalError(err.message || t('table.deleteError'));
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 font-semibold text-sm transition shadow-md cursor-pointer flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('regions.deleteModalDeletingBtn')}
                  </>
                ) : (
                  t('regions.deleteModalConfirmBtn')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
