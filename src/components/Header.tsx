import React from 'react';
import { User } from 'firebase/auth';
import {
  User as UserIcon,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  LogOut,
  Smartphone,
  HardDrive
} from 'lucide-react';
import { SyncStatus } from '../types';

interface HeaderProps {
  user: User | null;
  hasDriveToken: boolean;
  syncStatus: SyncStatus;
  isLoggingIn: boolean;
  onLogin: () => void;
  onReconnectDrive: () => void;
  onLogout: () => void;
  onSyncNow: () => void;
  onOpenAndroidGuide: () => void;
}

const GoogleLogoIcon = () => (
  <svg
    className="w-4 h-4 shrink-0"
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  user,
  hasDriveToken,
  syncStatus,
  isLoggingIn,
  onLogin,
  onReconnectDrive,
  onLogout,
  onSyncNow,
  onOpenAndroidGuide,
}) => {
  return (
    <header className="bg-teal-700 text-white p-3.5 sticky top-0 z-30 shadow-md">
      <div className="flex justify-between items-center gap-2">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white text-lg shadow-inner border border-teal-500/50 shrink-0">
            <span className="text-xl" role="img" aria-label="Estetoscópio">🩺</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight tracking-tight truncate">
              Coleta Enfermagem
            </h1>
            <p className="text-[11px] text-teal-200 font-medium truncate">
              BPA • SUS & Google Drive
            </p>
          </div>
        </div>

        {/* Action Controls & Auth */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Android APK / GitHub Quick Guide Button */}
          <button
            type="button"
            onClick={onOpenAndroidGuide}
            title="App Android & Publicação GitHub"
            className="bg-teal-800/80 hover:bg-teal-900 text-teal-100 text-xs px-2.5 py-1.5 rounded-lg transition border border-teal-600/60 flex items-center gap-1 cursor-pointer"
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
                type="button"
                onClick={onLogout}
                title="Sair da Conta Google"
                className="text-teal-200 hover:text-white p-1 rounded transition hover:bg-teal-900 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-75 cursor-pointer"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
              ) : (
                <GoogleLogoIcon />
              )}
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="mt-2.5 pt-2 border-t border-teal-600/60 flex justify-between items-center gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0">
          {syncStatus.state === 'synced' && (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="text-teal-100 font-medium truncate">{syncStatus.message}</span>
            </>
          )}
          {syncStatus.state === 'syncing' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-teal-200 animate-spin shrink-0" />
              <span className="text-teal-100 truncate">{syncStatus.message}</span>
            </>
          )}
          {syncStatus.state === 'error' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
              <span className="text-rose-200 truncate">{syncStatus.message}</span>
            </>
          )}
          {syncStatus.state === 'offline' && (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="text-teal-100 truncate">{syncStatus.message}</span>
            </>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {user && !hasDriveToken ? (
            <button
              type="button"
              onClick={onReconnectDrive}
              disabled={isLoggingIn}
              className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/40 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-60"
            >
              <HardDrive className="w-3 h-3" />
              <span>Conectar Drive</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={user ? onSyncNow : onLogin}
              disabled={isLoggingIn || syncStatus.state === 'syncing'}
              className="text-teal-200 hover:text-white underline text-[11px] font-medium transition cursor-pointer disabled:opacity-60"
            >
              {user ? 'Sincronizar' : 'Conectar'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
