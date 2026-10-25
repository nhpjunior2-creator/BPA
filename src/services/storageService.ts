import { Atendimento, UserProfile } from '../types';

const STORAGE_KEY_ATENDIMENTOS = 'bpa_atendimentos';
const STORAGE_KEY_PROCEDIMENTOS = 'bpa_procedimentos_historico';
const STORAGE_KEY_PROFILE = 'bpa_user_profile';

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

export function loadLocalAtendimentos(): Atendimento[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ATENDIMENTOS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading local atendimentos:', e);
  }
  return [];
}

export function saveLocalAtendimentos(list: Atendimento[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ATENDIMENTOS, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local atendimentos:', e);
  }
}

export function loadLocalProcedimentos(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROCEDIMENTOS);
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

export function saveLocalProcedimentos(list: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROCEDIMENTOS, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving local procedimentos:', e);
  }
}

export function loadLocalProfile(): Partial<UserProfile> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading local profile:', e);
  }
  return null;
}

export function saveLocalProfile(profile: Partial<UserProfile>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving local profile:', e);
  }
}
