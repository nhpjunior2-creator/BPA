import React, { useState } from 'react';
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
  LogIn,
  LogOut,
  Shield,
  FileCheck
} from 'lucide-react';
import { UserProfile, Atendimento } from '../types';
import { exportarJsonBackup } from '../services/pdfService';

interface ConfiguracoesViewProps {
  user: User | null;
  perfil: UserProfile | null;
  atendimentos: Atendimento[];
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onSyncDrive: () => Promise<void>;
  onDownloadDrive: () => Promise<void>;
  onSaveProfile: (profile: Partial<UserProfile>) => Promise<void>;
  onImportBackup: (importedList: Atendimento[]) => Promise<void>;
  onOpenAndroidGuide: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  user,
  perfil,
  atendimentos,
  isLoggingIn,
  onLogin,
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
  const [profileSavedMsg, setProfileSavedMsg] = useState<string>('');

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

  const handleDriveDownloadClick = async () => {
    if (!confirm('Deseja baixar e mesclar os dados armazenados no Google Drive?')) return;
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
          alert('Nenhum atendimento válido encontrado no arquivo JSON selecionado.');
          return;
        }

        await onImportBackup(list);
        alert(`${list.length} atendimentos importados com sucesso!`);
      } catch (err) {
        alert('Falha ao processar o arquivo JSON de backup.');
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
          <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuário'}
                  className="w-11 h-11 rounded-full border-2 border-teal-400 object-cover"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-teal-600 flex items-center justify-center text-white">
                  <UserCheck className="w-6 h-6" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{user.displayName}</h4>
                <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-teal-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Conectado com Google Drive & Firebase</span>
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold py-1.5 px-3 rounded-xl transition flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-3">
            <p className="text-xs text-slate-600">
              Faça login com sua conta Google para sincronizar os dados no Google Drive e no Firebase em nuvem.
            </p>
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md inline-flex items-center gap-2 transition active:scale-95 disabled:opacity-75 cursor-pointer"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>Entrar com Conta Google</span>
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
            <p className="text-[11px] text-slate-500">Status: Sincronização automática ativa</p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span>Firebase Firestore</span>
            </div>
            <p className="text-[11px] text-slate-500">Coleção: /users/{user?.uid ? 'meu-usuario' : '...'}/atendimentos</p>
            <p className="text-[11px] text-slate-500">Segurança: Zero-Trust ABAC</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleDriveSyncClick}
            disabled={isSyncingDrive || !user}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>Sincronizar Agora com Google Drive</span>
          </button>

          <button
            onClick={handleDriveDownloadClick}
            disabled={isDownloadingDrive || !user}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl border border-slate-300 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
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

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => exportarJsonBackup(atendimentos)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl border border-slate-300 transition flex items-center justify-center gap-1.5"
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
    </section>
  );
};
