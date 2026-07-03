import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { Activity, Plus, Search, Calendar, User, FileText, Edit2, Eye, Download } from 'lucide-react';
import { consultationsApi } from '../api/consultations-api';
import { Consultation } from '../types';
import { ConsultationForm } from './consultation-form';
import { exportToCSV } from '@/features/pharmacy/utils/export';
import { ConsultationDetailsModal } from './consultation-details';

export function ConsultationsDashboard() {
  const { t } = useTranslation();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const data = await consultationsApi.getConsultations(search);
      setConsultations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [search]);

  // Filter local consultations by date range (assuming backend search handles text, local handles date if needed, or we just filter here)
  const filteredConsultations = consultations.filter(c => {
    if (startDate && new Date(c.date) < new Date(startDate)) return false;
    if (endDate && new Date(c.date) > new Date(endDate)) return false;
    return true;
  });

  const handleExport = () => {
    if (filteredConsultations.length === 0) return;
    
    const headers = ['Date', 'Patient Type', 'Patient Name', 'Doctor', 'Symptoms', 'Diagnosis', 'Prescriptions Count'];
    const data = filteredConsultations.map(c => {
      let patientName = c.external_patient_name || '';
      if (c.patient_type === 'EMPLOYEE' && c.employee_details) {
        patientName = `${c.employee_details.nom || c.employee_details.first_name} ${c.employee_details.prenom || c.employee_details.last_name}`;
      } else if (c.patient_type === 'DEPENDENT' && c.dependent_details) {
        patientName = c.dependent_details.nom_complet || c.dependent_details.full_name;
      }
      
      return [
        c.date,
        c.patient_type,
        patientName,
        c.doctor_name || '',
        c.symptoms || '',
        c.diagnosis || '',
        c.prescriptions && c.prescriptions.length > 0 ? String(c.prescriptions[0].items?.length || 0) : '0'
      ];
    });

    exportToCSV('consultations_export', headers, data);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('consultations.title')}</h2>
          <p className="text-sm text-slate-500">{t('consultations.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium shadow-sm transition"
          >
            <Download className="h-4 w-4" />
            {t('consultations.exportExcel')}
          </button>
          <button 
            onClick={() => {
              setSelectedConsultation(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            {t('consultations.new')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('consultations.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="h-4 w-4" />
              <span>{t('consultations.from')}</span>
            </div>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-slate-500 text-sm">{t('consultations.to')}</span>
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">{t('consultations.loading')}</div>
        ) : filteredConsultations.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">{t('consultations.noConsultationsFound')}</h3>
            <p className="text-slate-400">{t('consultations.noConsultationsDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 font-semibold">{t('consultations.tableDate')}</th>
                  <th className="px-6 py-3 font-semibold">{t('consultations.tablePatient')}</th>
                  <th className="px-6 py-3 font-semibold">{t('consultations.tableDoctor')}</th>
                  <th className="px-6 py-3 font-semibold">{t('consultations.tableDiagnosis')}</th>
                  <th className="px-6 py-3 font-semibold">{t('consultations.tablePrescriptions')}</th>
                  <th className="px-6 py-3 font-semibold">{t('consultations.tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConsultations.map(c => {
                  let patientName = c.external_patient_name || t('common.unknown');
                  if (c.patient_type === 'EMPLOYEE' && c.employee_details) {
                    patientName = `${c.employee_details.nom || c.employee_details.first_name} ${c.employee_details.prenom || c.employee_details.last_name}`;
                  } else if (c.patient_type === 'DEPENDENT' && c.dependent_details) {
                    patientName = c.dependent_details.nom_complet || c.dependent_details.full_name;
                  }

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {new Date(c.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-teal-500" />
                          <span className="font-medium text-slate-700">{patientName}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                            {t(`table.type${c.patient_type.charAt(0).toUpperCase()}${c.patient_type.slice(1).toLowerCase()}` as any)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {c.doctor_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700 truncate max-w-xs" title={c.diagnosis || ''}>
                          {c.diagnosis || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700">
                            {c.prescriptions && c.prescriptions.length > 0 ? c.prescriptions[0].items?.length || 0 : t('consultations.none')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              setSelectedConsultation(c);
                              setIsViewOpen(true);
                            }}
                            className="text-slate-400 hover:text-teal-600 transition"
                            title={t('consultations.viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedConsultation(c);
                              setIsFormOpen(true);
                            }}
                            className="text-slate-400 hover:text-teal-600 transition"
                            title={t('consultations.editTooltip')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <ConsultationForm 
          initialData={selectedConsultation}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedConsultation(null);
          }} 
          onSuccess={() => {
            setIsFormOpen(false);
            setSelectedConsultation(null);
            fetchConsultations();
          }}
        />
      )}

      {isViewOpen && selectedConsultation && (
        <ConsultationDetailsModal
          consultation={selectedConsultation}
          onClose={() => {
            setIsViewOpen(false);
            setSelectedConsultation(null);
          }}
        />
      )}
    </div>
  );
}
