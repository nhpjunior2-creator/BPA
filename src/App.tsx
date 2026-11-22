import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { HardDrive, AlertTriangle, CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  refreshDriveAccessToken,
  logout,
  getAccessToken,
  setCachedAccessToken,
  clearCachedAccessToken
} from './firebase';
import { Atendimento, UserProfile, SyncStatus, TabType } from './types';
import {
  loadLocalAtendimentos,
  saveLocalAtendimentos,
  clearLocalDraftAtendimentos,
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
  batchDeleteFromFirestore,
  saveUserProfile,
  getUserProfile,
  saveProcedimentosFrequentes,
  getProcedimentosFrequentes
} from './services/firestoreService';
import {
  findDriveFile,
  syncToGoogleDrive,
  downloadFromGoogleDrive,
  DriveFileInfo
} from './services/driveService';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { NovoAtendimento } from './components/NovoAtendimento';
import { ListaAtendimentos } from './components/ListaAtendimentos';
import { EstatisticasView } from './components/EstatisticasView';
import { ConfiguracoesView } from './components/ConfiguracoesView';
import { InstallPrompt } from './components/InstallPrompt';
import { GitHubApkModal } from './components/GitHubApkModal';

interface PendingDriveConfirm {
  mode: 'create' | 'update';
  fileName: string;
  recordCount: number;
  accessToken: string;
  atendimentosSnapshot: Atendimento[];
  procedimentosSnapshot: string[];
  knownFileId?: string | null;
}

interface AppToast {
  type: 'success' | 'error' | 'warning';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

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

