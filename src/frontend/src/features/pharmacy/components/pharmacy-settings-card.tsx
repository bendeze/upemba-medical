import React, { useEffect, useState } from 'react';
import { Pill, Save, Check } from 'lucide-react';
import { pharmacyApi } from '../api/pharmacy-api';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';

export function PharmacySettingsCard() {
  const { t } = useTranslation();
  const [minStockLevel, setMinStockLevel] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    pharmacyApi.getSettings()
      .then(res => {
        setMinStockLevel(res.general_min_stock_level);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await pharmacyApi.updateSettings({ general_min_stock_level: minStockLevel });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden mt-6">
      <div className="px-6 py-5 border-b border-border bg-slate-50/50 flex items-center gap-3">
        <div className="bg-teal-500/10 p-2 border border-teal-500/20 rounded-lg text-teal-600">
          <Pill className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">{t('pharmacy.settingsTitle')}</h2>
          <p className="text-xs text-slate-500">{t('pharmacy.settingsDesc')}</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">{t('pharmacy.generalMinStock')}</label>
          <p className="text-xs text-slate-500 mb-2">
            {t('pharmacy.generalMinStockDesc')}
          </p>
          <input
            type="number"
            className="mt-1 block w-full max-w-xs border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            value={minStockLevel}
            onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 0)}
          />
        </div>

        {showSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-emerald-500 text-white p-1 rounded-full shrink-0">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold">{t('pharmacy.settingsSaved')}</span>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-border bg-slate-50/50 flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-sm transition shadow-sm cursor-pointer disabled:bg-slate-400"
        >
          <Save className="h-4 w-4" />
          {saving ? '...' : t('pharmacy.saveConfigBtn')}
        </button>
      </div>
    </div>
  );
}
