import React, { useEffect, useState } from 'react';
import { pharmacyApi } from '../api/pharmacy-api';
import { PharmacyStock, MedicineBatch, StockMovement, MedicalCenter } from '../types';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Building2, Clock, MapPin, Package, X, Loader2, Save, ArchiveRestore } from 'lucide-react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';

export function PharmacyOverview() {
  const { t } = useTranslation();
  const [stocks, setStocks] = useState<PharmacyStock[]>([]);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [centers, setCenters] = useState<MedicalCenter[]>([]);
  const [loading, setLoading] = useState(true);

  // New Center Dialog State
  const [isCenterDialogOpen, setIsCenterDialogOpen] = useState(false);
  const [newCenterName, setNewCenterName] = useState('');
  const [isCreatingCenter, setIsCreatingCenter] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockData, batchData, movementData, centersData] = await Promise.all([
        pharmacyApi.getStock(),
        pharmacyApi.getBatches(),
        pharmacyApi.getMovements(),
        pharmacyApi.getMedicalCenters()
      ]);
      setStocks(stockData);
      setBatches(batchData);
      setMovements(movementData);
      setCenters(centersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCenterName.trim()) return;
    setIsCreatingCenter(true);
    try {
      const newCenter = await pharmacyApi.createMedicalCenter({ name: newCenterName.trim() });
      setCenters([...centers, newCenter]);
      setNewCenterName('');
      setIsCenterDialogOpen(false);
      // Optional: show a success message
    } catch (err: any) {
      alert(err.message || 'Failed to create medical center');
    } finally {
      setIsCreatingCenter(false);
    }
  };

  const lowStockCount = stocks.filter(s => s.quantity <= s.min_stock_level).length;
  
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(today.getMonth() + 1);
  const expiringCount = batches.filter(b => b.expiration_date && new Date(b.expiration_date) <= nextMonth && b.quantity > 0).length;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-teal-100 text-teal-600 p-3 rounded-lg">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('pharmacy.totalStockLines')}</p>
            <h3 className="text-2xl font-bold text-slate-900">{stocks.length}</h3>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-100 text-amber-600 p-3 rounded-lg">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('pharmacy.lowStockAlerts')}</p>
            <h3 className="text-2xl font-bold text-slate-900">{lowStockCount}</h3>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-red-100 text-red-600 p-3 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{t('pharmacy.expiringBatches')}</p>
            <h3 className="text-2xl font-bold text-slate-900">{expiringCount}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Transaction Logs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              {t('pharmacy.recentTransactions')}
            </h3>
            <span className="text-xs text-slate-500">{t('pharmacy.showingLast').replace('{count}', String(Math.min(movements.length, 10)))}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thDate')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thType')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thMedicine')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thQty')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('pharmacy.thSite')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {movements.slice(0, 10).map(mov => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {mov.movement_type === 'HISTORICAL_OUT'
                        ? new Date(mov.date).toLocaleDateString()
                        : new Date(mov.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {mov.movement_type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <ArrowUpRight className="h-3 w-3" /> {t('pharmacy.typeEntrance')}
                        </span>
                      ) : mov.movement_type === 'OUT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <ArrowDownRight className="h-3 w-3" /> {t('pharmacy.typeConsumption')}
                        </span>
                      ) : mov.movement_type === 'HISTORICAL_OUT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-800">
                          <ArchiveRestore className="h-3 w-3" /> {t('pharmacy.typeHistorical')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          <BarChart3 className="h-3 w-3" /> {t('pharmacy.typeAdjustment')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{mov.medicine.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                      {['OUT', 'HISTORICAL_OUT'].includes(mov.movement_type) ? '-' : '+'}{mov.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {mov.medical_center?.name}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      {t('pharmacy.noRecentTransactions')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              {t('pharmacy.centerManagement')}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {t('pharmacy.centerManagementDesc')}
            </p>
            <button
              onClick={() => setIsCenterDialogOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-teal-600 rounded-lg text-sm font-medium text-teal-600 hover:bg-teal-50 transition mb-6"
            >
              {t('pharmacy.recordNewCenter')}
            </button>

            <h4 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">{t('pharmacy.existingCenters')}</h4>
            {centers.length > 0 ? (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {centers.map(center => (
                  <li key={center.id} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    {center.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 text-center py-2 bg-slate-50 rounded border border-slate-100">{t('pharmacy.noCentersRecorded')}</p>
            )}
          </div>
        </div>
      </div>

      {/* New Center Dialog Modal */}
      {isCenterDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                {t('pharmacy.recordNewMedicalCenter')}
              </h2>
              <button onClick={() => setIsCenterDialogOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCenter} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {t('pharmacy.centerNameLabel')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('pharmacy.centerNamePlaceholder')}
                  value={newCenterName}
                  onChange={(e) => setNewCenterName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCenterDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCenter || !newCenterName.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm transition shadow-sm disabled:opacity-50"
                >
                  {isCreatingCenter ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t('regions.saving')}</>
                  ) : (
                    <><Save className="h-4 w-4" /> {t('pharmacy.saveCenter')}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
