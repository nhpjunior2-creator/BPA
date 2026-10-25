import React from 'react';
import { User } from 'firebase/auth';
import {
  User as UserIcon,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  LogIn,
  LogOut,
  Smartphone
} from 'lucide-react';
import { SyncStatus } from '../types';

interface HeaderProps {
  user: User | null;
  syncStatus: SyncStatus;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onSyncNow: () => void;
  onOpenAndroidGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  syncStatus,
  isLoggingIn,
  onLogin,
  onLogout,
  onSyncNow,
  onOpenAndroidGuide,
}) => {
  return (
    <header className="bg-teal-700 text-white p-3.5 sticky top-0 z-30 shadow-md">
      <div className="flex justify-between items-center">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white text-lg shadow-inner border border-teal-500/50">
            <span className="text-xl">🩺</span>
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight">Coleta Enfermagem</h1>
            <p className="text-[11px] text-teal-200 font-medium">BPA • SUS & Google Drive</p>
          </div>
        </div>

        {/* Action Controls & Auth */}
        <div className="flex items-center gap-1.5">
          {/* Android APK / GitHub Quick Guide Button */}
          <button
            onClick={onOpenAndroidGuide}
            title="App Android & Publicação GitHub"
            className="bg-teal-800/80 hover:bg-teal-900 text-teal-100 text-xs px-2.5 py-1.5 rounded-lg transition border border-teal-600/60 flex items-center gap-1"
          >
            <Smartphone className="w-3.5 h-3.5 text-teal-300" />
            <span className="hidden sm:inline text-[11px] font-medium">APK Android</span>
          </button>

          {/* User Auth Info */}
          {user ? (
            <div className="flex items-center gap-1.5 bg-teal-800/70 p-1 rounded-lg border border-teal-600/50">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuário'}
                  className="w-7 h-7 rounded-full border border-teal-300 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-xs">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="hidden sm:block text-left pr-1">
                <p className="text-[11px] font-semibold text-white leading-tight truncate max-w-[100px]">
                  {user.displayName?.split(' ')[0] || 'Enfermeiro(a)'}
                </p>
              </div>
              <button
                onClick={onLogout}
                title="Sair da Conta Google"
                className="text-teal-200 hover:text-white p-1 rounded transition hover:bg-teal-900"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="bg-white hover:bg-teal-50 text-slate-800 font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-75"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-teal-600" />
              )}
              <span>Entrar Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="mt-2.5 pt-2 border-t border-teal-600/60 flex justify-between items-center text-[11px]">
        <div className="flex items-center gap-1.5">
          {syncStatus.state === 'synced' && (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-teal-100 font-medium">{syncStatus.message}</span>
            </>
          )}
          {syncStatus.state === 'syncing' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-teal-200 animate-spin" />
              <span className="text-teal-100">{syncStatus.message}</span>
            </>
          )}
          {syncStatus.state === 'error' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
              <span className="text-rose-200">{syncStatus.message}</span>
            </>
          )}
          {syncStatus.state === 'offline' && (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-teal-100">{syncStatus.message}</span>
            </>
          )}
        </div>

        <button
          onClick={onSyncNow}
          className="text-teal-200 hover:text-white underline text-[11px] font-medium transition cursor-pointer"
        >
          Sincronizar
        </button>
      </div>
    </header>
  );
};
