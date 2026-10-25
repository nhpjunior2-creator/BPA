import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken
} from './firebase';
import { Atendimento, UserProfile, SyncStatus, TabType } from './types';
import {
  loadLocalAtendimentos,
  saveLocalAtendimentos,
  loadLocalProcedimentos,
  saveLocalProcedimentos,
  loadLocalProfile,
  saveLocalProfile
} from './services/storageService';
import {
  saveAtendimentoToFirestore,
  deleteAtendimentoFromFirestore,
  getAtendimentosFromFirestore,
  batchSyncToFirestore,
  saveUserProfile,
  getUserProfile,
  saveProcedimentosFrequentes,
  getProcedimentosFrequentes
} from './services/firestoreService';
import { syncToGoogleDrive, downloadFromGoogleDrive } from './services/driveService';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NovoAtendimento } from './components/NovoAtendimento';
import { ListaAtendimentos } from './components/ListaAtendimentos';
import { EstatisticasView } from './components/EstatisticasView';
import { ConfiguracoesView } from './components/ConfiguracoesView';
import { InstallPrompt } from './components/InstallPrompt';
import { GitHubApkModal } from './components/GitHubApkModal';

export default function App() {
  // Current Navigation Tab
  const [currentTab, setCurrentTab] = useState<TabType>('novo');

  // Auth & User State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [perfil, setPerfil] = useState<UserProfile | null>(null);

  // Data State
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [frequentProcedimentos, setFrequentProcedimentos] = useState<string[]>([]);

  // Sync State
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'offline',
    message: 'Modo Local (Salvo no Aparelho)',
  });

  // Modal State
  const [isAndroidGuideOpen, setIsAndroidGuideOpen] = useState<boolean>(false);

  // Initialize Local Data on Mount
  useEffect(() => {
    const localAtends = loadLocalAtendimentos();
    setAtendimentos(localAtends);

    const localProcs = loadLocalProcedimentos();
    setFrequentProcedimentos(localProcs);

    const localProf = loadLocalProfile();
    if (localProf && localProf.uid) {
      setPerfil(localProf as UserProfile);
    }
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser) => {
        setUser(firebaseUser);
        const currentToken = await getAccessToken();
        setToken(currentToken);

        // Fetch user profile from Firestore or set defaults
        let loadedProfile = await getUserProfile(firebaseUser.uid);
        if (!loadedProfile) {
          loadedProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Enfermeiro(a)',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
          };
          await saveUserProfile(loadedProfile);
        }
        setPerfil(loadedProfile);
        saveLocalProfile(loadedProfile);

        // Fetch cloud attendances from Firestore
        const cloudAtends = await getAtendimentosFromFirestore(firebaseUser.uid);
        if (cloudAtends.length > 0) {
          // Merge local and cloud attendances avoiding duplicates
          setAtendimentos((prev) => {
            const map = new Map<string, Atendimento>();
            cloudAtends.forEach((a) => map.set(String(a.id), a));
            prev.forEach((a) => {
              if (!map.has(String(a.id))) {
                map.set(String(a.id), a);
              }
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => b.dataTimestamp - a.dataTimestamp
            );
            saveLocalAtendimentos(merged);
            return merged;
          });
        }

        // Fetch cloud frequent procedures
        const cloudProcs = await getProcedimentosFrequentes(firebaseUser.uid);
        if (cloudProcs.length > 0) {
          setFrequentProcedimentos((prev) => {
            const combined = Array.from(new Set([...cloudProcs, ...prev]));
            saveLocalProcedimentos(combined);
            return combined;
          });
        }

        // Update sync status
        if (currentToken) {
          setSyncStatus({
            state: 'synced',
            message: 'Sincronizado no Google Drive & Firebase',
          });
        } else {
          setSyncStatus({
            state: 'synced',
            message: 'Conectado ao Firebase',
          });
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setSyncStatus({
          state: 'offline',
          message: 'Modo Local (Salvo no Aparelho)',
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // Trigger Drive and Firestore Sync
  const performDriveSync = useCallback(
    async (accessTokenToUse?: string) => {
      const activeToken = accessTokenToUse || token || (await getAccessToken());
      if (!activeToken) {
        setSyncStatus({
          state: 'offline',
          message: 'Faça login com o Google para sincronizar no Drive',
        });
        return;
      }

      setSyncStatus({
        state: 'syncing',
        message: 'Sincronizando com o Google Drive...',
      });

      try {
        const result = await syncToGoogleDrive(activeToken, atendimentos, frequentProcedimentos);
        if (result.success) {
          setSyncStatus({
            state: 'synced',
            message: `Sincronizado no Google Drive (${result.syncedCount} reg.)`,
            lastSyncTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          });
        } else {
          setSyncStatus({
            state: 'error',
            message: 'Erro ao enviar para o Google Drive',
          });
        }
      } catch (err) {
        console.error('Drive sync failed:', err);
        setSyncStatus({
          state: 'error',
          message: 'Falha na conexão com Google Drive',
        });
      }
    },
    [token, atendimentos, frequentProcedimentos]
  );

  // Handle Login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setCachedAccessToken(result.accessToken);

        // Sync with Google Drive right after login
        if (result.accessToken) {
          await performDriveSync(result.accessToken);
        }
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      alert('Não foi possível concluir o login com o Google. O aplicativo continuará funcionando no modo local.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setSyncStatus({
        state: 'offline',
        message: 'Modo Local (Salvo no Aparelho)',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Save New Attendance
  const handleSalvarAtendimento = async (
    data: Omit<Atendimento, 'id' | 'userId' | 'dataTimestamp'>
  ) => {
    const timestamp = Date.now();
    const novo: Atendimento = {
      ...data,
      id: `bpa_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user?.uid || 'local_user',
      dataTimestamp: timestamp,
      syncedToFirestore: false,
      syncedToDrive: false,
    };

    // 1. Save locally immediately (offline-first)
    const updatedList = [novo, ...atendimentos];
    setAtendimentos(updatedList);
    saveLocalAtendimentos(updatedList);

    // 2. If user is logged in, sync to Firestore
    if (user) {
      saveAtendimentoToFirestore(user.uid, novo).catch((e) =>
        console.warn('Background Firestore save failed:', e)
      );
    }

    // 3. If token is present, sync to Google Drive
    const currentToken = token || (await getAccessToken());
    if (currentToken) {
      syncToGoogleDrive(currentToken, updatedList, frequentProcedimentos)
        .then((res) => {
          if (res.success) {
            setSyncStatus({
              state: 'synced',
              message: 'Sincronizado no Google Drive & Firebase',
              lastSyncTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            });
          }
        })
        .catch(() => {});
    }
  };

  // Delete an Attendance
  const handleExcluirAtendimento = async (id: string) => {
    const updatedList = atendimentos.filter((a) => a.id !== id);
    setAtendimentos(updatedList);
    saveLocalAtendimentos(updatedList);

    if (user) {
      await deleteAtendimentoFromFirestore(user.uid, id);
    }

    const currentToken = token || (await getAccessToken());
    if (currentToken) {
      syncToGoogleDrive(currentToken, updatedList, frequentProcedimentos).catch(() => {});
    }
  };

  // Clear all attendances
  const handleLimparTodos = async () => {
    setAtendimentos([]);
    saveLocalAtendimentos([]);

    const currentToken = token || (await getAccessToken());
    if (currentToken) {
      syncToGoogleDrive(currentToken, [], frequentProcedimentos).catch(() => {});
    }
  };

  // Add frequent procedure
  const handleAdicionarProcedimentoFrequente = (procedimento: string) => {
    const p = procedimento.trim();
    if (!p) return;
    if (!frequentProcedimentos.includes(p)) {
      const updated = [p, ...frequentProcedimentos];
      setFrequentProcedimentos(updated);
      saveLocalProcedimentos(updated);

      if (user) {
        saveProcedimentosFrequentes(user.uid, updated).catch(() => {});
      }
    }
  };

  // Save Profile Updates
  const handleSaveProfile = async (updates: Partial<UserProfile>) => {
    const newProfile: UserProfile = {
      uid: user?.uid || 'local_user',
      displayName: updates.displayName || perfil?.displayName || 'Enfermeiro(a)',
      email: updates.email || perfil?.email || user?.email || '',
      photoURL: user?.photoURL || perfil?.photoURL,
      coren: updates.coren,
      cns: updates.cns,
      unidadeSaude: updates.unidadeSaude,
    };
    setPerfil(newProfile);
    saveLocalProfile(newProfile);

    if (user) {
      await saveUserProfile(newProfile);
    }
  };

  // Download from Drive
  const handleDownloadDrive = async () => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      alert('Faça login com a conta Google para acessar o Google Drive.');
      return;
    }

    setSyncStatus({ state: 'syncing', message: 'Baixando do Google Drive...' });
    const driveData = await downloadFromGoogleDrive(currentToken);
    if (driveData && driveData.atendimentos) {
      // Merge with existing
      const map = new Map<string, Atendimento>();
      driveData.atendimentos.forEach((a) => map.set(String(a.id), a));
      atendimentos.forEach((a) => {
        if (!map.has(String(a.id))) {
          map.set(String(a.id), a);
        }
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => b.dataTimestamp - a.dataTimestamp
      );
      setAtendimentos(merged);
      saveLocalAtendimentos(merged);

      if (user) {
        await batchSyncToFirestore(user.uid, merged);
      }

      setSyncStatus({
        state: 'synced',
        message: `Dados do Google Drive sincronizados (${merged.length} reg.)`,
      });
      alert('Dados baixados do Google Drive e mesclados com sucesso!');
    } else {
      setSyncStatus({
        state: 'offline',
        message: 'Nenhum arquivo anterior encontrado no Drive',
      });
      alert('Nenhum arquivo de backup encontrado no Google Drive.');
    }
  };

  // Import Backup JSON
  const handleImportBackup = async (importedList: Atendimento[]) => {
    const map = new Map<string, Atendimento>();
    importedList.forEach((a) => map.set(String(a.id), a));
    atendimentos.forEach((a) => {
      if (!map.has(String(a.id))) {
        map.set(String(a.id), a);
      }
    });
    const merged = Array.from(map.values()).sort(
      (a, b) => b.dataTimestamp - a.dataTimestamp
    );
    setAtendimentos(merged);
    saveLocalAtendimentos(merged);

    if (user) {
      await batchSyncToFirestore(user.uid, merged);
    }

    const currentToken = token || (await getAccessToken());
    if (currentToken) {
      await syncToGoogleDrive(currentToken, merged, frequentProcedimentos);
    }
  };

  // Today's count
  const todayCount = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('pt-BR');
    return atendimentos.filter((a) => a.dataStr === todayStr).length;
  }, [atendimentos]);

  return (
    <div className="bg-slate-100 min-h-screen text-slate-800 flex justify-center pb-24 md:pb-6 select-text antialiased">
      {/* Mobile App Frame Container */}
      <div className="w-full max-w-md md:max-w-2xl min-h-screen bg-slate-50 flex flex-col shadow-2xl relative border-x border-slate-200">
        {/* Header Bar */}
        <Header
          user={user}
          syncStatus={syncStatus}
          isLoggingIn={isLoggingIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSyncNow={() => performDriveSync()}
          onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 overflow-y-auto">
          {/* PWA Android Install Banner */}
          <InstallPrompt />

          {/* Tab 1: Novo Atendimento */}
          {currentTab === 'novo' && (
            <NovoAtendimento
              frequentProcedimentos={frequentProcedimentos}
              onSalvarAtendimento={handleSalvarAtendimento}
              onAdicionarProcedimentoFrequente={handleAdicionarProcedimentoFrequente}
            />
          )}

          {/* Tab 2: Lista de Atendimentos */}
          {currentTab === 'atendimentos' && (
            <ListaAtendimentos
              atendimentos={atendimentos}
              perfil={perfil}
              onExcluirAtendimento={handleExcluirAtendimento}
              onLimparTodos={handleLimparTodos}
            />
          )}

          {/* Tab 3: Estatísticas e Produção BPA */}
          {currentTab === 'estatisticas' && (
            <EstatisticasView atendimentos={atendimentos} />
          )}

          {/* Tab 4: Configurações & Nuvem */}
          {currentTab === 'configuracoes' && (
            <ConfiguracoesView
              user={user}
              perfil={perfil}
              atendimentos={atendimentos}
              isLoggingIn={isLoggingIn}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onSyncDrive={() => performDriveSync()}
              onDownloadDrive={handleDownloadDrive}
              onSaveProfile={handleSaveProfile}
              onImportBackup={handleImportBackup}
              onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
            />
          )}
        </main>

        {/* Android Material Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          todayCount={todayCount}
        />
      </div>

      {/* GitHub & APK Compilation Guide Modal */}
      <GitHubApkModal
        isOpen={isAndroidGuideOpen}
        onClose={() => setIsAndroidGuideOpen(false)}
        appUrl={window.location.origin}
      />
    </div>
  );
}
