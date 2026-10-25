import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Atendimento, UserProfile } from '../types';

export async function saveAtendimentoToFirestore(
  userId: string,
  atendimento: Atendimento
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'atendimentos', String(atendimento.id));
  await setDoc(docRef, {
    ...atendimento,
    userId,
    syncedToFirestore: true,
  });
}

export async function deleteAtendimentoFromFirestore(
  userId: string,
  atendimentoId: string
): Promise<void> {
  const docRef = doc(db, 'users', userId, 'atendimentos', String(atendimentoId));
  await deleteDoc(docRef);
}

export async function getAtendimentosFromFirestore(
  userId: string
): Promise<Atendimento[]> {
  try {
    const colRef = collection(db, 'users', userId, 'atendimentos');
    const q = query(colRef, orderBy('dataTimestamp', 'desc'));
    const snapshot = await getDocs(q);
    const list: Atendimento[] = [];
    snapshot.forEach((snap) => {
      list.push(snap.data() as Atendimento);
    });
    return list;
  } catch (err) {
    console.warn('Error fetching atendimentos from Firestore:', err);
    return [];
  }
}

export async function saveProcedimentosFrequentes(
  userId: string,
  procedimentos: string[]
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'config', 'procedimentos');
    await setDoc(docRef, {
      procedimentos,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error saving procedimentos config:', err);
  }
}

export async function getProcedimentosFrequentes(
  userId: string
): Promise<string[]> {
  try {
    const docRef = doc(db, 'users', userId, 'config', 'procedimentos');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data.procedimentos as string[]) || [];
    }
  } catch (err) {
    console.warn('Error getting procedimentos config:', err);
  }
  return [];
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, {
      ...profile,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Error saving user profile:', err);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.warn('Error getting user profile:', err);
  }
  return null;
}

export async function batchSyncToFirestore(
  userId: string,
  atendimentos: Atendimento[]
): Promise<void> {
  const batch = writeBatch(db);
  atendimentos.forEach((atend) => {
    const ref = doc(db, 'users', userId, 'atendimentos', String(atend.id));
    batch.set(ref, {
      ...atend,
      userId,
      syncedToFirestore: true,
    });
  });
  await batch.commit();
}
