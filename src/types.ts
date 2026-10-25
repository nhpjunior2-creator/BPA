export interface Atendimento {
  id: string;
  userId: string;
  docType: 'SUS' | 'CPF';
  documento: string;
  nome: string;
  dataNasc: string;
  raca: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  procedimentos: string[];
  observacoes?: string;
  dataStr: string;
  horaStr: string;
  dataHoraIso: string;
  dataTimestamp: number;
  syncedToDrive?: boolean;
  syncedToFirestore?: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  coren?: string;
  cns?: string;
  unidadeSaude?: string;
  updatedAt?: string;
}

export type SyncState = 'offline' | 'syncing' | 'synced' | 'error';

export type TabType = 'novo' | 'atendimentos' | 'estatisticas' | 'configuracoes';

export interface SyncStatus {
  state: SyncState;
  message: string;
  lastSyncTime?: string;
}
