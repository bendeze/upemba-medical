import React, { useEffect, useState } from 'react';
import { pharmacyApi } from '../api/pharmacy-api';
import { Medicine } from '../types';
import { Edit2, Pill, Plus, Save, X, Trash2, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { exportToCSV } from '../utils/export';

export function MedicinesDirectory() {
  const { t } = useTranslation();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState(t('pharmacy.unitPlaceholder') || 'Unité');
  
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editMinStock, setEditMinStock] = useState<number | ''>('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
        unit: newUnit
      });
      setIsAdding(false);
      setNewName('');
      setNewUnit(t('pharmacy.unitPlaceholder') || 'Unité');
      fetchMedicines();
    } catch (err) {
      console.error(err);
      alert(t('pharmacy.errAddMed'));
    }
  };

  const openEditMedicine = (med: Medicine) => {
    setEditingMedicine(med);
    setEditName(med.name);
    setEditUnit(med.unit || '');
    setEditMinStock(med.min_stock_level || 0);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicine) return;
    try {
      await pharmacyApi.updateMedicine(editingMedicine.id, { 
        name: editName,
        unit: editUnit,
        min_stock_level: editMinStock === '' ? 0 : editMinStock 
      });
      setIsEditDialogOpen(false);
      setEditingMedicine(null);
      fetchMedicines();
    } catch (err) {
      console.error(err);
      alert(t('pharmacy.errUpdateMed'));
    }
  };

  const handleDeleteMedicine = async (id: string) => {
    if (!window.confirm(t('pharmacy.confirmDeleteMed'))) return;
    try {
      await pharmacyApi.deleteMedicine(id);
      fetchMedicines();
    } catch (err) {
      console.error(err);
      alert(t('pharmacy.errDeleteMed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Pill className="h-5 w-5 text-teal-600" />
          {t('pharmacy.medicinesDirectory')}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const headers = [t('pharmacy.medicineName'), t('pharmacy.thUnit'), t('pharmacy.thMinStock')];
              const data = medicines.map(m => [m.name, m.unit, String(m.min_stock_level || '')]);
              exportToCSV('medicines_directory', headers, data);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-teal-600" />
            {t('table.exportBtn')}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            {t('pharmacy.registerNewMedicine')}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('pharmacy.medicineName')} *</label>
              <input type="text" required placeholder={t('pharmacy.medicineNamePlaceholder')} value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
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
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('pharmacy.thUnit')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('pharmacy.thMinStock')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('common.actions') || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {medicines.map(med => (
              <tr key={med.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{med.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{med.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-900">
                    {med.min_stock_level !== null ? med.min_stock_level : <span className="text-slate-400 italic">{t('pharmacy.globalDefault')}</span>}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => openEditMedicine(med)}
                    className="p-1 text-slate-400 hover:text-blue-600 transition mx-1"
                    title={t('common.edit')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteMedicine(med.id)}
                    className="p-1 text-slate-400 hover:text-red-600 transition mx-1"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
      {/* Edit Medicine Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Pill className="h-5 w-5 text-teal-600" />
                {t('pharmacy.editMedicine')}
              </h2>
              <button onClick={() => setIsEditDialogOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('pharmacy.medicineName')} *</label>
                <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('pharmacy.unitLabel')}</label>
                <input type="text" value={editUnit} onChange={e => setEditUnit(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('pharmacy.thMinStock')}</label>
                <input type="number" min="0" value={editMinStock} onChange={e => setEditMinStock(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditDialogOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">{t('common.cancel')}</button>
                <button type="submit" className="px-5 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm shadow-sm">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
