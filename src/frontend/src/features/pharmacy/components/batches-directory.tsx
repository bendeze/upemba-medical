import React, { useEffect, useState } from 'react';
import { pharmacyApi } from '../api/pharmacy-api';
import { locationsApi } from '../../locations/api/locations-api';
import { MedicineBatch, MedicalCenter } from '../types';
import { Filter, Search, CalendarDays, AlertTriangle, Edit2, Trash2, Save, X, Package, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { exportToCSV } from '../utils/export';

export function BatchesDirectory() {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [medicalCenters, setMedicalCenters] = useState<MedicalCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedicalCenter, setSelectedMedicalCenter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [editingBatch, setEditingBatch] = useState<MedicineBatch | null>(null);
  const [editLotNumber, setEditLotNumber] = useState('');
  const [editExpirationDate, setEditExpirationDate] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMedicalCenter]);

  async function fetchData() {
    try {
      setLoading(true);
      if (medicalCenters.length === 0) {
        const centersData = await pharmacyApi.getMedicalCenters();
        setMedicalCenters(centersData);
      }

      const batchData = await pharmacyApi.getBatches(selectedMedicalCenter || undefined);
      setBatches(batchData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = batches.filter(batch => 
    batch.medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (batch.lot_number && batch.lot_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openEditBatch = (batch: MedicineBatch) => {
    setEditingBatch(batch);
    setEditLotNumber(batch.lot_number || '');
    setEditExpirationDate(batch.expiration_date || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    try {
      await pharmacyApi.updateMedicineBatch(editingBatch.id, { 
        lot_number: editLotNumber,
        expiration_date: editExpirationDate || undefined
      });
      setIsEditDialogOpen(false);
      setEditingBatch(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(t('pharmacy.errUpdateBatch'));
    }
  };

  const handleDeleteBatch = async (id: string) => {
    if (!window.confirm(t('pharmacy.confirmDeleteBatch'))) return;
    try {
      await pharmacyApi.deleteMedicineBatch(id);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(t('pharmacy.errDeleteBatch'));
    }
  };

  const today = new Date();

  const alertExpiringBatches = batches.filter(b => {
    if (!b.expiration_date) return false;
    const expDate = new Date(b.expiration_date);
    if (b.quantity <= 0) return false;
    const expiringThreshold = new Date();
    expiringThreshold.setMonth(today.getMonth() + 6);
    return expDate <= expiringThreshold;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-teal-600" />
          <h2 className="text-xl font-bold text-slate-800">{t('pharmacy.tabBatches')}</h2>
        </div>
        <button
          onClick={() => {
            const headers = [t('pharmacy.medicineName'), t('pharmacy.batchNumber'), t('pharmacy.center'), t('pharmacy.thExpirationDate'), t('pharmacy.thQty')];
            const data = batches.map(b => [
              `${b.medicine.name} (${b.medicine.unit})`,
              b.lot_number || '',
              b.medical_center.name || '',
              b.expiration_date ? new Date(b.expiration_date).toLocaleDateString() : '',
              String(b.quantity)
            ]);
            exportToCSV('medicine_batches', headers, data);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition shadow-sm"
        >
          <FileSpreadsheet className="h-4 w-4 text-teal-600" />
          {t('table.exportBtn')}
        </button>
      </div>

      {/* Alerts Section */}
      {alertExpiringBatches.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-amber-800">{t('pharmacy.actionRequired')}</h3>
              <p className="mt-2 text-sm text-amber-700">
                {t('pharmacy.alertExpiring').replace('{expiring}', String(alertExpiringBatches.length))} {t('pharmacy.alertCheckTable')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            placeholder={t('pharmacy.searchBatches')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            className="border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm p-2 w-full md:w-auto"
            value={selectedMedicalCenter}
            onChange={(e) => setSelectedMedicalCenter(e.target.value)}
          >
            <option value="">{t('pharmacy.allCenters')}</option>
            {medicalCenters.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">{t('pharmacy.loadingBatches')}</div>
        ) : filteredBatches.length === 0 ? (
          <div className="p-8 text-center text-slate-500">{t('pharmacy.noBatchesCriteria')}</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thMedicine')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thLotNumber')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.center')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thExpirationDate')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thQty')}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredBatches.map((batch) => {
                const expDate = batch.expiration_date ? new Date(batch.expiration_date) : null;
                let expClass = 'text-slate-900';
                
                if (expDate) {
                  const expiringThreshold = new Date();
                  expiringThreshold.setMonth(today.getMonth() + 6);
                  if (expDate < today) {
                    expClass = 'text-red-600 font-semibold';
                  } else if (expDate <= expiringThreshold) {
                    expClass = 'text-amber-600 font-semibold';
                  }
                }

                return (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {batch.medicine.name} {batch.medicine.unit && `(${batch.medicine.unit})`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                      {batch.lot_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {batch.medical_center?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={expClass}>
                        {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : t('common.na')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                      {batch.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => openEditBatch(batch)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition mx-1"
                        title={t('common.edit')}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteBatch(batch.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition mx-1"
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {/* Edit Batch Dialog */}
      {isEditDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-teal-600" />
                {t('pharmacy.editBatch')}
              </h2>
              <button onClick={() => setIsEditDialogOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('pharmacy.lotNumber')}</label>
                <input type="text" value={editLotNumber} onChange={e => setEditLotNumber(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('pharmacy.expirationDate')}</label>
                <input type="date" value={editExpirationDate} onChange={e => setEditExpirationDate(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
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
