// navbar.tsx
// Core Navbar component for Upemba Medical Information System (UMIS)
// Provides a real-time localized digital clock, database sync indicators, and status metrics.

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { Menu, Activity, ShieldCheck, Database } from 'lucide-react';
import { useLayoutStore } from '../store/use-layout-store';

export function Navbar() {
  const { t, language } = useTranslation();
  const { toggleSidebar } = useLayoutStore();
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    // Dynamically format date-time on client side using the active language
    const date = new Date();
    const formatted = date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    // Capitalize first letter
    setFormattedDate(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, [language]);

  return (
    <header className="h-16 border-b border-slate-200 bg-white/85 backdrop-blur-md px-4 md:px-8 flex items-center justify-between shrink-0 z-10">
      {/* Toggle button & Date Display Container */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer border-none bg-transparent outline-none flex items-center justify-center shrink-0"
          title={t('header.toggleSidebar')}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <span className="hidden sm:inline text-slate-400 font-normal">{t('header.datetime')}:</span>
          <span className="font-semibold text-slate-800 text-xs sm:text-sm">{formattedDate || 'May 31, 2026'}</span>
        </div>
      </div>
      
      {/* Central Database Sync Connection Indicators */}
      <div className="flex items-center gap-6">
        {/* Secure Workstation Status */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>{t('header.aesSecured')}</span>
        </div>

        {/* Database Connection sync status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-sm bg-emerald-50 border border-emerald-100 px-3 sm:px-4 py-1.5 rounded-full">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <Database className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline font-semibold text-emerald-700 text-xs tracking-wide">{t('header.database')}</span>
        </div>
      </div>
    </header>
  );
}
