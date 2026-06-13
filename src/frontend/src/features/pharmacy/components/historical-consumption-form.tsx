import React, { useState, useEffect } from 'react';
import { pharmacyApi } from '../api/pharmacy-api';
import { Upload, ArrowDownRight, Save } from 'lucide-react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';

export function HistoricalConsumptionForm() {
  const { t } = useTranslation();
  const [sites, setSites] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  
  // Manual Entry State
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [quantity, setQuantity] = useState('');
  const [consumptionDate, setConsumptionDate] = useState(new Date().toISOString().split('T')[0]);
  
  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSitesAndMedicines();
  }, []);

  const fetchSitesAndMedicines = async () => {
    try {
      setSites(await pharmacyApi.getMedicalCenters());
    } catch (e) {
      console.error(e);
    }
    try {
      setMedicines(await pharmacyApi.getMedicines());
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite || !selectedMedicine || !quantity) return;
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      await pharmacyApi.createMovement({
        medical_center_id: selectedSite,
        medicine_id: selectedMedicine,
        movement_type: 'HISTORICAL_OUT',
        quantity: parseInt(quantity, 10),
        date: consumptionDate,
        notes: t('pharmacy.manualConsumption')
      });
      setMessage({ type: 'success', text: t('pharmacy.historicalSuccess') });
      setQuantity('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('pharmacy.consError') });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSite || !file) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await pharmacyApi.importConsumption(selectedSite, file);
      setMessage({ type: 'success', text: t('pharmacy.importConsSuccess').replace('{count}', String(res.movements_created)) });
      setFile(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('pharmacy.importError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {message.text && (
        <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ArrowDownRight className="h-5 w-5 text-red-600" />
          {t('pharmacy.step1CenterHistorical')}
        </h2>
        <select
          className="block w-full max-w-md pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          required
        >
          <option value="">{t('pharmacy.chooseCenter')}</option>
          {sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manual Entry */}
        <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 ${!selectedSite && 'opacity-50 pointer-events-none'}`}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('pharmacy.step2Manual')}</h2>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('pharmacy.medicineName')}</label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                value={selectedMedicine}
                onChange={(e) => setSelectedMedicine(e.target.value)}
                required
              >
                <option value="">{t('pharmacy.selectMedicine')}</option>
                {medicines.map(med => (
                  <option key={med.id} value={med.id}>{med.name} ({med.unit})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700">{t('pharmacy.quantityDispatched')}</label>
              <input
                type="number"
                min="1"
                required
                className="mt-1 block w-full border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">{t('pharmacy.dateOfConsumption')}</label>
              <input
                type="date"
                required
                className="mt-1 block w-full border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                value={consumptionDate}
                onChange={(e) => setConsumptionDate(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !selectedSite}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-slate-400"
            >
              <Save className="h-4 w-4 mr-2" />
              {t('pharmacy.recordHistoricalExitBtn')}
            </button>
          </form>
        </div>

        {/* Excel Upload */}
        <div className={`bg-white p-6 rounded-lg shadow-sm border border-slate-200 ${!selectedSite && 'opacity-50 pointer-events-none'}`}>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5 text-red-600" />
            {t('pharmacy.step2Excel')}
          </h2>
          <p className="text-sm text-slate-500 mb-4" dangerouslySetInnerHTML={{ __html: t('pharmacy.excelConsDesc') }} />
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition cursor-pointer">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex justify-center text-sm text-slate-600">
                  <label htmlFor="file-upload-cons" className="relative cursor-pointer bg-transparent rounded-md font-medium text-red-600 hover:text-red-500">
                    <span>{t('pharmacy.uploadFile')}</span>
                    <input id="file-upload-cons" name="file-upload" type="file" accept=".xlsx, .xls" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  <p className="pl-1">{t('pharmacy.orDragDrop')}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {file ? file.name : t('pharmacy.excelFormats')}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedSite || !file}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:bg-slate-400"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('pharmacy.uploadAndImportBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
