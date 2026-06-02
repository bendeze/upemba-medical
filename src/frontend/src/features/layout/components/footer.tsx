// footer.tsx
// Core Footer component for Upemba Medical Information System (UMIS)
// Renders operation copyrights, localized security nodes, and clinical status.

import React from 'react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { ShieldAlert, Info } from 'lucide-react';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="h-10 border-t border-slate-200 bg-white/70 backdrop-blur-md px-8 flex items-center justify-between shrink-0 text-[10px] text-slate-400 font-medium">
      {/* copyright */}
      <div className="flex items-center gap-1.5">
        <Info className="h-3 w-3 text-slate-400 shrink-0" />
        <span>{t('footer.copyright')}</span>
      </div>

      {/* secure offline status */}
      <div className="flex items-center gap-1.5 text-slate-400">
        <ShieldAlert className="h-3 w-3 text-slate-300 shrink-0" />
        <span>{t('footer.secureNode')}</span>
      </div>
    </footer>
  );
}
