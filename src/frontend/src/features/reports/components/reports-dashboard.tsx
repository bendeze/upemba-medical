import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { Activity, Users, FileText, AlertTriangle, Download, ArrowUpRight, ArrowDownRight, Package, Calendar } from 'lucide-react';
import { reportsApi } from '../api/reports-api';
import { exportToCSV } from '@/features/pharmacy/utils/export';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export function ReportsDashboard() {
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PHARMACY' | 'EXPORT'>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [overview, setOverview] = useState<any>({});
  const [pharmacy, setPharmacy] = useState<any>({ low_stock_alerts: [], top_dispensed: [], movements_summary: {} });
  const [consultations, setConsultations] = useState<any>({ patient_types: [], monthly_trends: [] });

  // Export states
  const [exportType, setExportType] = useState('STOCK_MOVEMENTS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pharmacy global filters
  const [pharmacyStartDate, setPharmacyStartDate] = useState('');
  const [pharmacyEndDate, setPharmacyEndDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [o, p, c] = await Promise.all([
          reportsApi.getOverview(),
          reportsApi.getPharmacyReports(pharmacyStartDate, pharmacyEndDate),
          reportsApi.getConsultationReports()
        ]);
        setOverview(o);
        setPharmacy(p);
        setConsultations(c);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pharmacyStartDate, pharmacyEndDate]);

  const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const API_BASE = 'http://localhost:8001/api/v1/reports';

  const [exportData, setExportData] = useState<any[]>([]);

  const [isPrinting, setIsPrinting] = useState(false);

  const handleGenerateExport = async () => {
    try {
      const data = await reportsApi.getExportData(exportType, startDate, endDate);
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        const rows = data.map((row: any) => Object.values(row).map(String));
        exportToCSV(`${exportType.toLowerCase()}_report_${startDate}_to_${endDate}`, headers, rows);
      } else {
        alert(t('reports.noDataExport') || 'No data found for this date range.');
      }
    } catch (err) {
      alert(t('reports.exportFailed') || 'Failed to generate export');
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setIsPrinting(true);
      await reportsApi.downloadExportPDF(exportType, startDate, endDate);
      setIsPrinting(false);
    } catch (err) {
      alert(t('reports.downloadPdfFailed') || 'Failed to download PDF');
      setIsPrinting(false);
    }
  };

  const handlePrintDashboard = async () => {
    try {
      setIsPrinting(true);
      const targetExport = activeTab === 'PHARMACY' ? 'PHARMACY_DASHBOARD' : 'DASHBOARD';
      await reportsApi.downloadExportPDF(targetExport);
      setIsPrinting(false);
    } catch (err) {
      alert(t('reports.downloadDashboardFailed'));
      setIsPrinting(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500 animate-pulse">{t('reports.loading')}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 print:bg-white print:m-0 print:p-0">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('reports.title')}</h2>
          <p className="text-sm text-slate-500">{t('reports.subtitle')}</p>
        </div>
        {activeTab !== 'EXPORT' && (
          <button 
            onClick={handlePrintDashboard}
            disabled={isPrinting}
            className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium shadow-sm transition disabled:opacity-50"
          >
            {isPrinting ? (
              <span className="animate-spin inline-block border-2 border-slate-500 border-t-transparent rounded-full w-4 h-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isPrinting ? t('reports.generating') : t('reports.exportDashboardBtn')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 print:hidden">
        {(['OVERVIEW', 'PHARMACY', 'EXPORT'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold transition ${
              activeTab === tab 
                ? 'border-b-2 border-teal-600 text-teal-700' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'OVERVIEW' ? t('reports.tabOverview') : tab === 'PHARMACY' ? t('reports.tabPharmacy') : t('reports.tabExport')}
          </button>
        ))}
      </div>

      <div className="print:block">
        
        {/* Print Header for Dashboard */}
        {activeTab !== 'EXPORT' && (
          <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-8">
            <h1 className="text-3xl font-bold text-slate-900">{t('reports.managerialReport')}</h1>
            <p className="text-slate-500">{t('reports.generatedOn')} {new Date().toLocaleDateString()}</p>
          </div>
        )}

        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">{t('reports.totalEmployees')}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{overview.total_employees}</p>
                  </div>
                  <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">{t('reports.totalDependents')}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{overview.total_dependents}</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">{t('reports.consultations30d')}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{overview.total_consultations_30d}</p>
                  </div>
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">{t('reports.activeCenters')}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{overview.active_centers}</p>
                  </div>
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:border-none print:shadow-none print:p-0">
                <h3 className="text-lg font-bold text-slate-800 mb-6">{t('reports.consultationTrends')}</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={consultations.monthly_trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:border-none print:shadow-none print:p-0">
                <h3 className="text-lg font-bold text-slate-800 mb-6">{t('reports.consultationsByPatient')}</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={consultations.patient_types}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="patient_type"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {consultations.patient_types.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PHARMACY' && (
          <div className="space-y-6">
            
            {/* Pharmacy Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-4 print:hidden">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Calendar className="h-4 w-4 text-slate-500" />
                {t('reports.dateRange')}:
              </div>
              <input 
                type="date"
                value={pharmacyStartDate}
                onChange={e => setPharmacyStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-slate-400">{t('reports.to')}</span>
              <input 
                type="date"
                value={pharmacyEndDate}
                onChange={e => setPharmacyEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button 
                onClick={() => { setPharmacyStartDate(''); setPharmacyEndDate(''); }}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                {t('reports.clearFilters')}
              </button>
            </div>

            {/* Top Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">{t('reports.activeStock')}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{pharmacy.current_stock_total || 0}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <Package className="h-6 w-6" />
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">{t('reports.stockIn')}</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">+{pharmacy.movements_summary?.in || 0}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-green-600">
                  <ArrowDownRight className="h-6 w-6" />
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">{t('reports.stockOut')}</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">-{pharmacy.movements_summary?.out || 0}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-red-600">
                  <ArrowUpRight className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Flow Chart */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-6">{t('reports.stockFlow')}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pharmacy.daily_flow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Area type="monotone" name={t('reports.stockIn')} dataKey="in" stroke="#10b981" fillOpacity={1} fill="url(#colorIn)" />
                      <Area type="monotone" name={t('reports.stockOut')} dataKey="out" stroke="#ef4444" fillOpacity={1} fill="url(#colorOut)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Dispensed Bar Chart */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-6">{t('reports.topDispensed')}</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pharmacy.top_dispensed} layout="vertical" margin={{ left: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis dataKey="medicine__name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="total_quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ALERTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alerts */}
              <div className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h3 className="font-bold text-red-800">{t('reports.lowStockAlerts')}</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                    {pharmacy.low_stock_alerts?.length || 0} {t('reports.items')}
                  </span>
                </div>
                
                <div className="overflow-x-auto flex-1">
                  {pharmacy.low_stock_alerts?.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 h-full flex items-center justify-center">{t('reports.noLowStock')}</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white border-b border-slate-100 text-xs uppercase text-slate-500">
                          <th className="px-6 py-3 font-semibold">{t('reports.medicine')}</th>
                          <th className="px-6 py-3 font-semibold">{t('reports.current')}</th>
                          <th className="px-6 py-3 font-semibold">{t('reports.min')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {pharmacy.low_stock_alerts?.map((alert: any) => (
                          <tr key={alert.id} className="text-sm">
                            <td className="px-6 py-3 font-medium text-slate-800">
                              {alert.medicine_name}
                              <div className="text-xs text-slate-400 font-normal">{alert.center_name}</div>
                            </td>
                            <td className="px-6 py-3 font-bold text-red-600">{alert.current_quantity}</td>
                            <td className="px-6 py-3 text-slate-500">{alert.minimum_required}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Expiring Batches */}
              <div className="bg-white border border-orange-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="bg-orange-50 px-6 py-4 border-b border-orange-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <h3 className="font-bold text-orange-800">{t('reports.expiringSoon')}</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                    {pharmacy.expiring_batches?.length || 0} {t('reports.batches')}
                  </span>
                </div>
                
                <div className="overflow-x-auto flex-1">
                  {pharmacy.expiring_batches?.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 h-full flex items-center justify-center">{t('reports.noExpiring')}</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white border-b border-slate-100 text-xs uppercase text-slate-500">
                          <th className="px-6 py-3 font-semibold">{t('reports.medicineLot')}</th>
                          <th className="px-6 py-3 font-semibold">{t('reports.expires')}</th>
                          <th className="px-6 py-3 font-semibold">{t('reports.qty')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {pharmacy.expiring_batches?.map((alert: any) => (
                          <tr key={alert.id} className="text-sm">
                            <td className="px-6 py-3 font-medium text-slate-800">
                              {alert.medicine_name}
                              <div className="text-xs text-slate-400 font-normal">{t('reports.lot')}: {alert.lot_number}</div>
                            </td>
                            <td className="px-6 py-3 font-bold text-orange-600">{alert.expiration_date}</td>
                            <td className="px-6 py-3 text-slate-500">{alert.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'EXPORT' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{t('reports.tabExport')}</h3>
            <p className="text-sm text-slate-500 mb-6">{t('reports.exportDesc')}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.reportType')}</label>
                <select 
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="STOCK_MOVEMENTS">{t('reports.typeStockMovements')}</option>
                  <option value="CONSUMPTION">{t('reports.typeConsumption')}</option>
                  <option value="CONSULTATIONS">{t('reports.typeConsultations')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.startDate')}</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('reports.endDate')}</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <div className="flex gap-4">
                <button 
                  onClick={handleGenerateExport}
                  disabled={isPrinting || !startDate || !endDate}
                  className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium shadow-sm transition disabled:opacity-50"
                >
                  <FileText className="h-5 w-5" />
                  {isPrinting ? t('reports.downloadingCsv') : t('reports.downloadCsvReport')}
                </button>
                <button 
                  onClick={handleGeneratePDF}
                  disabled={isPrinting || !startDate || !endDate}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition disabled:opacity-50"
                >
                  <FileText className="h-5 w-5" />
                  {isPrinting ? t('reports.downloadingPdf') : t('reports.downloadPdfReport')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
