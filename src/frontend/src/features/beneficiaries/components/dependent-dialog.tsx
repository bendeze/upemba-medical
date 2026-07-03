'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dependentFormSchema, DependentFormValues } from '../validation';
import { useAddDependent, useUpdateDependent } from '../hooks/use-beneficiaries';
import { Dependent } from '../types';
import { X, Loader2, Save } from 'lucide-react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';

interface DependentDialogProps {
  employeeId: string;
  employeeName: string;
  dependent?: Dependent | null; // If passed, we are in Edit Mode
  onClose: () => void;
}

export const DependentDialog: React.FC<DependentDialogProps> = ({ 
  employeeId, 
  employeeName, 
  dependent, 
  onClose 
}) => {
  const isEditMode = !!dependent;
  const addDependentMutation = useAddDependent(employeeId);
  const updateDependentMutation = useUpdateDependent(employeeId);
  const { t } = useTranslation();

  // React Hook Form
  const { 
    register, 
    handleSubmit, 
    watch,
    setValue,
    formState: { errors, isSubmitting } 
  } = useForm<DependentFormValues>({
    resolver: zodResolver(dependentFormSchema),
    defaultValues: {
      full_name: '',
      gender: 'F',
      relationship: 'CHILD',
      birth_date: ''
    }
  });

  // Load values if edit mode
  useEffect(() => {
    if (dependent) {
      setValue('full_name', dependent.full_name);
      setValue('gender', dependent.gender);
      setValue('relationship', dependent.relationship);
      setValue('birth_date', dependent.birth_date || '');
    }
  }, [dependent, setValue]);

  const selectedRelationship = watch('relationship');

  const onSubmit = async (values: DependentFormValues) => {
    try {
      if (isEditMode && dependent) {
        await updateDependentMutation.mutateAsync({
          id: dependent.id,
          data: {
            full_name: values.full_name,
            gender: values.gender,
            relationship: values.relationship,
            birth_date: values.birth_date || undefined,
            employee: dependent.employee,
          }
        });
      } else {
        await addDependentMutation.mutateAsync({
          full_name: values.full_name,
          gender: values.gender,
          relationship: values.relationship,
          birth_date: values.birth_date || undefined
        });
      }
      onClose();
    } catch (err: any) {
      alert(err.message || (isEditMode ? t('dependentDialog.errorUpdating') : t('dependentDialog.errorAdding')));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {isEditMode ? t('dependentDialog.editTitle') : t('dependentDialog.addTitle')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditMode ? t('dependentDialog.editSubtitle') : t('dependentDialog.addSubtitle')} {employeeName}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t('dependentDialog.fullName')}
            </label>
            <input
              type="text"
              placeholder={t('dependentDialog.fullNamePlaceholder')}
              {...register('full_name')}
              className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                errors.full_name ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.full_name && (
              <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>
            )}
          </div>

          {/* Row of relationship and gender */}
          <div className="grid grid-cols-2 gap-4">
            {/* Relationship */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {t('dependentDialog.relationship')}
              </label>
              <select
                {...register('relationship')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none cursor-pointer"
              >
                <option value="CHILD">{t('dependents.child')}</option>
                <option value="SPOUSE">{t('dependents.spouse')}</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {t('dependentDialog.gender')}
              </label>
              <select
                {...register('gender')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none cursor-pointer"
              >
                <option value="F">{t('dependents.genderFemale')}</option>
                <option value="M">{t('dependents.genderMale')}</option>
              </select>
            </div>
          </div>

          {/* Birth Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t('dependentDialog.birthDate')}
            </label>
            <input
              type="date"
              {...register('birth_date')}
              className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                errors.birth_date ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.birth_date && (
              <p className="text-xs text-red-500 mt-1">{errors.birth_date.message}</p>
            )}
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-semibold text-sm transition cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditMode ? t('dependentDialog.saving') : t('dependentDialog.adding')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditMode ? t('common.save') : t('dependentDialog.addBtn')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
