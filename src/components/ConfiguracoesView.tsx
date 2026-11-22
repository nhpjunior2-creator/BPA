import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  HardDrive,
  Database,
  UserCheck,
  Smartphone,
  Upload,
  Download,
  Save,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Shield,
  FileCheck,
  AlertTriangle,
  AlertCircle,
  X
} from 'lucide-react';
import { UserProfile, Atendimento } from '../types';
import { exportarJsonBackup } from '../services/pdfService';

interface ConfiguracoesViewProps {
  user: User | null;
  hasDriveToken: boolean;
  driveLastSync?: string;
  perfil: UserProfile | null;
  atendimentos: Atendimento[];
  isLoggingIn: boolean;
  onLogin: () => void;
  onReconnectDrive: (forceConsent?: boolean) => void;
  onLogout: () => void;
  onSyncDrive: () => Promise<void>;
  onDownloadDrive: () => Promise<void>;
  onSaveProfile: (profile: Partial<UserProfile>) => Promise<void>;
  onImportBackup: (importedList: Atendimento[]) => Promise<void>;
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

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  user,
  hasDriveToken,
  driveLastSync,
  perfil,
  atendimentos,
  isLoggingIn,
  onLogin,
  onReconnectDrive,
  onLogout,
  onSyncDrive,
  onDownloadDrive,
  onSaveProfile,
  onImportBackup,
  onOpenAndroidGuide,
}) => {
  const [displayName, setDisplayName] = useState<string>(perfil?.displayName || user?.displayName || '');
  const [coren, setCoren] = useState<string>(perfil?.coren || '');
  const [cns, setCns] = useState<string>(perfil?.cns || '');
  const [unidadeSaude, setUnidadeSaude] = useState<string>(perfil?.unidadeSaude || '');

  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [isDownloadingDrive, setIsDownloadingDrive] = useState<boolean>(false);
  const [confirmDownloadModal, setConfirmDownloadModal] = useState<boolean>(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState<string>('');
  const [backupFeedback, setBackupFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync form fields whenever user or profile loads/changes
  useEffect(() => {
    setDisplayName(perfil?.displayName || user?.displayName || '');
    setCoren(perfil?.coren || '');
    setCns(perfil?.cns || '');
    setUnidadeSaude(perfil?.unidadeSaude || '');
  }, [perfil, user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await onSaveProfile({
        displayName: displayName.trim(),
        coren: coren.trim(),
        cns: cns.trim(),
        unidadeSaude: unidadeSaude.trim(),
      });
      setProfileSavedMsg('Dados do profissional atualizados com sucesso!');
      setTimeout(() => setProfileSavedMsg(''), 3000);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDriveSyncClick = async () => {
    setIsSyncingDrive(true);
    try {
      await onSyncDrive();
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const executarDownloadDrive = async () => {
    setConfirmDownloadModal(false);
    setIsDownloadingDrive(true);
    try {
      await onDownloadDrive();
    } finally {
      setIsDownloadingDrive(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        let list: Atendimento[] = [];

        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (parsed && Array.isArray(parsed.atendimentos)) {
          list = parsed.atendimentos;
        }

        if (list.length === 0) {
          setBackupFeedback({
            type: 'error',
            text: 'Nenhum atendimento válido encontrado no arquivo JSON selecionado.',
          });
          return;
        }

        await onImportBackup(list);
        setBackupFeedback({
          type: 'success',
          text: `${list.length} atendimento(s) importado(s) e mesclado(s) com sucesso!`,
        });
      } catch {
        setBackupFeedback({
          type: 'error',
          text: 'Falha ao processar o arquivo JSON de backup. Verifique o formato.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section className="space-y-4">
      {/* Google Account Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
          <HardDrive className="w-4 h-4 text-teal-600" />
          <span>Conta Google & Autenticação</span>
        </h3>

        {user ? (
          <div className="space-y-2.5">
            <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-2xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuário'}
                    className="w-11 h-11 rounded-full border-2 border-teal-400 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-teal-600 flex items-center justify-center text-white shrink-0">
                    <UserCheck className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{user.displayName}</h4>
                  <p className="text-xs text-slate-500 font-mono truncate">{user.email}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold">
                    {hasDriveToken ? (
                      <span className="text-teal-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Google Drive & Firebase conectados</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Firebase conectado • Autorize o Google Drive</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold py-1.5 px-3 rounded-xl transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {!hasDriveToken && (
                <button
                  type="button"
                  onClick={() => onReconnectDrive(true)}
                  disabled={isLoggingIn}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <HardDrive className="w-3.5 h-3.5" />
                  )}
                  <span>Autorizar Acesso ao Google Drive</span>
                </button>
              )}

              <button
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <GoogleLogoIcon />
                <span>Trocar Conta Google</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-3">
            <p className="text-xs text-slate-600">
              Entre com qualquer conta Google para salvar automaticamente seus atendimentos no
              Google Drive pessoal e no banco Firebase em nuvem.
            </p>
            <button
              type="button"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs py-2.5 px-4 rounded-xl border border-slate-300 shadow-sm inline-flex items-center gap-2.5 transition active:scale-95 disabled:opacity-75 cursor-pointer"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
              ) : (
                <GoogleLogoIcon />
              )}
              <span>Sign in with Google / Entrar com Google</span>
            </button>
          </div>
        )}
      </div>

      {/* Cloud Sync & Google Drive Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
          <Cloud className="w-4 h-4 text-teal-600" />
          <span>Sincronização em Nuvem (Google Drive & Firestore)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <HardDrive className="w-3.5 h-3.5 text-teal-600" />
              <span>Google Drive</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Arquivo: <code className="text-teal-700">atendimentos_bpa_drive.json</code>
            </p>
            <p className="text-[11px] text-slate-500">
              Status:{' '}
              {hasDriveToken
                ? driveLastSync
                  ? `Sincronizado às ${driveLastSync}`
                  : 'Pronto para sincronizar'
                : user
                ? 'Aguardando autorização do Drive'
                : 'Desconectado'}
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span>Firebase Firestore</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Coleção: /users/{user?.uid ? `${user.uid.slice(0, 8)}...` : '...'}/atendimentos
            </p>
            <p className="text-[11px] text-slate-500">
              Status: {user ? 'Conectado e sincronizado' : 'Modo local offline'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleDriveSyncClick}
            disabled={isSyncingDrive || !user}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>
              {hasDriveToken ? 'Sincronizar Agora com Google Drive' : 'Conectar e Enviar para Drive'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmDownloadModal(true)}
            disabled={isDownloadingDrive || !user}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl border border-slate-300 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Download className={`w-3.5 h-3.5 ${isDownloadingDrive ? 'animate-bounce' : ''}`} />
            <span>Baixar da Nuvem</span>
          </button>
        </div>
      </div>

      {/* Professional Data Form */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-teal-600" />
          <span>Identificação do Profissional (Para o Relatório BPA)</span>
        </h3>

        {profileSavedMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{profileSavedMsg}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Enfermeiro(a) / Profissional
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Enf. Carlos Alberto da Silva"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">COREN (Nº e UF)</label>
              <input
                type="text"
                value={coren}
                onChange={(e) => setCoren(e.target.value)}
                placeholder="Ex: COREN-SP 123456"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CNS do Profissional</label>
              <input
                type="text"
                value={cns}
                onChange={(e) => setCns(e.target.value)}
                placeholder="15 dígitos do SUS"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unidade de Saúde / Estabelecimento SUS
            </label>
            <input
              type="text"
              value={unidadeSaude}
              onChange={(e) => setUnidadeSaude(e.target.value)}
              placeholder="Ex: UBS Vila das Flores - CNES 1234567"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingProfile ? 'Salvando...' : 'Salvar Dados do Profissional'}</span>
          </button>
        </form>
      </div>

      {/* Android, GitHub and APK Card */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/80 p-4 rounded-2xl shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 text-teal-900">
          <Smartphone className="w-5 h-5 text-teal-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Publicação GitHub & Aplicativo Android (APK)
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Instale como aplicativo nativo no seu celular Android ou veja o passo a passo completo para
          publicar no seu repositório GitHub e compilar o instalador .APK para a Google Play Store.
        </p>
        <button
          type="button"
          onClick={onOpenAndroidGuide}
          className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Ver Guia do APK Android & GitHub</span>
        </button>
      </div>

      {/* Backup and Restore */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
          <FileCheck className="w-4 h-4 text-teal-600" />
          <span>Backup e Restauração de Arquivos</span>
        </h3>

        {backupFeedback && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
              backupFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{backupFeedback.text}</span>
            <button
              type="button"
              onClick={() => setBackupFeedback(null)}
              className="p-0.5 hover:opacity-75"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => exportarJsonBackup(atendimentos)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl border border-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Backup JSON</span>
          </button>

          <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl border border-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Confirmation Modal for Downloading/Merging from Google Drive */}
      {confirmDownloadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 text-teal-700">
              <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Baixar do Google Drive</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja buscar o arquivo <code className="text-teal-700">atendimentos_bpa_drive.json</code>{' '}
              no seu Google Drive e mesclar os registros salvos com os atendimentos atuais deste aparelho?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDownloadModal(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarDownloadDrive}
                className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Baixar e Mesclar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
