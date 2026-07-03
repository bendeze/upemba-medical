'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeFormSchema, EmployeeFormValues } from '../validation';
import { 
  useRegions, 
  useSites, 
  useCreateEmployee, 
  useUpdateEmployee 
} from '../hooks/use-beneficiaries';
import { Employee } from '../types';
import { X, Loader2, Save } from 'lucide-react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';

interface EmployeeFormProps {
  employee?: Employee | null; // If passed, we are in Edit Mode
  onClose: () => void;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onClose }) => {
  const { t } = useTranslation();
  const isEditMode = !!employee;
  const { data: regions } = useRegions();
  
  // Track selected region to fetch corresponding sites dynamically
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const { data: sites, isLoading: isLoadingSites } = useSites(selectedRegionId || undefined);

  // Mutations
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  // React Hook Form
  const { 
    register, 
    handleSubmit, 
    setValue,
    watch,
    formState: { errors, isSubmitting } 
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employee_number: '',
      last_name: '',
      post_name: '',
      first_name: '',
      site: '',
      address: '',
      employment_status: 'ACTIVE',
    }
  });

  // Load values if edit mode
  useEffect(() => {
    if (employee) {
      setValue('employee_number', employee.employee_number);
      setValue('last_name', employee.last_name);
      setValue('post_name', employee.post_name || '');
      setValue('first_name', employee.first_name);
      setValue('address', employee.address || '');
      setValue('employment_status', employee.employment_status);
      
      // Load region and site
      if (employee.region_id) {
        setSelectedRegionId(employee.region_id);
      }
      if (employee.site) {
        setValue('site', employee.site);
      }
    }
  }, [employee, setValue]);

  // Handle region change in UI
  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const regionId = e.target.value;
    setSelectedRegionId(regionId);
    setValue('site', ''); // Clear selected site on region changes
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      if (isEditMode && employee) {
        await updateMutation.mutateAsync({
          id: employee.id,
          data: values
        });
      } else {
        await createMutation.mutateAsync(values);
      }
      onClose();
    } catch (err: any) {
      alert(err.message || t('employeeForm.errorSubmitting'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-base font-bold text-slate-800">
            {isEditMode ? t('employeeForm.editTitle') : t('employeeForm.addTitle')}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Employee Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t('employeeForm.empNumber')}
            </label>
            <input
              type="text"
              placeholder={t('employeeForm.empNumberPlaceholder')}
              {...register('employee_number')}
              className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                errors.employee_number ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.employee_number && (
              <p className="text-xs text-red-500 mt-1">{errors.employee_number.message}</p>
            )}
          </div>

          {/* Names Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {t('employeeForm.lastName')}
              </label>
              <input
                type="text"
                placeholder={t('employeeForm.lastNamePlaceholder')}
                {...register('last_name')}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition uppercase ${
                  errors.last_name ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'
                }`}
              />
              {errors.last_name && (
                <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>
              )}
            </div>

            {/* Post Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {t('employeeForm.postName')}
              </label>
              <input
                type="text"
                placeholder={t('employeeForm.postNamePlaceholder')}
                {...register('post_name')}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
              />
            </div>
          </div>

          {/* First Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t('employeeForm.firstName')}
            </label>
            <input
              type="text"
              placeholder={t('employeeForm.firstNamePlaceholder')}
              {...register('first_name')}
              className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                errors.first_name ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'
              }`}
            />
            {errors.first_name && (
              <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>
            )}
          </div>

          {/* Region & Site Rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Region select */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {t('employeeForm.region')}
              </label>
              <select
                value={selectedRegionId}
                onChange={handleRegionChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none cursor-pointer"
              >
                <option value="">{t('employeeForm.selectRegion')}</option>
                {regions?.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Site select */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {t('employeeForm.site')}
              </label>
              <select
                disabled={!selectedRegionId || isLoadingSites}
                {...register('site')}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none disabled:opacity-50 cursor-pointer ${
                  errors.site ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'
                }`}
              >
                <option value="">{t('employeeForm.selectSite')}</option>
                {sites?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.site && (
                <p className="text-xs text-red-500 mt-1">{errors.site.message}</p>
              )}
            </div>
          </div>

          {/* Employment Status */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t('employee.drawer.status')} *
            </label>
            <select
              {...register('employment_status')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none cursor-pointer"
            >
              <option value="ACTIVE">{t('table.statusActive')}</option>
              <option value="INACTIVE">{t('table.statusInactive')}</option>
              <option value="SUSPENDED">{t('table.statusSuspended')}</option>
              <option value="RETIRED">{t('table.statusRetired')}</option>
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              {t('employeeForm.address')}
            </label>
            <textarea
              placeholder={t('employeeForm.addressPlaceholder')}
              rows={2}
              {...register('address')}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
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
                {t('employeeForm.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('common.save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
