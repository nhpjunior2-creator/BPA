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
import { auth, db } from '../firebase';
import { Atendimento, UserProfile } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function isPermissionDeniedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes('permission') || msg.includes('insufficient');
}

export async function saveAtendimentoToFirestore(
  userId: string,
  atendimento: Atendimento
): Promise<void> {
  const path = `users/${userId}/atendimentos/${atendimento.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'atendimentos', String(atendimento.id));
    await setDoc(docRef, {
      ...atendimento,
      userId,
      syncedToFirestore: true,
    });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    throw err;
  }
}

export async function deleteAtendimentoFromFirestore(
  userId: string,
  atendimentoId: string
): Promise<void> {
  const path = `users/${userId}/atendimentos/${atendimentoId}`;
  try {
    const docRef = doc(db, 'users', userId, 'atendimentos', String(atendimentoId));
    await deleteDoc(docRef);
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
    throw err;
  }
}

export async function getAtendimentosFromFirestore(
  userId: string
): Promise<Atendimento[]> {
  const path = `users/${userId}/atendimentos`;
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
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
    console.warn('Error fetching atendimentos from Firestore:', err);
    return [];
  }
}

export async function saveProcedimentosFrequentes(
  userId: string,
  procedimentos: string[]
): Promise<void> {
  const path = `users/${userId}/config/procedimentos`;
  try {
    const docRef = doc(db, 'users', userId, 'config', 'procedimentos');
    await setDoc(docRef, {
      procedimentos,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    console.warn('Error saving procedimentos config:', err);
  }
}

export async function getProcedimentosFrequentes(
  userId: string
): Promise<string[]> {
  const path = `users/${userId}/config/procedimentos`;
  try {
    const docRef = doc(db, 'users', userId, 'config', 'procedimentos');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data.procedimentos as string[]) || [];
    }
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.GET, path);
    }
    console.warn('Error getting procedimentos config:', err);
  }
  return [];
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(
      userRef,
      {
        ...profile,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    console.warn('Error saving user profile:', err);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.GET, path);
    }
    console.warn('Error getting user profile:', err);
  }
  return null;
}

export async function batchSyncToFirestore(
  userId: string,
  atendimentos: Atendimento[]
): Promise<void> {
  const path = `users/${userId}/atendimentos`;
  try {
    const chunkSize = 450;
    for (let i = 0; i < atendimentos.length; i += chunkSize) {
      const chunk = atendimentos.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((atend) => {
        const ref = doc(db, 'users', userId, 'atendimentos', String(atend.id));
        batch.set(ref, {
          ...atend,
          userId,
          syncedToFirestore: true,
        });
      });
      await batch.commit();
    }
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    throw err;
  }
}

export async function batchDeleteFromFirestore(
  userId: string,
  atendimentoIds: string[]
): Promise<void> {
  const path = `users/${userId}/atendimentos`;
  try {
    const chunkSize = 450;
    for (let i = 0; i < atendimentoIds.length; i += chunkSize) {
      const chunk = atendimentoIds.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const ref = doc(db, 'users', userId, 'atendimentos', String(id));
        batch.delete(ref);
      });
      await batch.commit();
    }
  } catch (err) {
    if (isPermissionDeniedError(err)) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
    throw err;
  }
}
