import { Atendimento } from '../types';

export const DRIVE_FILENAME = 'atendimentos_bpa_drive.json';

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface DriveSyncResult {
  success: boolean;
  fileId?: string;
  syncedCount: number;
  modifiedTime?: string;
  authError?: 'expired' | 'insufficient_scope';
  error?: string;
}

export interface DriveDownloadResult {
  found: boolean;
  fileInfo?: DriveFileInfo;
  atendimentos: Atendimento[];
  procedimentosFrequentes?: string[];
  authError?: 'expired' | 'insufficient_scope';
  error?: string;
}

function classifyDriveHttpError(status: number): 'expired' | 'insufficient_scope' | undefined {
  if (status === 401) return 'expired';
  if (status === 403) return 'insufficient_scope';
  return undefined;
}

/**
 * Searches for existing BPA backup file in the user's Google Drive
 */
export async function findDriveFile(accessToken: string): Promise<{
  file: DriveFileInfo | null;
  authError?: 'expired' | 'insufficient_scope';
}> {
  const q = encodeURIComponent(`name = '${DRIVE_FILENAME}' and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const authError = classifyDriveHttpError(res.status);
    if (authError) {
      return { file: null, authError };
    }
    throw new Error(`Drive search failed with status ${res.status}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return { file: data.files[0] as DriveFileInfo };
  }
  return { file: null };
}

/**
 * Synchronizes the list of attendances to Google Drive file
 */
export async function syncToGoogleDrive(
  accessToken: string,
  atendimentos: Atendimento[],
  procedimentosFrequentes: string[],
  knownFileId?: string | null
): Promise<DriveSyncResult> {
  try {
    let fileId = knownFileId || null;

    if (!fileId) {
      const searchResult = await findDriveFile(accessToken);
      if (searchResult.authError) {
        return {
          success: false,
          syncedCount: 0,
          authError: searchResult.authError,
          error:
            searchResult.authError === 'expired'
              ? 'Sessão do Google Drive expirada. Reconecte sua conta.'
              : 'Permissão de acesso ao Google Drive não concedida.',
        };
      }
      fileId = searchResult.file?.id || null;
    }

    const payload = {
      app: 'Coleta Enfermagem BPA',
      versao: '2.0.0',
      ultimaAtualizacao: new Date().toISOString(),
      totalRegistros: atendimentos.length,
      procedimentosFrequentes,
      atendimentos,
    };

    const fileContent = JSON.stringify(payload, null, 2);

    if (fileId) {
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,modifiedTime`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        }
      );

      if (!updateRes.ok) {
        const authError = classifyDriveHttpError(updateRes.status);
        if (authError) {
          return {
            success: false,
            syncedCount: 0,
            authError,
            error:
              authError === 'expired'
                ? 'Sessão do Google Drive expirada. Reconecte sua conta.'
                : 'Permissão de acesso ao Google Drive não concedida.',
          };
        }
        // If file was deleted externally on Drive (404), recreate it below
        if (updateRes.status !== 404) {
          throw new Error(`Update failed with HTTP ${updateRes.status}`);
        }
        fileId = null;
      } else {
        const updatedData = await updateRes.json();
        return {
          success: true,
          fileId: updatedData.id || fileId,
          modifiedTime: updatedData.modifiedTime,
          syncedCount: atendimentos.length,
        };
      }
    }

    // Create new file via multipart upload
    const metadata = {
      name: DRIVE_FILENAME,
      mimeType: 'application/json',
      description: 'Backup de atendimentos de enfermagem (BPA)',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!createRes.ok) {
      const authError = classifyDriveHttpError(createRes.status);
      if (authError) {
        return {
          success: false,
          syncedCount: 0,
          authError,
          error:
            authError === 'expired'
              ? 'Sessão do Google Drive expirada. Reconecte sua conta.'
              : 'Permissão de acesso ao Google Drive não concedida.',
        };
      }
      throw new Error(`Create failed with HTTP ${createRes.status}`);
    }

    const createdData = await createRes.json();
    return {
      success: true,
      fileId: createdData.id,
      modifiedTime: createdData.modifiedTime,
      syncedCount: atendimentos.length,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Failed to sync to Google Drive:', err);
    return {
      success: false,
      syncedCount: 0,
      error: errorMsg,
    };
  }
}

/**
 * Downloads attendance data from Google Drive file if it exists
 */
export async function downloadFromGoogleDrive(
  accessToken: string
): Promise<DriveDownloadResult> {
  try {
    const searchResult = await findDriveFile(accessToken);
    if (searchResult.authError) {
      return {
        found: false,
        atendimentos: [],
        authError: searchResult.authError,
        error:
          searchResult.authError === 'expired'
            ? 'Sessão do Google Drive expirada. Reconecte sua conta.'
            : 'Permissão de acesso ao Google Drive não concedida.',
      };
    }

    if (!searchResult.file) {
      return {
        found: false,
        atendimentos: [],
      };
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${searchResult.file.id}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const authError = classifyDriveHttpError(res.status);
      if (authError) {
        return {
          found: true,
          fileInfo: searchResult.file,
          atendimentos: [],
          authError,
          error:
            authError === 'expired'
              ? 'Sessão do Google Drive expirada. Reconecte sua conta.'
              : 'Permissão de acesso ao Google Drive não concedida.',
        };
      }
      throw new Error(`Failed to download Drive file: ${res.status}`);
    }

    const data = await res.json();
    return {
      found: true,
      fileInfo: searchResult.file,
      atendimentos: Array.isArray(data?.atendimentos) ? data.atendimentos : [],
      procedimentosFrequentes: Array.isArray(data?.procedimentosFrequentes)
        ? data.procedimentosFrequentes
        : [],
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error downloading from Drive:', err);
    return {
      found: false,
      atendimentos: [],
      error: errorMsg,
    };
  }
}
