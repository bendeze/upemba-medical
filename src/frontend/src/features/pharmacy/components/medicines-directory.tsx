import React, { useEffect, useState } from 'react';
import { pharmacyApi } from '../api/pharmacy-api';
import { Medicine } from '../types';
import { Edit2, Pill, Plus, Save, X } from 'lucide-react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';

export function MedicinesDirectory() {
  const { t } = useTranslation();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRef, setNewRef] = useState('');
  const [newUnit, setNewUnit] = useState('Unité');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMinStock, setEditMinStock] = useState<number>(0);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const data = await pharmacyApi.getMedicines();
      setMedicines(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    try {
      await pharmacyApi.createMedicine({
        name: newName,
        reference_number: newRef || undefined,
        unit: newUnit
      });
      setIsAdding(false);
      setNewName('');
      setNewRef('');
      setNewUnit('Unité');
      fetchMedicines();
    } catch (err) {
      console.error(err);
      alert('Failed to add medicine');
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await pharmacyApi.updateMedicine(id, { min_stock_level: editMinStock });
      setEditingId(null);
      fetchMedicines();
    } catch (err) {
      console.error(err);
      alert('Failed to update minimum stock level');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Pill className="h-5 w-5 text-teal-600" />
          {t('pharmacy.medicinesDirectory')}
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm transition"
        >
          <Plus className="h-4 w-4" />
          {t('pharmacy.registerNewMedicine')}
        </button>
      </div>

      {isAdding && (
        <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('pharmacy.medicineName')} *</label>
              <input type="text" required placeholder={t('pharmacy.medicineNamePlaceholder')} value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('pharmacy.referenceNumber')}</label>
              <input type="text" value={newRef} onChange={e => setNewRef(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('pharmacy.unitLabel')}</label>
              <input type="text" required placeholder={t('pharmacy.unitPlaceholder')} value={newUnit} onChange={e => setNewUnit(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-teal-600 text-white py-2 rounded-md hover:bg-teal-700 text-sm font-medium">{t('pharmacy.saveMedicine')}</button>
              <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-md hover:bg-slate-50 text-sm font-medium">{t('common.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('pharmacy.medicineName')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('pharmacy.thRefNumber')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('pharmacy.thUnit')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('pharmacy.thMinStock')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {medicines.map(med => (
              <tr key={med.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{med.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{med.reference_number || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{med.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === med.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        value={editMinStock} 
                        onChange={(e) => setEditMinStock(parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-teal-500"
                      />
                      <button onClick={() => handleSaveEdit(med.id)} className="p-1 text-teal-600 hover:bg-teal-50 rounded"><Save className="h-4 w-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {med.min_stock_level !== null ? med.min_stock_level : <span className="text-slate-400 italic">{t('pharmacy.globalDefault')}</span>}
                      </span>
                      <button 
                        onClick={() => {
                          setEditingId(med.id);
                          setEditMinStock(med.min_stock_level || 0);
                        }}
                        className="p-1 text-slate-400 hover:text-teal-600 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {medicines.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">{t('pharmacy.noMedicinesFound')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
