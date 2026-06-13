import React, { useEffect, useState } from 'react';
import { pharmacyApi } from '../api/pharmacy-api';
import { MedicineBatch } from '../types';
import { Filter, Search, CalendarDays } from 'lucide-react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';

export function BatchesDirectory() {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedSite]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (sites.length === 0) {
        const centersData = await pharmacyApi.getMedicalCenters();
        setSites(centersData);
      }

      const batchData = await pharmacyApi.getBatches(selectedSite || undefined);
      setBatches(batchData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = batches.filter(batch => 
    batch.medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (batch.medicine.reference_number && batch.medicine.reference_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="h-6 w-6 text-teal-600" />
        <h2 className="text-xl font-bold text-slate-800">{t('pharmacy.tabBatches')}</h2>
      </div>

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
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
          >
            <option value="">{t('pharmacy.allCenters')}</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.center')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thExpirationDate')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thQty')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredBatches.map((batch) => {
                const expDate = batch.expiration_date ? new Date(batch.expiration_date) : null;
                let expClass = 'text-slate-900';
                
                if (expDate) {
                  const nextMonth = new Date();
                  nextMonth.setMonth(today.getMonth() + 1);
                  if (expDate < today) {
                    expClass = 'text-red-600 font-semibold';
                  } else if (expDate <= nextMonth) {
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {batch.medical_center?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={expClass}>
                        {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                      {batch.quantity}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
