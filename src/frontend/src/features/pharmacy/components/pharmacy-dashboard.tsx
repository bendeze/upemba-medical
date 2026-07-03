import React, { useState } from 'react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { Pill, AlertTriangle, List, PlusCircle, LayoutDashboard, ArrowDownRight, History, Package, Layers, BookOpen, PackagePlus, PackageMinus } from 'lucide-react';
import { StockView } from './stock-view';
import { RequisitionForm } from './requisition-form';
import { PharmacyOverview } from './pharmacy-overview';
import { MedicinesDirectory } from './medicines-directory';
import { BatchesDirectory } from './batches-directory';
import { ConsumptionForm } from './consumption-form';
import { HistoricalConsumptionForm } from './historical-consumption-form';

export function PharmacyDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'medicines' | 'batches' | 'requisition' | 'consumption' | 'historical'>('overview');

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-lg text-teal-700">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t('pharmacy.title')}</h1>
            <p className="text-sm text-slate-500">{t('pharmacy.subtitle')}</p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white px-4 md:px-6 border-b border-slate-200 flex gap-6 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          } flex items-center gap-2`}
        >
          <LayoutDashboard className="h-4 w-4" />
          {t('pharmacy.tabOverview')}
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'stock'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          } flex items-center gap-2`}
        >
          <Package className="h-4 w-4" />
          {t('pharmacy.tabStock')}
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'batches'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          } flex items-center gap-2`}
        >
          <Layers className="h-4 w-4" />
          {t('pharmacy.tabBatches')}
        </button>
        <button
          onClick={() => setActiveTab('medicines')}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'medicines'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          } flex items-center gap-2`}
        >
          <BookOpen className="h-4 w-4" />
          {t('pharmacy.tabMedicines')}
        </button>

        <button
          onClick={() => setActiveTab('requisition')}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'requisition'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          } flex items-center gap-2`}
        >
          <PackagePlus className="h-4 w-4" />
          {t('pharmacy.tabIn')}
        </button>
        <button
          onClick={() => setActiveTab('consumption')}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'consumption'
              ? 'border-red-600 text-red-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          } flex items-center gap-2`}
        >
          <PackageMinus className="h-4 w-4" />
          {t('pharmacy.tabOut')}
        </button>
        <button
          onClick={() => setActiveTab('historical')}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'historical'
              ? 'border-slate-600 text-slate-700'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          } flex items-center gap-2`}
        >
          <History className="h-4 w-4" />
          {t('pharmacy.tabHistorical')}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeTab === 'overview' && <PharmacyOverview />}
        {activeTab === 'stock' && <StockView />}
        {activeTab === 'batches' && <BatchesDirectory />}
        {activeTab === 'medicines' && <MedicinesDirectory />}

        {activeTab === 'requisition' && <RequisitionForm />}
        {activeTab === 'consumption' && <ConsumptionForm />}
        {activeTab === 'historical' && <HistoricalConsumptionForm />}
      </div>
    </div>
  );
}
