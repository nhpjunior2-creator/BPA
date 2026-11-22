import { Atendimento, UserProfile } from '../types';

const LEGACY_ATENDIMENTOS_KEY = 'bpa_atendimentos';
const STORAGE_KEY_ATENDIMENTOS_PREFIX = 'bpa_atendimentos_';
const STORAGE_KEY_PROCEDIMENTOS_PREFIX = 'bpa_procedimentos_historico_';
const LEGACY_PROCEDIMENTOS_KEY = 'bpa_procedimentos_historico';
const STORAGE_KEY_PROFILE_PREFIX = 'bpa_user_profile_';
const LEGACY_PROFILE_KEY = 'bpa_user_profile';

export const PROCEDIMENTOS_PADRAO: string[] = [
  'Aferição de Pressão Arterial',
  'Glicemia Capilar',
  'Curativo Simples / Grau 1',
  'Curativo Especial / Grau 2',
  'Administração de Medicamento IM',
  'Administração de Medicamento EV',
  'Administração de Medicamento VO',
  'Sondagem Vesical de Alívio',
  'Sondagem Vesical de Demora',
  'Retirada de Pontos',
  'Vacinação / Imunização',
  'Coleta de Citopatológico (Preventivo)',
  'Teste Rápido (HIV / Sífilis / Hepatites)',
  'Nebulização / Inalação',
  'Avaliação Antropométrica (Peso/Altura)'
];

function getAtendimentosKey(uid = 'local_user'): string {
  return `${STORAGE_KEY_ATENDIMENTOS_PREFIX}${uid}`;
}

function getProcedimentosKey(uid = 'local_user'): string {
  return `${STORAGE_KEY_PROCEDIMENTOS_PREFIX}${uid}`;
}

function getProfileKey(uid = 'local_user'): string {
  return `${STORAGE_KEY_PROFILE_PREFIX}${uid}`;
}

export function loadLocalAtendimentos(uid = 'local_user'): Atendimento[] {
  try {
    const scopedRaw = localStorage.getItem(getAtendimentosKey(uid));
    if (scopedRaw) {
      const parsed = JSON.parse(scopedRaw);
      if (Array.isArray(parsed)) return parsed;
    }

    // Fallback/migration from legacy global key only for local_user or matching userId
    if (uid === 'local_user') {
      const legacyRaw = localStorage.getItem(LEGACY_ATENDIMENTOS_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) {
          return parsed.filter((a: Atendimento) => !a.userId || a.userId === 'local_user');
        }
      }
    }
  } catch (e) {
    console.error('Error loading local atendimentos:', e);
  }
  return [];
}

export function saveLocalAtendimentos(list: Atendimento[], uid = 'local_user'): void {
  try {
    localStorage.setItem(getAtendimentosKey(uid), JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local atendimentos:', e);
  }
}

export function clearLocalDraftAtendimentos(): void {
  try {
    localStorage.removeItem(getAtendimentosKey('local_user'));
    localStorage.removeItem(LEGACY_ATENDIMENTOS_KEY);
  } catch (e) {
    console.error('Error clearing local draft atendimentos:', e);
  }
}

export function loadLocalProcedimentos(uid = 'local_user'): string[] {
  try {
    const raw =
      localStorage.getItem(getProcedimentosKey(uid)) ||
      localStorage.getItem(LEGACY_PROCEDIMENTOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading local procedimentos:', e);
  }
  return PROCEDIMENTOS_PADRAO;
}

export function saveLocalProcedimentos(list: string[], uid = 'local_user'): void {
  try {
    localStorage.setItem(getProcedimentosKey(uid), JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local procedimentos:', e);
  }
}

export function loadLocalProfile(uid = 'local_user'): Partial<UserProfile> | null {
  try {
    const raw =
      localStorage.getItem(getProfileKey(uid)) ||
      (uid === 'local_user' ? localStorage.getItem(LEGACY_PROFILE_KEY) : null);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading local profile:', e);
  }
  return null;
}

export function saveLocalProfile(profile: Partial<UserProfile>, uid = 'local_user'): void {
  try {
    localStorage.setItem(getProfileKey(uid), JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving local profile:', e);
  }
}
