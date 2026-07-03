'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/features/beneficiaries/services/api';
import { useBeneficiariesStore } from '@/features/beneficiaries/store/use-beneficiaries-store';
import { EmployeeForm } from '@/features/beneficiaries/components/employee-form';
import { DependentDialog } from '@/features/beneficiaries/components/dependent-dialog';
import { ImportExcelDialog } from '@/features/beneficiaries/components/import-excel-dialog';
import { EmployeeDetailsDrawer } from '@/features/beneficiaries/components/employee-details-drawer';
import { Employee } from '@/features/beneficiaries/types';
import { useTranslation } from '@/features/i18n/store/use-i18n-store';

// Modular Layout Features
import { Sidebar } from '@/features/layout/components/sidebar';
import { Navbar } from '@/features/layout/components/navbar';
import { Footer } from '@/features/layout/components/footer';
import { useLayoutStore } from '@/features/layout/store/use-layout-store';

// Modular Page Views
import { DashboardPage } from '@/features/dashboard/components/dashboard-page';
import { SettingsPage } from '@/features/settings/components/settings-page';
import { DependentsPage } from '@/features/beneficiaries/components/dependents-page';
import { RegionsPage } from '@/features/beneficiaries/components/regions-page';
import { PharmacyDashboard } from '@/features/pharmacy/components/pharmacy-dashboard';
import { ConsultationsDashboard } from '@/features/consultations/components/consultations-dashboard';
import { ReportsDashboard } from '@/features/reports/components/reports-dashboard';

// Lucide Icons
import { ShieldAlert, Stethoscope, Lock, User, Mail } from 'lucide-react';

