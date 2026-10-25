import { Atendimento } from '../types';

export const DRIVE_FILENAME = 'atendimentos_bpa_drive.json';

export interface DriveSyncResult {
  success: boolean;
  fileId?: string;
  syncedCount: number;
  error?: string;
}

/**
 * Searches for existing BPA backup file in the user's Google Drive
 */
export async function findDriveFile(accessToken: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`name = '${DRIVE_FILENAME}' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Drive search failed with status ${res.status}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (err) {
    console.error('Error finding file on Drive:', err);
    throw err;
  }
}

/**
 * Synchronizes the list of attendances to Google Drive file
 */
export async function syncToGoogleDrive(
  accessToken: string,
  atendimentos: Atendimento[],
  procedimentosFrequentes: string[]
): Promise<DriveSyncResult> {
  try {
    let fileId = await findDriveFile(accessToken);

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
      // Update existing file
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
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
        throw new Error(`Update failed with HTTP ${updateRes.status}`);
      }

      return {
        success: true,
        fileId,
        syncedCount: atendimentos.length,
      };
    } else {
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
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
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
        throw new Error(`Create failed with HTTP ${createRes.status}`);
      }

      const createdData = await createRes.json();
      return {
        success: true,
        fileId: createdData.id,
        syncedCount: atendimentos.length,
      };
    }
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
): Promise<{ atendimentos: Atendimento[]; procedimentosFrequentes?: string[] } | null> {
  try {
    const fileId = await findDriveFile(accessToken);
    if (!fileId) return null;

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download Drive file: ${res.status}`);
    }

    const data = await res.json();
    return {
      atendimentos: data.atendimentos || [],
      procedimentosFrequentes: data.procedimentosFrequentes || [],
    };
  } catch (err) {
    console.error('Error downloading from Drive:', err);
    return null;
  }
}