  // Drive & Sync State
  const [driveFileInfo, setDriveFileInfo] = useState<DriveFileInfo | null>(null);
  const [driveLastSync, setDriveLastSync] = useState<string | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'offline',
    message: 'Modo Local (Salvo no Aparelho)',
  });

  // Confirmation & Feedback UI State
  const [pendingDriveConfirm, setPendingDriveConfirm] = useState<PendingDriveConfirm | null>(null);
  const [isExecutingDriveWrite, setIsExecutingDriveWrite] = useState<boolean>(false);
  const [appToast, setAppToast] = useState<AppToast | null>(null);

  // Modal State
  const [isAndroidGuideOpen, setIsAndroidGuideOpen] = useState<boolean>(false);

  const showToast = useCallback((toast: AppToast) => {
    setAppToast(toast);
  }, []);

  // Merge helper deduplicating by id and sorting descending by timestamp
  const mergeAtendimentos = useCallback(
    (primary: Atendimento[], secondary: Atendimento[], targetUid: string): Atendimento[] => {
      const map = new Map<string, Atendimento>();
      primary.forEach((a) => {
        map.set(String(a.id), { ...a, userId: targetUid });
      });
      secondary.forEach((a) => {
        if (!map.has(String(a.id))) {
          map.set(String(a.id), { ...a, userId: targetUid });
        }
      });
      return Array.from(map.values()).sort((a, b) => b.dataTimestamp - a.dataTimestamp);
    },
    []
  );

  // Initialize Local Data on Mount (guest / offline state)
  useEffect(() => {
    setAtendimentos(loadLocalAtendimentos('local_user'));
    setFrequentProcedimentos(loadLocalProcedimentos('local_user'));
    const localProf = loadLocalProfile('local_user');
    if (localProf && localProf.uid) {
      setPerfil(localProf as UserProfile);
    }
  }, []);

  // Hydrate and merge data for an authenticated user (Firestore + Scoped Local + Drafts)
  const loadAuthenticatedUserData = useCallback(
    async (firebaseUser: User): Promise<{ mergedAtends: Atendimento[]; mergedProcs: string[] }> => {
      const uid = firebaseUser.uid;

      // 1. Load Profile
      let loadedProfile = await getUserProfile(uid);
      if (!loadedProfile) {
        loadedProfile = {
          uid,
          displayName: firebaseUser.displayName || 'Enfermeiro(a)',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
        };
        await saveUserProfile(loadedProfile);
      }
      setPerfil(loadedProfile);
      saveLocalProfile(loadedProfile, uid);

      // 2. Load Firestore + User's Scoped Local Cache + Any Unclaimed Offline Drafts
      const [cloudAtends, cloudProcs] = await Promise.all([
        getAtendimentosFromFirestore(uid),
        getProcedimentosFrequentes(uid),
      ]);
      const scopedLocal = loadLocalAtendimentos(uid);
      const localDrafts = loadLocalAtendimentos('local_user').filter(
        (a) => !a.userId || a.userId === 'local_user'
      );

      const mergedAtends = mergeAtendimentos(
        cloudAtends,
        [...scopedLocal, ...localDrafts],
        uid
      );

      setAtendimentos(mergedAtends);
      saveLocalAtendimentos(mergedAtends, uid);

      // Push any offline-only / draft records up to Firestore
      const cloudIds = new Set(cloudAtends.map((a) => String(a.id)));
      const unsyncedToFirestore = mergedAtends.filter((a) => !cloudIds.has(String(a.id)));
      if (unsyncedToFirestore.length > 0) {
        await batchSyncToFirestore(uid, unsyncedToFirestore);
      }
      if (localDrafts.length > 0) {
        clearLocalDraftAtendimentos();
      }

      // 3. Merge Procedures
      const localProcs = loadLocalProcedimentos(uid);
      const mergedProcs = Array.from(new Set([...cloudProcs, ...localProcs]));
      setFrequentProcedimentos(mergedProcs);
      saveLocalProcedimentos(mergedProcs, uid);
      if (cloudProcs.length === 0 && mergedProcs.length > 0) {
        saveProcedimentosFrequentes(uid, mergedProcs).catch(() => {});
      }

      return { mergedAtends, mergedProcs };
    },
    [mergeAtendimentos]
  );

  // Non-destructive read & merge from Google Drive upon authentication
  const syncFromDriveReadOnly = useCallback(
    async (
      accessToken: string,
      firebaseUser: User,
      currentAtends: Atendimento[],
      currentProcs: string[]
    ): Promise<{
      mergedAtends: Atendimento[];
      mergedProcs: string[];
      existingFile: DriveFileInfo | null;
      hasLocalDifferences: boolean;
    } | null> => {
      setSyncStatus({
        state: 'syncing',
        message: 'Verificando backup no Google Drive...',
      });

      const downloadRes = await downloadFromGoogleDrive(accessToken);

      if (downloadRes.authError) {
        clearCachedAccessToken();
        setToken(null);
        setSyncStatus({
          state: 'error',
          message:
            downloadRes.authError === 'insufficient_scope'
              ? 'Autorize o Google Drive na janela de login'
              : 'Sessão do Drive expirada. Reconecte.',
        });
        showToast({
          type: 'warning',
          message:
            downloadRes.authError === 'insufficient_scope'
              ? 'A permissão do Google Drive não foi marcada no login. Toque em "Autorizar" para habilitar a sincronização.'
              : 'Sua autorização do Google Drive expirou. Reconecte para sincronizar.',
          actionLabel: 'Autorizar Drive',
          onAction: () => handleReconnectDrive(true),
        });
        return null;
      }

      if (downloadRes.error && !downloadRes.found) {
        setSyncStatus({
          state: 'error',
          message: 'Erro ao consultar o Google Drive',
        });
        return null;
      }

      const driveAtends = downloadRes.atendimentos || [];
      const driveProcs = downloadRes.procedimentosFrequentes || [];

      const mergedAtends = mergeAtendimentos(currentAtends, driveAtends, firebaseUser.uid);
      const mergedProcs = Array.from(new Set([...currentProcs, ...driveProcs]));

      // Persist merged set locally & in Firestore
      setAtendimentos(mergedAtends);
      saveLocalAtendimentos(mergedAtends, firebaseUser.uid);
      setFrequentProcedimentos(mergedProcs);
      saveLocalProcedimentos(mergedProcs, firebaseUser.uid);

      const currentIds = new Set(currentAtends.map((a) => String(a.id)));
      const newFromDrive = mergedAtends.filter((a) => !currentIds.has(String(a.id)));
      if (newFromDrive.length > 0) {
        await batchSyncToFirestore(firebaseUser.uid, newFromDrive);
      }

      const driveIds = new Set(driveAtends.map((a) => String(a.id)));
      const hasLocalDifferences =
        mergedAtends.length !== driveAtends.length ||
        mergedAtends.some((a) => !driveIds.has(String(a.id)));

      if (downloadRes.fileInfo) {
        setDriveFileInfo(downloadRes.fileInfo);
      }

      if (!hasLocalDifferences && downloadRes.found) {
        const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setDriveLastSync(nowStr);
        setSyncStatus({
          state: 'synced',
          message: `Sincronizado no Google Drive (${mergedAtends.length} reg.)`,
          lastSyncTime: nowStr,
        });
      } else {
        setSyncStatus({
          state: 'synced',
          message: downloadRes.found
            ? 'Dados baixados do Drive • Pronto para atualizar'
            : 'Drive conectado • Pronto para criar backup',
        });
      }

      return {
        mergedAtends,
        mergedProcs,
        existingFile: downloadRes.fileInfo || null,
        hasLocalDifferences,
      };
    },
    [mergeAtendimentos, showToast]
  );

  // Listen to Firebase Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, memToken) => {
        setUser(firebaseUser);
        setToken(memToken);

        await loadAuthenticatedUserData(firebaseUser);

        if (memToken) {
          setSyncStatus({
            state: 'synced',
            message: 'Conectado ao Google Drive & Firebase',
          });
        } else {
          setSyncStatus({
            state: 'synced',
            message: 'Firebase conectado • Conecte o Drive para backup',
          });
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setDriveFileInfo(null);
        setDriveLastSync(undefined);
        setAtendimentos(loadLocalAtendimentos('local_user'));
        setFrequentProcedimentos(loadLocalProcedimentos('local_user'));
        const localProf = loadLocalProfile('local_user');
        setPerfil(localProf && localProf.uid ? (localProf as UserProfile) : null);
        setSyncStatus({
          state: 'offline',
          message: 'Modo Local (Salvo no Aparelho)',
        });
      }
    );

    return () => unsubscribe();
  }, [loadAuthenticatedUserData]);

  // Execute Drive write after explicit user confirmation
  const executeConfirmedDriveWrite = async () => {
    if (!pendingDriveConfirm) return;
    setIsExecutingDriveWrite(true);
    setSyncStatus({
      state: 'syncing',
      message: 'Enviando backup para o Google Drive...',
    });

    try {
      const res = await syncToGoogleDrive(
        pendingDriveConfirm.accessToken,
        pendingDriveConfirm.atendimentosSnapshot,
        pendingDriveConfirm.procedimentosSnapshot,
        pendingDriveConfirm.knownFileId
      );

      if (res.authError) {
        clearCachedAccessToken();
        setToken(null);
        setPendingDriveConfirm(null);
        setSyncStatus({
          state: 'error',
          message:
            res.authError === 'insufficient_scope'
              ? 'Permissão do Drive necessária'
              : 'Sessão do Drive expirada',
        });
        showToast({
          type: 'warning',
          message:
            res.authError === 'insufficient_scope'
              ? 'Permissão de escrita no Google Drive não concedida. Autorize novamente marcando a caixa do Google Drive.'
              : 'Sua sessão do Google Drive expirou. Reconecte sua conta para sincronizar.',
          actionLabel: 'Autorizar Drive',
          onAction: () => handleReconnectDrive(true),
        });
        return;
      }

      if (res.success) {
        if (res.fileId) {
          setDriveFileInfo({
            id: res.fileId,
            name: pendingDriveConfirm.fileName,
            modifiedTime: res.modifiedTime,
          });
        }
        const nowStr = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setDriveLastSync(nowStr);
        setSyncStatus({
          state: 'synced',
          message: `Sincronizado no Google Drive (${res.syncedCount} reg.)`,
          lastSyncTime: nowStr,
        });
        showToast({
          type: 'success',
          message: `Backup sincronizado com sucesso no Google Drive (${res.syncedCount} registro(s)).`,
        });
      } else {
        setSyncStatus({
          state: 'error',
          message: 'Erro ao sincronizar no Google Drive',
        });
        showToast({
          type: 'error',
          message: `Falha ao enviar para o Google Drive: ${res.error || 'erro desconhecido'}`,
        });
      }
    } finally {
      setIsExecutingDriveWrite(false);
      setPendingDriveConfirm(null);
    }
  };

  // Prepare Drive write (checks existence and asks explicit confirmation before mutating user Drive file)
  const requestDriveSync = useCallback(
    async (
      overrideToken?: string,
      overrideAtends?: Atendimento[],
      overrideProcs?: string[]
    ) => {
      const activeToken = overrideToken || token || (await getAccessToken());
      if (!activeToken) {
        if (user) {
          showToast({
            type: 'warning',
            message: 'Conecte sua conta ao Google Drive para enviar os dados.',
            actionLabel: 'Conectar Drive',
            onAction: () => handleReconnectDrive(false),
          });
        } else {
          showToast({
            type: 'warning',
            message: 'Entre com sua conta Google para sincronizar com o Google Drive.',
            actionLabel: 'Entrar com Google',
            onAction: () => handleLogin(),
          });
        }
        return;
      }

      const listToSync = overrideAtends ?? atendimentos;
      const procsToSync = overrideProcs ?? frequentProcedimentos;

      try {
        let knownFile = driveFileInfo;
        if (!knownFile) {
          const searchRes = await findDriveFile(activeToken);
          if (searchRes.authError) {
            clearCachedAccessToken();
            setToken(null);
            showToast({
              type: 'warning',
              message:
                searchRes.authError === 'insufficient_scope'
                  ? 'Permissão do Google Drive não concedida. Autorize novamente.'
                  : 'Sessão do Google Drive expirada. Reconecte para continuar.',
              actionLabel: 'Autorizar Drive',
              onAction: () => handleReconnectDrive(true),
            });
            return;
          }
          knownFile = searchRes.file;
          if (knownFile) setDriveFileInfo(knownFile);
        }

        setPendingDriveConfirm({
          mode: knownFile ? 'update' : 'create',
          fileName: 'atendimentos_bpa_drive.json',
          recordCount: listToSync.length,
          accessToken: activeToken,
          atendimentosSnapshot: listToSync,
          procedimentosSnapshot: procsToSync,
          knownFileId: knownFile?.id || null,
        });
      } catch (err) {
        console.error('Error preparing Drive sync:', err);
        showToast({
          type: 'error',
          message: 'Não foi possível verificar o Google Drive. Tente novamente.',
        });
      }
    },
    [token, user, atendimentos, frequentProcedimentos, driveFileInfo, showToast]
  );

  // Reconnect Google Drive for already logged-in Firebase user
  const handleReconnectDrive = async (forceConsent = false) => {
    setIsLoggingIn(true);
    try {
      const result = await refreshDriveAccessToken(forceConsent);
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setCachedAccessToken(result.accessToken);

        if (!result.accessToken) {
          showToast({
            type: 'warning',
            message:
              'Login concluído, mas o token do Google Drive não foi retornado. Tente autorizar novamente.',
            actionLabel: 'Tentar Novamente',
            onAction: () => handleReconnectDrive(true),
          });
          return;
        }

        const { mergedAtends, mergedProcs } = await loadAuthenticatedUserData(result.user);
        const driveState = await syncFromDriveReadOnly(
          result.accessToken,
          result.user,
          mergedAtends,
          mergedProcs
        );

        if (driveState && (driveState.hasLocalDifferences || !driveState.existingFile)) {
          setPendingDriveConfirm({
            mode: driveState.existingFile ? 'update' : 'create',
            fileName: 'atendimentos_bpa_drive.json',
            recordCount: driveState.mergedAtends.length,
            accessToken: result.accessToken,
            atendimentosSnapshot: driveState.mergedAtends,
            procedimentosSnapshot: driveState.mergedProcs,
            knownFileId: driveState.existingFile?.id || null,
          });
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error('Drive reconnect error:', err);
      showToast({
        type: 'error',
        message:
          code === 'auth/popup-blocked'
            ? 'O navegador bloqueou a janela de login do Google. Permita popups para este site.'
            : 'Não foi possível reconectar ao Google Drive. Tente novamente.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Google Sign-In (for any Google account)
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn(false);
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setCachedAccessToken(result.accessToken);

        const { mergedAtends, mergedProcs } = await loadAuthenticatedUserData(result.user);

        if (result.accessToken) {
          const driveState = await syncFromDriveReadOnly(
            result.accessToken,
            result.user,
            mergedAtends,
            mergedProcs
          );

          if (driveState && (driveState.hasLocalDifferences || !driveState.existingFile)) {
            setPendingDriveConfirm({
              mode: driveState.existingFile ? 'update' : 'create',
              fileName: 'atendimentos_bpa_drive.json',
              recordCount: driveState.mergedAtends.length,
              accessToken: result.accessToken,
              atendimentosSnapshot: driveState.mergedAtends,
              procedimentosSnapshot: driveState.mergedProcs,
              knownFileId: driveState.existingFile?.id || null,
            });
          }
        } else {
          setSyncStatus({
            state: 'synced',
            message: 'Firebase conectado • Autorize o Google Drive',
          });
          showToast({
            type: 'warning',
            message:
              'Conta Google conectada! Clique em "Autorizar Drive" para liberar o backup no Google Drive.',
            actionLabel: 'Autorizar Drive',
            onAction: () => handleReconnectDrive(true),
          });
        }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error('Login error:', err);
      showToast({
        type: 'error',
        message:
          code === 'auth/popup-blocked'
            ? 'O navegador bloqueou a janela de login. Habilite popups e tente novamente.'
            : 'Não foi possível concluir o login com o Google. O modo local continua ativo.',
      });
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
      setDriveFileInfo(null);
      setDriveLastSync(undefined);
      setPendingDriveConfirm(null);
      setAtendimentos(loadLocalAtendimentos('local_user'));
      setFrequentProcedimentos(loadLocalProcedimentos('local_user'));
      const localProf = loadLocalProfile('local_user');
      setPerfil(localProf && localProf.uid ? (localProf as UserProfile) : null);
      setSyncStatus({
        state: 'offline',
        message: 'Modo Local (Salvo no Aparelho)',
      });
      showToast({
        type: 'success',
        message: 'Sessão encerrada com segurança.',
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
    const targetUid = user?.uid || 'local_user';
    const novo: Atendimento = {
      ...data,
      id: `bpa_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUid,
      dataTimestamp: timestamp,
      syncedToFirestore: false,
      syncedToDrive: false,
    };

    // 1. Save locally immediately (offline-first, scoped by uid)
    const updatedList = [novo, ...atendimentos];
    setAtendimentos(updatedList);
    saveLocalAtendimentos(updatedList, targetUid);

    // 2. If user is logged in, sync to Firestore
    if (user) {
      saveAtendimentoToFirestore(user.uid, novo).catch((e) =>
        console.warn('Background Firestore save failed:', e)
      );
    }

    // 3. Offer one-tap Google Drive backup update if connected
    const currentToken = token || (await getAccessToken());
    if (currentToken) {
      setSyncStatus({
        state: 'synced',
        message: 'Salvo no Firebase • Atualize o Google Drive',
      });
      showToast({
        type: 'success',
        message: 'Atendimento salvo no dispositivo e no Firebase!',
        actionLabel: 'Atualizar Drive',
        onAction: () => requestDriveSync(currentToken, updatedList, frequentProcedimentos),
      });
    }
  };

  // Delete an Attendance
  const handleExcluirAtendimento = async (id: string) => {
    const targetUid = user?.uid || 'local_user';
    const updatedList = atendimentos.filter((a) => a.id !== id);
    setAtendimentos(updatedList);
    saveLocalAtendimentos(updatedList, targetUid);

    if (user) {
      await deleteAtendimentoFromFirestore(user.uid, id);
    }

    const currentToken = token || (await getAccessToken());
    if (currentToken) {
      showToast({
        type: 'warning',
        message: 'Atendimento excluído. Deseja atualizar o arquivo no Google Drive?',
        actionLabel: 'Atualizar Drive',
        onAction: () => requestDriveSync(currentToken, updatedList, frequentProcedimentos),
      });
    }
  };

  // Clear all attendances
  const handleLimparTodos = async () => {
    const targetUid = user?.uid || 'local_user';
    const idsToDelete = atendimentos.map((a) => String(a.id));
    setAtendimentos([]);
    saveLocalAtendimentos([], targetUid);

    if (user && idsToDelete.length > 0) {
      await batchDeleteFromFirestore(user.uid, idsToDelete);
    }

    const currentToken = token || (await getAccessToken());
    if (currentToken) {
      showToast({
        type: 'warning',
        message: 'Registros locais e do Firebase apagados. Atualize o Google Drive se desejar.',
        actionLabel: 'Atualizar Drive',
        onAction: () => requestDriveSync(currentToken, [], frequentProcedimentos),
      });
    }
  };

  // Add frequent procedure
  const handleAdicionarProcedimentoFrequente = (procedimento: string) => {
    const p = procedimento.trim();
    if (!p) return;
    const targetUid = user?.uid || 'local_user';
    if (!frequentProcedimentos.includes(p)) {
      const updated = [p, ...frequentProcedimentos];
      setFrequentProcedimentos(updated);
      saveLocalProcedimentos(updated, targetUid);

      if (user) {
        saveProcedimentosFrequentes(user.uid, updated).catch(() => {});
      }
    }
  };

  // Save Profile Updates
  const handleSaveProfile = async (updates: Partial<UserProfile>) => {
    const targetUid = user?.uid || 'local_user';
    const newProfile: UserProfile = {
      uid: targetUid,
      displayName: updates.displayName || perfil?.displayName || 'Enfermeiro(a)',
      email: updates.email || perfil?.email || user?.email || '',
      photoURL: user?.photoURL || perfil?.photoURL,
      coren: updates.coren,
      cns: updates.cns,
      unidadeSaude: updates.unidadeSaude,
    };
    setPerfil(newProfile);
    saveLocalProfile(newProfile, targetUid);

    if (user) {
      await saveUserProfile(newProfile);
    }
  };

  // Download from Drive (triggered from Settings)
  const handleDownloadDrive = async () => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken || !user) {
      showToast({
        type: 'warning',
        message: 'Conecte sua conta Google Drive primeiro para baixar os dados.',
        actionLabel: 'Conectar Drive',
        onAction: () => handleReconnectDrive(false),
      });
      return;
    }

    const result = await syncFromDriveReadOnly(
      currentToken,
      user,
      atendimentos,
      frequentProcedimentos
    );

    if (!result) return;

    if (result.existingFile) {
      showToast({
        type: 'success',
        message: `Dados do Google Drive mesclados com sucesso (${result.mergedAtends.length} registro(s)).`,
      });
    } else {
      showToast({
        type: 'warning',
        message: 'Nenhum backup anterior encontrado no seu Google Drive.',
      });
    }
  };

  // Import Backup JSON
  const handleImportBackup = async (importedList: Atendimento[]) => {
    const targetUid = user?.uid || 'local_user';
    const merged = mergeAtendimentos(atendimentos, importedList, targetUid);
    setAtendimentos(merged);
    saveLocalAtendimentos(merged, targetUid);

    if (user) {
      await batchSyncToFirestore(user.uid, merged);
    }

    const currentToken = token || (await getAccessToken());
    if (currentToken) {
      requestDriveSync(currentToken, merged, frequentProcedimentos);
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
          hasDriveToken={Boolean(token)}
          syncStatus={syncStatus}
          isLoggingIn={isLoggingIn}
          onLogin={handleLogin}
          onReconnectDrive={() => handleReconnectDrive(false)}
          onLogout={handleLogout}
          onSyncNow={() => requestDriveSync()}
          onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
        />

        {/* Global App Toast Banner */}
        {appToast && (
          <div className="px-4 pt-3">
            <div
              className={`p-3 rounded-2xl text-xs border shadow-sm flex items-center justify-between gap-2 ${
                appToast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : appToast.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {appToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : appToast.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="leading-snug">{appToast.message}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {appToast.actionLabel && appToast.onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      const fn = appToast.onAction;
                      setAppToast(null);
                      fn?.();
                    }}
                    className="bg-white border border-current/25 font-bold text-[11px] px-2.5 py-1 rounded-lg shadow-xs hover:opacity-90 transition cursor-pointer"
                  >
                    {appToast.actionLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAppToast(null)}
                  className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
                  aria-label="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

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
              hasDriveToken={Boolean(token)}
              driveLastSync={driveLastSync}
              perfil={perfil}
              atendimentos={atendimentos}
              isLoggingIn={isLoggingIn}
              onLogin={handleLogin}
              onReconnectDrive={handleReconnectDrive}
              onLogout={handleLogout}
              onSyncDrive={() => requestDriveSync()}
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

      {/* Explicit Confirmation Modal for Writing/Updating Google Drive File */}
      {pendingDriveConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 text-teal-700">
              <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                {pendingDriveConfirm.mode === 'update'
                  ? 'Atualizar Backup no Google Drive?'
                  : 'Criar Backup no Google Drive?'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {pendingDriveConfirm.mode === 'update' ? (
                <>
                  O arquivo <code className="text-teal-700 font-semibold">{pendingDriveConfirm.fileName}</code>{' '}
                  no seu Google Drive será atualizado com{' '}
                  <strong className="text-slate-800">{pendingDriveConfirm.recordCount} atendimento(s)</strong>{' '}
                  mesclado(s).
                </>
              ) : (
                <>
                  Será criado o arquivo{' '}
                  <code className="text-teal-700 font-semibold">{pendingDriveConfirm.fileName}</code> no seu
                  Google Drive contendo{' '}
                  <strong className="text-slate-800">{pendingDriveConfirm.recordCount} atendimento(s)</strong>.
                </>
              )}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDriveConfirm(null)}
                disabled={isExecutingDriveWrite}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeConfirmedDriveWrite}
                disabled={isExecutingDriveWrite}
                className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isExecutingDriveWrite ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <span>Confirmar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub & APK Compilation Guide Modal */}
      <GitHubApkModal
        isOpen={isAndroidGuideOpen}
        onClose={() => setIsAndroidGuideOpen(false)}
        appUrl={window.location.origin}
      />
    </div>
  );
}
