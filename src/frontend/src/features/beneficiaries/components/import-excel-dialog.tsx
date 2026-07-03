'use client';

import React, { useState, useRef } from 'react';
import { useImportExcel } from '../hooks/use-beneficiaries';
import { ImportReport, ImportLog } from '../types';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { api } from '../services/api';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  Database,
  BarChart3
} from 'lucide-react';

interface ImportExcelDialogProps {
  onClose: () => void;
}

export const ImportExcelDialog: React.FC<ImportExcelDialogProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const importExcelMutation = useImportExcel();
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');

  // Drag and drop states
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Cloud states
  const [cloudUrl, setCloudUrl] = useState<string>('');
  const [isCloudImporting, setIsCloudImporting] = useState<boolean>(false);

  // Report states
  const [report, setReport] = useState<ImportReport | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        setFile(droppedFile);
        setErrorText(null);
      } else {
        setErrorText(t('import.cloudInvalidUrl'));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setErrorText(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setErrorText(null);
    try {
      const res = await importExcelMutation.mutateAsync(file);
      setReport(res);
    } catch (err: any) {
      setErrorText(err.message || t('import.parsingError'));
    }
  };

  const handleCloudSubmit = async () => {
    if (!cloudUrl.trim()) return;
    setIsCloudImporting(true);
    setErrorText(null);
    try {
      const res = await api.importExcelFromUrl(cloudUrl.trim());
      setReport(res);
    } catch (err: any) {
      setErrorText(err.message || t('import.cloudInvalidUrl'));
    } finally {
      setIsCloudImporting(false);
    }
  };

  const getLogLevelIcon = (level: ImportLog['level']) => {
    switch (level) {
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0" />;
    }
  };

  const getLogLevelBg = (level: ImportLog['level']) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-50/50 border-red-100 text-red-900';
      case 'WARNING':
        return 'bg-amber-50/50 border-amber-100 text-amber-900';
      default:
        return 'bg-teal-50/50 border-teal-100 text-teal-900';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-800">
              {t('import.title')}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        {!report && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-6">
            <button
              onClick={() => { setActiveTab('local'); setErrorText(null); }}
              className={`py-3 px-4 text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'local'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('import.tabLocal')}
            </button>
            <button
              onClick={() => { setActiveTab('cloud'); setErrorText(null); }}
              className={`py-3 px-4 text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'cloud'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t('import.tabCloud')}
            </button>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!report ? (
            activeTab === 'local' ? (
              /* --- STEP 1: FILE LANDING TARGET (Local) --- */
              <div className="space-y-4">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={handleUploadClick}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer ${
                    isDragActive 
                      ? 'border-teal-500 bg-teal-50/20' 
                      : file 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx, .xls"
                    className="hidden"
                  />
                  
                  {file ? (
                    <>
                      <FileSpreadsheet className="h-12 w-12 text-emerald-600 mb-3 animate-bounce" />
                      <h4 className="text-sm font-bold text-slate-800 truncate max-w-xs">{file.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-3 text-xs text-red-500 font-semibold hover:underline cursor-pointer"
                      >
                        {t('import.remove')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-slate-400 mb-3" />
                      <h4 className="text-sm font-bold text-slate-800">{t('import.dragDrop')}</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                        {t('import.dragDropDesc')}
                      </p>
                      <span className="mt-4 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 shadow-sm">
                        {t('import.browse')}
                      </span>
                    </>
                  )}
                </div>

                {errorText && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                    {errorText}
                  </div>
                )}

                {file && (
                  <button
                    type="button"
                    onClick={handleUploadSubmit}
                    disabled={importExcelMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {importExcelMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('import.parsingLocal')}
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4" />
                        {t('import.ingestLocal')}
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              /* --- STEP 1: CLOUD GOOGLE SHEETS TARGET (Cloud) --- */
              <div className="space-y-4">
                <div className="flex flex-col gap-2 p-5 bg-teal-50/20 border border-teal-100 rounded-xl">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Database className="h-4 w-4 text-teal-600" />
                    {t('import.tabCloud')}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {t('import.cloudDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    {t('import.cloudLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('import.cloudPlaceholder')}
                    value={cloudUrl}
                    onChange={(e) => setCloudUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                </div>

                {errorText && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                    {errorText}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCloudSubmit}
                  disabled={isCloudImporting || !cloudUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isCloudImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('import.cloudFetch')}
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4" />
                      {t('import.cloudBtn')}
                    </>
                  )}
                </button>
              </div>
            )
          ) : (
            /* --- STEP 2: SUMMARY REPORTING DASHBOARD --- */
            <div className="space-y-6">
              {/* Alert state banner */}
              <div className={`p-4 border rounded-xl flex items-start gap-3 ${
                report.success 
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                  : 'bg-red-50/50 border-red-200 text-red-950'
              }`}>
                {report.success ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-bold">
                    {report.success 
                      ? t('import.successTitle') 
                      : t('import.failureTitle')}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {report.success 
                      ? t('import.successDesc')
                      : t('import.failureDesc')}
                  </p>
                </div>
              </div>

              {/* Ingestion metrics cards */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5" /> {t('import.analytics')}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-center">
                    <span className="block text-xl font-bold text-slate-800">{report.summary.employees_created}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{t('import.employeesAdded')}</span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-center">
                    <span className="block text-xl font-bold text-slate-800">{report.summary.dependents_created}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{t('import.dependentsAdded')}</span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-center">
                    <span className="block text-xl font-bold text-slate-800">{report.summary.employees_updated}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{t('import.duplicatesLinked')}</span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-center">
                    <span className="block text-xl font-bold text-red-600">{report.summary.errors_count}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{t('import.totalErrors')}</span>
                  </div>
                </div>
              </div>

              {/* Line-by-line detailed logs */}
              {report.logs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    {t('import.parsingLogs')} ({report.logs.length})
                  </h4>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
                    {report.logs.map((log, idx) => (
                      <div key={idx} className={`p-3 flex items-start gap-2.5 border-l-2 ${getLogLevelBg(log.level)}`}>
                        {getLogLevelIcon(log.level)}
                        <div className="leading-relaxed">
                          <span className="font-semibold mr-1.5">
                            [{log.sheet}{log.row ? ` (${t('import.row')} ${log.row})` : ''}]
                          </span>
                          {log.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          {report ? (
            <button
              type="button"
              onClick={() => { setReport(null); setFile(null); setCloudUrl(''); }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-semibold text-sm transition cursor-pointer"
            >
              {t('import.ingestAnother')}
            </button>
          ) : null}
          
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm transition shadow-md cursor-pointer"
          >
            {t('import.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
