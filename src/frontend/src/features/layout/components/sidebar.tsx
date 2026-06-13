// sidebar.tsx
// Unified Sidebar navigation component for Upemba Medical Information System (UMIS)
// Features dynamic tab highlight management and localized label rendering.

import React from 'react';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';
import { useLayoutStore } from '../store/use-layout-store';
import { 
  Stethoscope, 
  LayoutDashboard, 
  Activity, 
  Pill, 
  ClipboardList, 
  FolderGit, 
  User, 
  LogOut, 
  Settings,
  UserCheck,
  Building2
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
  username?: string;
  role?: string;
}

export function Sidebar({ onLogout, username = 'Admin', role = 'Superuser' }: SidebarProps) {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, isSidebarOpen, setSidebarOpen } = useLayoutStore();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`h-full bg-slate-900 text-slate-400 flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden fixed inset-y-0 left-0 md:relative z-40 ${
        isSidebarOpen 
          ? 'w-64 border-r border-slate-800 opacity-100 translate-x-0' 
          : 'w-0 border-r-0 opacity-0 pointer-events-none -translate-x-full md:translate-x-0'
      }`}>
      {/* Constant-width wrapper to prevent contents from squishing or wrapping during transitions */}
      <div className="w-64 h-full flex flex-col justify-between shrink-0 overflow-y-auto">
        <div>
          {/* Brand Logo Container */}
          <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-800">
            <div className="bg-primary p-1.5 rounded-lg text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide leading-none">{t('sidebar.title')}</h1>
              <span className="text-[9px] uppercase tracking-widest font-semibold text-primary">{t('sidebar.subtitle')}</span>
            </div>
          </div>

          {/* Navigation Options List */}
          <nav className="px-4 py-6 space-y-1.5 text-sm">
            {/* Beneficiaries Dashboard (Active) */}
            <button
              onClick={() => setActiveTab('beneficiaries')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-none bg-transparent outline-none transition cursor-pointer text-left ${
                activeTab === 'beneficiaries'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              {t('sidebar.beneficiaries')}
            </button>

            {/* Consultations (Disabled in phase 1) */}
            <button
              disabled
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border-none bg-transparent outline-none transition opacity-60 cursor-not-allowed text-slate-400 text-left font-medium"
              title="Future consultations module"
            >
              <Activity className="h-4 w-4" />
              {t('sidebar.consultations')}
            </button>

            {/* Pharmacy (Active) */}
            <button
              onClick={() => setActiveTab('pharmacy')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-none bg-transparent outline-none transition cursor-pointer text-left ${
                activeTab === 'pharmacy'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
              }`}
            >
              <Pill className="h-4 w-4" />
              {t('sidebar.pharmacy')}
            </button>

            {/* Reporting (Disabled in phase 1) */}
            <button
              disabled
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border-none bg-transparent outline-none transition opacity-60 cursor-not-allowed text-slate-400 text-left font-medium"
              title="Future reporting module"
            >
              <FolderGit className="h-4 w-4" />
              {t('sidebar.reporting')}
            </button>

            {/* Ayants Droits (Active, Toggle tab) */}
            <button
              onClick={() => setActiveTab('dependents')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-none bg-transparent outline-none transition cursor-pointer text-left ${
                activeTab === 'dependents'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Ayants Droits
            </button>

            {/* Regions & Sites (Active, Toggle tab) */}
            <button
              onClick={() => setActiveTab('regions')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-none bg-transparent outline-none transition cursor-pointer text-left ${
                activeTab === 'regions'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Régions & Sites
            </button>

            {/* Settings (Active, Toggle tab) */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-none bg-transparent outline-none transition cursor-pointer text-left ${
                activeTab === 'settings'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
              }`}
            >
              <Settings className="h-4 w-4" />
              {t('sidebar.settings')}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Profile Card */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1.5 rounded-full">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-white leading-none">{username}</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500">{role === 'Superuser' ? t('sidebar.superuser') : role}</span>
            </div>
          </div>
          
          {/* Secure Log Out Button */}
          <button
            onClick={onLogout}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-red-400 transition cursor-pointer border-none bg-transparent outline-none"
            title={t('sidebar.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