export default function Home() {
  const { t } = useTranslation();
  const { activeTab } = useLayoutStore();

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [loggedInUser, setLoggedInUser] = useState<{username: string, role: string} | null>(null);
  
  // Auth Form Credentials
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('admin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('adminpassword');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Zustand Store States
  const {
    selectedEmployeeId, setSelectedEmployeeId,
    isImportOpen, setImportOpen,
    isCreateOpen, setCreateOpen,
    isEditOpen, setEditOpen,
    isAddDependentOpen, setAddDependentOpen
  } = useBeneficiariesStore();

  const [activeEditEmployee, setActiveEditEmployee] = useState<Employee | null>(null);
  const [activeDetailEmployee, setActiveDetailEmployee] = useState<Employee | null>(null);

  const isOverlayActive = !!(
    selectedEmployeeId || 
    isCreateOpen || 
    isEditOpen || 
    isImportOpen
  );

  useEffect(() => {
    const checkAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const me = await api.getMe();
          setLoggedInUser({
            username: me.username,
            role: me.is_superuser ? 'Superuser' : 'User'
          });
          setIsLoggedIn(true);
        } catch {
          api.logout();
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      if (isRegisterMode) {
        if (password !== confirmPassword) {
          throw new Error(t('register.passwordMatchError'));
        }
        if (!email.endsWith('@forgottenparks.org') && !email.endsWith('@forgttenparks.org')) {
          throw new Error(t('register.emailError'));
        }
        await api.register(username, email, password);
      } else {
        await api.login(username, password);
      }
      
      const me = await api.getMe();
      setLoggedInUser({
        username: me.username,
        role: me.is_superuser ? 'Superuser' : 'User'
      });
      setIsLoggedIn(true);
    } catch (err: any) {
      setLoginError(err.message || t('login.authFailed'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsLoggedIn(false);
    setLoggedInUser(null);
    setSelectedEmployeeId(null);
  };

  const handleOpenDetails = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setActiveDetailEmployee(employee);
  };

  const handleOpenEdit = (employee: Employee) => {
    setActiveEditEmployee(employee);
    setEditOpen(true);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <LoaderIcon className="h-8 w-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    /* --- BEAUTIFUL JWT LOGIN SCREEN --- */
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-teal-500/20 border border-teal-500/30 rounded-2xl mb-2">
              <Stethoscope className="h-8 w-8 text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isRegisterMode ? t('register.title') : t('login.title')}
            </h1>
            <p className="text-sm text-slate-300">
              {isRegisterMode ? t('register.subtitle') : t('login.subtitle')}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t('login.usernameLabel')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('login.usernamePlaceholder')}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            {isRegisterMode && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('register.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('register.emailPlaceholder')}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t('login.passwordLabel')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>
            </div>

            {isRegisterMode && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {t('register.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('register.confirmPasswordPlaceholder')}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                  />
                </div>
              </div>
            )}

            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-300 leading-normal flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white bg-teal-600 hover:bg-teal-700 font-semibold text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? (
                <>
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                  {isRegisterMode ? t('register.registering') : t('login.authorizing')}
                </>
              ) : (
                isRegisterMode ? t('register.button') : t('login.button')
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setLoginError(null);
                }}
                className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
              >
                {isRegisterMode ? t('register.switchToLogin') : t('register.switchToRegister')}
              </button>
            </div>
          </form>

          <div className="border-t border-white/10 pt-4 text-center">
            <p className="text-[10px] text-slate-400 leading-normal">
              {t('login.restricted')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* --- SECURE ENTERPRISE DASHBOARD VIEW --- */
  return (
    <div className="flex h-screen bg-background overflow-hidden print:h-auto print:overflow-visible print:block">
      
      {/* 1. Sleek Left Sidebar Navigation */}
      <Sidebar 
        onLogout={handleLogout} 
        username={loggedInUser?.username} 
        role={loggedInUser?.role} 
      />

      {/* 2. Main Layout Workspace */}
      <main className={`flex-1 h-full flex flex-col min-w-0 overflow-hidden transition-all duration-300 print:h-auto print:overflow-visible print:block ${
        isOverlayActive ? 'blur-[4px] pointer-events-none' : ''
      }`}>
        {/* Top welcome status header */}
        <Navbar />

        {/* Scrollable page body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-between print:overflow-visible print:p-0 print:block">
          <div className="space-y-4 md:space-y-8 mb-8 print:m-0 print:space-y-4">
            {activeTab === 'settings' ? (
              <SettingsPage />
            ) : activeTab === 'dependents' ? (
              <DependentsPage />
            ) : activeTab === 'regions' ? (
              <RegionsPage />
            ) : activeTab === 'pharmacy' ? (
              <PharmacyDashboard />
            ) : activeTab === 'consultations' ? (
              <ConsultationsDashboard />
            ) : activeTab === 'reports' ? (
              <ReportsDashboard />
            ) : (
              <DashboardPage 
                onViewDetails={handleOpenDetails}
                onEdit={handleOpenEdit}
              />
            )}
          </div>
          
          {/* Operations notice footer */}
          <Footer />
        </div>
      </main>

      {/* 3. Sliding Detail Drawer Side Panel */}
      {selectedEmployeeId && (
        <EmployeeDetailsDrawer
          employeeId={selectedEmployeeId}
          onClose={() => { setSelectedEmployeeId(null); setActiveDetailEmployee(null); }}
          onEdit={handleOpenEdit}
        />
      )}

      {/* 4. Overlay Modals */}
      {/* Create Employee Form */}
      {isCreateOpen && (
        <EmployeeForm onClose={() => setCreateOpen(false)} />
      )}

      {/* Edit Employee Form */}
      {isEditOpen && activeEditEmployee && (
        <EmployeeForm 
          employee={activeEditEmployee} 
          onClose={() => { setCreateOpen(false); setEditOpen(false); setActiveEditEmployee(null); }} 
        />
      )}

      {/* Bulk Excel Ingestion modal */}
      {isImportOpen && (
        <ImportExcelDialog onClose={() => setImportOpen(false)} />
      )}

    </div>
  );
}

// Micro loader icon component
function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
