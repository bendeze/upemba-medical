import React, { useEffect, useState } from 'react';
import { pharmacyApi } from '../api/pharmacy-api';
import { locationsApi } from '../../locations/api/locations-api';
import { PharmacyStock, MedicineBatch, MedicalCenter } from '../types';
import { AlertTriangle, Filter, Search, Package, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { exportToCSV } from '../utils/export';

export function StockView() {
  const { t } = useTranslation();
  const [stocks, setStocks] = useState<PharmacyStock[]>([]);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [medicalCenters, setMedicalCenters] = useState<MedicalCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedicalCenter, setSelectedMedicalCenter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expirationFilter, setExpirationFilter] = useState('30');

  useEffect(() => {
    fetchData();
  }, [selectedMedicalCenter]);

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch sites if not fetched yet
      if (medicalCenters.length === 0) {
        const centersData = await pharmacyApi.getMedicalCenters();
        setMedicalCenters(centersData);
      }

      const [stockData, batchData] = await Promise.all([
        pharmacyApi.getStock(selectedMedicalCenter || undefined),
        pharmacyApi.getBatches(selectedMedicalCenter || undefined)
      ]);
      setStocks(stockData);
      setBatches(batchData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();

  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.medicine.name.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;

    if (expirationFilter === 'all') return true;

    const stockBatches = batches.filter(b => b.medicine.id === stock.medicine.id && b.medical_center?.id === stock.medical_center?.id && b.quantity > 0);
    
    return stockBatches.some(b => {
      if (!b.expiration_date) return false;
      const expDate = new Date(b.expiration_date);
      if (expirationFilter === 'expired') {
        return expDate < today;
      }
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + parseInt(expirationFilter, 10));
      return expDate <= targetDate;
    });
  });

  const lowStockItems = stocks.filter(s => s.quantity <= s.min_stock_level);
  
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
          <Package className="h-6 w-6 text-teal-600" />
          <h2 className="text-xl font-bold text-slate-800">{t('pharmacy.tabStock')}</h2>
        </div>
        <button
          onClick={() => {
            const headers = [t('pharmacy.medicineName'), t('pharmacy.thSite'), t('pharmacy.thCurrentQuantity'), t('pharmacy.thStockStatus')];
            const data = stocks.map(s => [
              `${s.medicine.name} (${s.medicine.unit})`,
              s.medical_center.name,
              String(s.quantity),
              s.quantity <= s.min_stock_level ? t('pharmacy.statusLow') : t('pharmacy.statusHealthy')
            ]);
            exportToCSV('current_stock', headers, data);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm transition shadow-sm"
        >
          <FileSpreadsheet className="h-4 w-4 text-teal-600" />
          {t('table.exportBtn')}
        </button>
      </div>

      {/* Alerts Section */}
      {(lowStockItems.length > 0 || alertExpiringBatches.length > 0) && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-amber-800">{t('pharmacy.actionRequired')}</h3>
              <p className="mt-2 text-sm text-amber-700">
                {lowStockItems.length > 0 && alertExpiringBatches.length > 0 ? (
                  t('pharmacy.alertBoth').replace('{low}', String(lowStockItems.length)).replace('{expiring}', String(alertExpiringBatches.length))
                ) : lowStockItems.length > 0 ? (
                  t('pharmacy.alertLow').replace('{low}', String(lowStockItems.length))
                ) : (
                  t('pharmacy.alertExpiring').replace('{expiring}', String(alertExpiringBatches.length))
                )} {t('pharmacy.alertCheckTable')}
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
            placeholder={t('pharmacy.searchMedicines')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
            value={expirationFilter}
            onChange={(e) => setExpirationFilter(e.target.value)}
          >
            <option value="30">{t('pharmacy.expiring30Days')}</option>
            <option value="90">{t('pharmacy.expiring3Months')}</option>
            <option value="180">{t('pharmacy.expiring6Months')}</option>
            <option value="expired">{t('pharmacy.alreadyExpired')}</option>
            <option value="all">{t('pharmacy.allBatches')}</option>
          </select>

          <select
            className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md"
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

      {/* Stock Table */}
      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">{t('pharmacy.loadingStock')}</div>
        ) : filteredStocks.length === 0 ? (
          <div className="p-8 text-center text-slate-500">{t('pharmacy.noStockFound')}</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thMedicine')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thSite')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thCurrentQuantity')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thStatus')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thExpirationDate')}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thExpStatus')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredStocks.map((stock) => {
                const isLow = stock.quantity <= stock.min_stock_level;
                
                const stockBatches = batches.filter(b => b.medicine.id === stock.medicine.id && b.medical_center?.id === stock.medical_center?.id && b.quantity > 0);
                
                let expStatus = 'N/A';
                let expClass = 'bg-slate-100 text-slate-800';

                const hasExpired = stockBatches.some(b => b.expiration_date && new Date(b.expiration_date) < today);
                
                const expiringThreshold = new Date();
                expiringThreshold.setMonth(today.getMonth() + 6);
                
                const hasExpiringSoon = stockBatches.some(b => {
                  if (!b.expiration_date) return false;
                  const d = new Date(b.expiration_date);
                  return d >= today && d <= expiringThreshold;
                });

                if (hasExpired) {
                  expStatus = t('pharmacy.statusExpired');
                  expClass = 'bg-red-100 text-red-800';
                } else if (hasExpiringSoon) {
                  expStatus = t('pharmacy.statusExpiringSoon');
                  expClass = 'bg-amber-100 text-amber-800';
                } else if (stockBatches.length > 0) {
                  expStatus = t('pharmacy.statusHealthy');
                  expClass = 'bg-green-100 text-green-800';
                }

                let earliestExpDate = null;
                const expDates = stockBatches.map(b => b.expiration_date).filter(Boolean);
                if (expDates.length > 0) {
                  const sortedDates = expDates.sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());
                  earliestExpDate = sortedDates[0];
                }

                return (
                  <tr key={stock.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{stock.medicine.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {stock.medical_center?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{stock.quantity} {stock.medicine.unit}s</div>
                      <div className="text-xs text-slate-500">{t('pharmacy.minStock')}: {stock.min_stock_level}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isLow ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          {t('pharmacy.statusLowStock')}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {t('pharmacy.statusHealthy')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {earliestExpDate ? (
                        <span>
                          {new Date(earliestExpDate).toLocaleDateString()}
                          {expDates.length > 1 && <span className="ml-1 text-xs text-slate-400">({t('pharmacy.earliest')})</span>}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${expClass}`}>
                        {expStatus}
                      </span>
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
