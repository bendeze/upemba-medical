'use client';

import React, { useState } from 'react';
import { useEmployee, useDeleteDependent } from '../hooks/use-beneficiaries';
import { Employee, Dependent } from '../types';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { 
  X, 
  Loader2, 
  MapPin, 
  Building2, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Calendar,
  Heart,
  Baby,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { DependentDialog } from './dependent-dialog';

interface EmployeeDetailsDrawerProps {
  employeeId: string;
  onClose: () => void;
  onAddDependent?: () => void;
  onEdit?: (employee: Employee) => void;
}

export const EmployeeDetailsDrawer: React.FC<EmployeeDetailsDrawerProps> = ({ 
  employeeId, 
  onClose, 
  onAddDependent,
  onEdit
}) => {
  const { t } = useTranslation();

  // Query
  const { data: employee, isLoading } = useEmployee(employeeId);

  // Local state for Managing Dependents inside the drawer
  const [isDependentDialogOpen, setIsDependentDialogOpen] = useState<boolean>(false);
  const [activeDependent, setActiveDependent] = useState<Dependent | null>(null);

  // Local Deletion States (compliant with no native alerts/confirms guideline)
  const [depToDelete, setDepToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingDep, setIsDeletingDep] = useState<boolean>(false);
  const [deleteDepError, setDeleteDepError] = useState<string | null>(null);

  // Mutation
  const deleteDependentMutation = useDeleteDependent(employeeId);

  const handleDeleteDependent = (id: string, name: string) => {
    setDepToDelete({ id, name });
    setDeleteDepError(null);
  };

  const handleConfirmDeleteDependent = async (id: string) => {
    setIsDeletingDep(true);
    setDeleteDepError(null);
    try {
      await deleteDependentMutation.mutateAsync(id);
      setDepToDelete(null);
    } catch (err: any) {
      setDeleteDepError(err.message || t('employee.drawer.failedDeleteDep'));
    } finally {
      setIsDeletingDep(false);
    }
  };

  const handleAddDependent = () => {
    setActiveDependent(null);
    setIsDependentDialogOpen(true);
    if (onAddDependent) {
      // Still trigger if parent listens, but we handle it internally now
    }
  };

  const handleEditDependent = (dep: Dependent) => {
    setActiveDependent(dep);
    setIsDependentDialogOpen(true);
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
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            {t('employee.drawer.title')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('employee.drawer.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && employee && (
            <button 
              onClick={() => onEdit(employee)}
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-teal-600 transition cursor-pointer"
              title={t('table.actionEdit')}
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        /* --- Loading State --- */
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
          <p className="text-slate-500 text-sm">{t('employee.drawer.loading')}</p>
        </div>
      ) : !employee ? (
        /* --- Error State --- */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <p className="text-red-500 text-sm font-semibold">{t('employee.drawer.failedLoad')}</p>
        </div>
      ) : (
        /* --- Details Body --- */
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* A. Bio Details Card */}
          <div className="bg-gradient-to-br from-teal-50/50 to-teal-50/10 p-5 rounded-xl border border-teal-100 space-y-3">
            <div>
              <span className="bg-teal-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                {t('common.id')}: {employee.employee_number}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">
                {employee.last_name} {employee.post_name || ''} {employee.first_name}
              </h2>
            </div>
            
            <div className="space-y-2.5 text-sm text-slate-600 border-t border-teal-100/50 pt-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  {t('employee.drawer.site')}: <strong className="text-slate-800">{employee.site_name || t('common.unassigned')}</strong> {employee.region_name ? `(${employee.region_name})` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  {t('employee.drawer.status')}: <strong className="text-slate-800 uppercase text-xs">{t('table.status' + employee.employment_status.charAt(0).toUpperCase() + employee.employment_status.slice(1).toLowerCase())}</strong>
                </span>
              </div>
              {employee.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {t('employee.drawer.address')}: <span className="text-slate-700 leading-normal">{employee.address}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* B. Dependents List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                {t('employee.drawer.dependents')} ({employee.dependents?.length || 0})
              </h4>
              
              <button
                onClick={handleAddDependent}
                className="flex items-center gap-1 text-teal-600 hover:text-teal-700 hover:underline text-xs font-semibold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('employee.drawer.addDependent')}
              </button>
            </div>

            {!employee.dependents || employee.dependents.length === 0 ? (
              <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 text-xs block">{t('employee.drawer.noDependents')}</span>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[250px] mx-auto leading-normal">
                  {t('employee.drawer.noDependentsDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {employee.dependents.map((dep) => (
                  <div 
                    key={dep.id} 
                    className="p-3.5 border border-slate-200 rounded-xl bg-white flex items-center justify-between hover:shadow-sm hover:border-slate-300 transition duration-150"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 bg-slate-50 p-2 border border-slate-200 rounded-lg shrink-0">
                        {getRelationshipIcon(dep.relationship)}
                      </div>
                      <div>
                        <h5 className="font-semibold text-slate-800 text-sm leading-normal">
                          {dep.full_name}
                        </h5>
                        
                        <div className="flex items-center gap-3 text-slate-500 text-[10px] uppercase font-semibold mt-1">
                          <span>{t(dep.relationship === 'SPOUSE' ? 'dependents.spouse' : 'dependents.child')}</span>
                          <span className="h-1 w-1 bg-slate-300 rounded-full" />
                          <span>{dep.gender === 'F' ? t('dependents.genderFemale') : t('dependents.genderMale')}</span>
                          {dep.birth_date && (
                            <>
                              <span className="h-1 w-1 bg-slate-300 rounded-full" />
                              <span className="flex items-center gap-0.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(dep.birth_date).getFullYear()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditDependent(dep)}
                        className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-teal-600 transition cursor-pointer"
                        title={t('table.actionEdit')}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDependent(dep.id, dep.full_name)}
                        className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                        title={t('table.actionDelete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Local Dependent Dialog (Supports Add and Edit Mode) */}
      {isDependentDialogOpen && employee && (
        <DependentDialog
          employeeId={employee.id}
          employeeName={`${employee.last_name} ${employee.first_name}`}
          dependent={activeDependent}
          onClose={() => {
            setIsDependentDialogOpen(false);
            setActiveDependent(null);
          }}
        />
      )}

      {/* Custom Dependent Deletion Modal overlay (replaces blocking confirm dialogue) */}
      {depToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-red-50 text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 animate-bounce" />
              <h3 className="text-sm font-bold">{t('employee.drawer.deleteModalTitle')}</h3>
            </div>
            
            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-normal">
                {t('employee.drawer.deleteModalConfirm')} <strong className="text-slate-800 font-bold font-sans">"{depToDelete.name}"</strong>?
              </p>
              
              {deleteDepError && (
                <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg text-[10px] font-semibold text-red-600 leading-relaxed">
                  {deleteDepError}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDepToDelete(null)}
                disabled={isDeletingDep}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteDependent(depToDelete.id)}
                disabled={isDeletingDep}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white bg-red-600 hover:bg-red-700 font-semibold text-xs transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isDeletingDep ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('employee.drawer.deleteModalRemovingBtn')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('employee.drawer.deleteModalConfirmBtn')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
