'use client';

import React, { useState } from 'react';
import { useRegions, useSites } from '../hooks/use-beneficiaries';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Loader2, 
  ArrowLeft,
  Save,
  CheckCircle2,
  FolderOpen,
  Edit,
  X,
  Compass,
  ArrowRight,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useLayoutStore } from '@/features/layout/store/use-layout-store';
import { api } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useBeneficiariesStore } from '../store/use-beneficiaries-store';

export function RegionsPage() {
  const { t } = useTranslation();
  const { setActiveTab } = useLayoutStore();
  const { setRegionId, setSiteId } = useBeneficiariesStore();
  const queryClient = useQueryClient();

  // Create Region State
  const [newRegionName, setNewRegionName] = useState<string>('');
  const [isSubmittingRegion, setIsSubmittingRegion] = useState<boolean>(false);
  const [regionError, setRegionError] = useState<string | null>(null);

  // Create Site State
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [newSiteName, setNewSiteName] = useState<string>('');
  const [isSubmittingSite, setIsSubmittingSite] = useState<boolean>(false);
  const [siteError, setSiteError] = useState<string | null>(null);

  // Editing States
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingRegionName, setEditingRegionName] = useState<string>('');
  const [isUpdatingRegion, setIsUpdatingRegion] = useState<boolean>(false);

  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editingSiteName, setEditingSiteName] = useState<string>('');
  const [editingSiteRegionId, setEditingSiteRegionId] = useState<string>('');
  const [isUpdatingSite, setIsUpdatingSite] = useState<boolean>(false);

  // Deleting States
  const [regionToDelete, setRegionToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingRegion, setIsDeletingRegion] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Query
  const { data: regions, isLoading: isLoadingRegions } = useRegions();
  const { data: allSites, isLoading: isLoadingSites } = useSites();

  // Add Region handler
  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionName.trim()) return;
    
    setIsSubmittingRegion(true);
    setRegionError(null);
    try {
      await api.createRegion(newRegionName.trim());
      setNewRegionName('');
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    } catch (err: any) {
      setRegionError(err.message || t('regions.failedAddRegion'));
    } finally {
      setIsSubmittingRegion(false);
    }
  };

  // Add Site handler
  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegionId || !newSiteName.trim()) return;
    
    setIsSubmittingSite(true);
    setSiteError(null);
    try {
      await api.createSite(selectedRegionId, newSiteName.trim());
      setNewSiteName('');
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    } catch (err: any) {
      setSiteError(err.message || t('regions.failedAddSite'));
    } finally {
      setIsSubmittingSite(false);
    }
  };

  // Update Region handler
  const handleUpdateRegion = async (id: string) => {
    if (!editingRegionName.trim()) return;
    setIsUpdatingRegion(true);
    try {
      await api.updateRegion(id, editingRegionName.trim());
      setEditingRegionId(null);
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (err: any) {
      alert(err.message || t('regions.failedRenameRegion'));
    } finally {
      setIsUpdatingRegion(false);
    }
  };

  // Update Site handler
  const handleUpdateSite = async (id: string) => {
    if (!editingSiteName.trim()) return;
    setIsUpdatingSite(true);
    try {
      await api.updateSite(id, editingSiteRegionId, editingSiteName.trim());
      setEditingSiteId(null);
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (err: any) {
      alert(err.message || t('regions.failedRenameSite'));
    } finally {
      setIsUpdatingSite(false);
    }
  };

  // Confirm Delete Region handler
  const handleConfirmDeleteRegion = async (id: string) => {
    setIsDeletingRegion(true);
    setDeleteError(null);
    try {
      await api.deleteRegion(id);
      setRegionToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (err: any) {
      setDeleteError(err.message || t('regions.failedDeleteRegion'));
    } finally {
      setIsDeletingRegion(false);
    }
  };

  // Click redirections with dynamic query filtering
  const handleRegionClick = (rId: string) => {
    setRegionId(rId);
    setSiteId(''); // Clear site specific filter
    setActiveTab('beneficiaries');
  };

  const handleSiteClick = (rId: string, sId: string) => {
    setRegionId(rId);
    setSiteId(sId);
    setActiveTab('beneficiaries');
  };

  // Group sites by region ID with objects to track IDs
  const sitesByRegion: Record<string, Array<{ id: string; name: string }>> = {};
  if (allSites) {
    allSites.forEach((site) => {
      const rId = site.region || 'unassigned';
      if (!sitesByRegion[rId]) {
        sitesByRegion[rId] = [];
      }
      sitesByRegion[rId].push({ id: site.id, name: site.name });
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm glass">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('beneficiaries')}
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
            title={t('regions.backBtn')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              {t('regions.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('regions.subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side forms panel: Add Region & Add Site */}
        <div className="space-y-6">
          
          {/* A. Add Region Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Plus className="h-4 w-4 text-teal-600" />
              {t('regions.registerNewRegion')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('regions.registerNewRegionDesc')}
            </p>

            <form onSubmit={handleAddRegion} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t('regions.regionNameLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('regions.regionNamePlaceholder')}
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  required
                />
              </div>

              {regionError && (
                <p className="text-xs text-red-500 font-semibold leading-relaxed">{regionError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmittingRegion || !newRegionName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingRegion ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('regions.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t('regions.saveRegionBtn')}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* B. Add Site Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Plus className="h-4 w-4 text-teal-600" />
              {t('regions.registerHealthcareSite')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('regions.registerHealthcareSiteDesc')}
            </p>

            <form onSubmit={handleAddSite} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t('regions.parentRegionLabel')}
                </label>
                <select
                  value={selectedRegionId}
                  onChange={(e) => setSelectedRegionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition appearance-none cursor-pointer"
                  required
                >
                  <option value="">{t('regions.selectRegionOption')}</option>
                  {regions?.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  {t('regions.siteNameLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('regions.siteNamePlaceholder')}
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  required
                />
              </div>

              {siteError && (
                <p className="text-xs text-red-500 font-semibold leading-relaxed">{siteError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmittingSite || !selectedRegionId || !newSiteName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingSite ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('regions.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t('regions.saveSiteBtn')}
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: Regions Cards Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-slate-400" />
            {t('regions.registryTitle')} ({regions?.length || 0})
          </h3>
 
          {isLoadingRegions || isLoadingSites ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-xl border border-slate-200">
              <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
              <p className="text-slate-500 text-sm">{t('regions.openingRegistry')}</p>
            </div>
          ) : !regions || regions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-slate-200 px-4">
              <Building2 className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">{t('regions.noRegions')}</h3>
              <p className="text-slate-500 text-sm mt-1">
                {t('regions.noRegionsDesc')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {regions.map((region) => {
                const sitesList = sitesByRegion[region.id] || [];
                const isEditingRegion = editingRegionId === region.id;
                
                return (
                  <div 
                    key={region.id} 
                    className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition duration-150 flex flex-col justify-between"
                  >
                    <div>
                      {/* Region Title or Editing Input */}
                      {isEditingRegion ? (
                        <div className="flex items-center gap-2 w-full pb-2">
                          <input
                            type="text"
                            value={editingRegionName}
                            onChange={(e) => setEditingRegionName(e.target.value)}
                            className="flex-1 px-2.5 py-1 border border-slate-300 rounded text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                            required
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateRegion(region.id)}
                            disabled={isUpdatingRegion || !editingRegionName.trim()}
                            className="p-1 text-teal-600 hover:bg-teal-50 rounded transition cursor-pointer"
                            title={t('common.save')}
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingRegionId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-50 rounded transition cursor-pointer"
                            title={t('common.cancel')}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 
                              onClick={() => handleRegionClick(region.id)}
                              className="font-bold text-slate-900 text-base leading-tight hover:text-teal-600 hover:underline cursor-pointer flex items-center gap-1.5 group"
                              title={t('regions.viewAgentsRegion')}
                            >
                              {region.name}
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-teal-600" />
                            </h4>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingRegionId(region.id);
                                setEditingRegionName(region.name);
                              }}
                              className="p-1 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded transition cursor-pointer"
                              title={t('regions.renameRegion')}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setRegionToDelete({ id: region.id, name: region.name });
                                setDeleteError(null);
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded transition cursor-pointer"
                              title={t('regions.deleteRegion')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Healthcare Sites List */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          {t('regions.healthcareSitesTitle')} ({sitesList.length})
                        </span>
                        
                        {sitesList.length === 0 ? (
                          <span className="text-xs text-slate-400 italic block">{t('regions.noSitesRegistered')}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {sitesList.map((site) => {
                              const isEditingSite = editingSiteId === site.id;
                              
                              if (isEditingSite) {
                                return (
                                  <div key={site.id} className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-300">
                                    <input
                                      type="text"
                                      value={editingSiteName}
                                      onChange={(e) => setEditingSiteName(e.target.value)}
                                      className="w-24 px-1.5 py-0.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
                                      required
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleUpdateSite(site.id)}
                                      disabled={isUpdatingSite || !editingSiteName.trim()}
                                      className="p-0.5 text-teal-600 hover:bg-teal-50 rounded transition cursor-pointer"
                                    >
                                      <Save className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => setEditingSiteId(null)}
                                      className="p-0.5 text-slate-400 hover:bg-slate-50 rounded transition cursor-pointer"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <span 
                                  key={site.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 group"
                                >
                                  {/* Filter Link */}
                                  <span
                                    onClick={() => handleSiteClick(region.id, site.id)}
                                    className="flex items-center gap-1 hover:text-teal-600 hover:underline cursor-pointer"
                                    title={t('regions.viewAgentsSite')}
                                  >
                                    <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                    {site.name}
                                  </span>

                                  {/* Edit Site Button */}
                                  <button
                                    onClick={() => {
                                      setEditingSiteId(site.id);
                                      setEditingSiteName(site.name);
                                      setEditingSiteRegionId(region.id);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-teal-600 hover:bg-slate-200 rounded transition opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer ml-1"
                                    title={t('regions.renameSite')}
                                  >
                                    <Edit className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div 
                      onClick={() => handleRegionClick(region.id)}
                      className="flex items-center justify-between text-[10px] text-slate-400 mt-5 font-mono pt-2 border-t border-slate-50/50 uppercase cursor-pointer hover:text-teal-600 group"
                    >
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{t('regions.statusActive')}</span>
                      </div>
                      <Compass className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition text-teal-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 4. Custom Deletion Confirmation Modal */}
      {regionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-red-50 text-red-700">
              <AlertTriangle className="h-5 w-5 shrink-0 animate-bounce" />
              <h3 className="text-base font-bold">{t('regions.deleteModalTitle')}</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-normal">
                {t('regions.deleteModalConfirm')} <strong className="text-slate-855 font-bold font-sans">"{regionToDelete.name}"</strong>?
              </p>
              
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-150 flex gap-3 text-xs text-slate-500 leading-relaxed">
                <span className="text-teal-600 font-bold shrink-0">{t('regions.deleteModalNoteLabel')}</span>
                <span>
                  {t('regions.deleteModalNoteText')}
                </span>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-semibold text-red-600 leading-relaxed">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRegionToDelete(null)}
                disabled={isDeletingRegion}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-semibold text-sm transition cursor-pointer"
              >
                {t('regions.deleteModalCancelBtn')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteRegion(regionToDelete.id)}
                disabled={isDeletingRegion}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 font-semibold text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isDeletingRegion ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('regions.deleteModalDeletingBtn')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {t('regions.deleteModalConfirmBtn')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
