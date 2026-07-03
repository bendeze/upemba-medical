import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { consultationsApi } from '../api/consultations-api';
import { pharmacyApi } from '@/features/pharmacy/api/pharmacy-api';
import { api as beneficiariesApi } from '@/features/beneficiaries/services/api';
import { X, Search, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { Employee, Dependent } from '@/features/beneficiaries/types';
import { Consultation } from '../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Consultation | null;
}

export function ConsultationForm({ onClose, onSuccess, initialData }: Props) {
  const { t } = useTranslation();
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Context Data
  const [medicalCenters, setMedicalCenters] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  
  // Patient Selection
  const [patientType, setPatientType] = useState<'EXTERNAL' | 'EMPLOYEE' | 'DEPENDENT'>('EXTERNAL');
  const [externalName, setExternalName] = useState('');
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDependent, setSelectedDependent] = useState<Dependent | null>(null);

  // Form Fields
  const [medicalCenterId, setMedicalCenterId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');

  // Prescription Items
  const [prescriptionItems, setPrescriptionItems] = useState<{ medicine_id: string, quantity_prescribed: number, dosage_instructions: string }[]>([]);

  useEffect(() => {
    pharmacyApi.getMedicalCenters().then(data => {
      setMedicalCenters(data);
      if (data.length > 0 && !initialData) setMedicalCenterId(data[0].id);
    });
    pharmacyApi.getMedicines().then(data => setMedicines(data));
  }, []);

  useEffect(() => {
    if (initialData) {
      setMedicalCenterId(initialData.medical_center || '');
      setDoctorName(initialData.doctor_name || '');
      setSymptoms(initialData.symptoms || '');
      setDiagnosis(initialData.diagnosis || '');
      setNotes(initialData.notes || '');
      setPatientType(initialData.patient_type);
      
      if (initialData.patient_type === 'EXTERNAL') {
        setExternalName(initialData.external_patient_name || '');
      } else if (initialData.patient_type === 'EMPLOYEE' && initialData.employee_details) {
        // Pre-fill search with matricule or name so they see it
        setSearchTerm(initialData.employee_details.employee_number || initialData.employee_details.matricule || '');
        setSelectedEmployee(initialData.employee_details);
      } else if (initialData.patient_type === 'DEPENDENT' && initialData.dependent_details) {
        // Just mock a selected dependent enough to pass validation
        setSelectedDependent(initialData.dependent_details);
        // And if we have the parent employee
        if (initialData.employee_details) {
            setSelectedEmployee(initialData.employee_details);
        }
      }

      if (initialData.prescriptions && initialData.prescriptions.length > 0) {
        const p = initialData.prescriptions[0];
        if (p.items) {
          setPrescriptionItems(p.items.map((i: any) => ({
            medicine_id: i.medicine || i.medicine_id, // depends on serializer
            quantity_prescribed: i.quantity_prescribed,
            dosage_instructions: i.dosage_instructions || ''
          })));
        }
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (searchTerm.length >= 2 && patientType !== 'EXTERNAL') {
      const delay = setTimeout(() => {
        beneficiariesApi.getEmployees({ search: searchTerm }).then(res => {
          setSearchResults(res.results || res); // Handle paginated or list response
        });
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, patientType]);

  const handlePatientTypeChange = (type: any) => {
    setPatientType(type);
    setSelectedEmployee(null);
    setSelectedDependent(null);
    setSearchTerm('');
    setExternalName('');
  };

  const handleAddMedicine = () => {
    if (medicines.length === 0) return;
    setPrescriptionItems([...prescriptionItems, { medicine_id: medicines[0].id, quantity_prescribed: 1, dosage_instructions: '' }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (patientType === 'EXTERNAL' && !externalName.trim()) {
      setError(t('consultations.errExternalName'));
      return;
    }
    if (patientType === 'EMPLOYEE' && !selectedEmployee) {
      setError(t('consultations.errEmployee'));
      return;
    }
    if (patientType === 'DEPENDENT' && !selectedDependent) {
      setError(t('consultations.errDependent'));
      return;
    }
    if (!medicalCenterId) {
      setError(t('consultations.errMedicalCenter'));
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        medical_center: medicalCenterId,
        patient_type: patientType,
        external_patient_name: patientType === 'EXTERNAL' ? externalName : null,
        employee: patientType === 'EMPLOYEE' ? selectedEmployee?.id : (patientType === 'DEPENDENT' ? selectedDependent?.employee : null),
        dependent: patientType === 'DEPENDENT' ? selectedDependent?.id : null,
        doctor_name: doctorName,
        symptoms,
        diagnosis,
        notes,
        prescription: prescriptionItems.length > 0 ? {
          items: prescriptionItems
        } : undefined
      };

      if (initialData) {
        await consultationsApi.updateConsultation(initialData.id, data);
      } else {
        await consultationsApi.createConsultation(data);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || t('consultations.errCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-slate-800">{initialData ? t('consultations.editTitle') : t('consultations.newTitle')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Section: Visit Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">{t('consultations.visitDetails')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">{t('consultations.medicalCenter')}</label>
                <select 
                  value={medicalCenterId}
                  onChange={(e) => setMedicalCenterId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  required
                >
                  <option value="">{t('consultations.selectCenter')}</option>
                  {medicalCenters.map(mc => (
                    <option key={mc.id} value={mc.id}>{mc.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">{t('consultations.doctorNameLabel')}</label>
                <input 
                  type="text" 
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder={t('consultations.doctorNamePlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Section: Patient Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">{t('consultations.patientInfoSection')}</h3>
            <div className="flex gap-4 mb-4">
              {(['EXTERNAL', 'EMPLOYEE', 'DEPENDENT'] as const).map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="patientType" 
                    value={type}
                    checked={patientType === type}
                    onChange={() => handlePatientTypeChange(type)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{t(`table.type${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}` as any)}</span>
                </label>
              ))}
            </div>

            {patientType === 'EXTERNAL' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">{t('consultations.patientNameLabel')}</label>
                <input 
                  type="text" 
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  placeholder={t('consultations.patientNamePlaceholder')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder={t('consultations.searchEmployee')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                
                {searchResults.length > 0 && !selectedEmployee && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {searchResults.map(emp => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setSelectedEmployee(emp)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex justify-between"
                      >
                        <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                        <span className="text-slate-500">{emp.employee_number}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedEmployee && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-teal-800">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                      <p className="text-xs text-teal-600">{selectedEmployee.employee_number}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedEmployee(null); setSelectedDependent(null); }} className="text-teal-600 hover:text-teal-800 text-xs font-medium">{t('consultations.changeEmployee')}</button>
                  </div>
                )}

                {patientType === 'DEPENDENT' && selectedEmployee && (
                  <div className="space-y-1.5 mt-4">
                    <label className="text-xs font-semibold text-slate-600">{t('consultations.selectDependentLabel')}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedEmployee.dependents && selectedEmployee.dependents.length > 0 ? (
                        selectedEmployee.dependents.map(dep => (
                          <button
                            key={dep.id}
                            type="button"
                            onClick={() => setSelectedDependent(dep)}
                            className={`p-3 border rounded-lg text-left text-sm transition ${
                              selectedDependent?.id === dep.id ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            <div className="font-medium">{dep.full_name}</div>
                            <div className="text-xs opacity-70">{t(`dependents.${dep.relationship === 'SPOUSE' ? 'spouse' : 'child'}` as any)}</div>
                          </button>
                        ))
                      ) : (
                        <div className="text-sm text-slate-500 col-span-2">{t('consultations.noDependentsFound')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Clinical Notes */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">{t('consultations.clinicalDetailsSection')}</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">{t('consultations.symptoms')}</label>
              <textarea 
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none min-h-[80px]"
                placeholder={t('consultations.symptomsPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">{t('consultations.diagnosis')}</label>
              <textarea 
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none min-h-[80px]"
                placeholder={t('consultations.diagnosisPlaceholder')}
              />
            </div>
          </div>

          {/* Section: Prescription */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('consultations.prescriptionSection')}</h3>
              <button 
                type="button" 
                onClick={handleAddMedicine}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 bg-teal-50 px-2 py-1 rounded"
              >
                <Plus className="h-3 w-3" /> {t('consultations.addMedicine')}
              </button>
            </div>
            
            {prescriptionItems.length === 0 ? (
              <p className="text-sm text-slate-400 italic">{t('consultations.noMedicinesPrescribed')}</p>
            ) : (
              <div className="space-y-3">
                {prescriptionItems.map((item, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <select
                        value={item.medicine_id}
                        onChange={(e) => {
                          const newItems = [...prescriptionItems];
                          newItems[index].medicine_id = e.target.value;
                          setPrescriptionItems(newItems);
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                      >
                        {medicines.map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity_prescribed}
                        onChange={(e) => {
                          const newItems = [...prescriptionItems];
                          newItems[index].quantity_prescribed = parseInt(e.target.value) || 1;
                          setPrescriptionItems(newItems);
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        placeholder={t('consultations.qtyPlaceholder')}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.dosage_instructions}
                        onChange={(e) => {
                          const newItems = [...prescriptionItems];
                          newItems[index].dosage_instructions = e.target.value;
                          setPrescriptionItems(newItems);
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        placeholder={t('consultations.instructionsPlaceholder')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index))}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {submitting ? t('consultations.saveSaving') : t('consultations.saveBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
