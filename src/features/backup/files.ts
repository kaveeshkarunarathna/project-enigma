import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { backupFileName, type Backup } from '@/domain/backup';

/**
 * Hands a backup to the reader as a file. On the phone it goes through the
 * share sheet (Files, Drive, email to themselves, AirDrop); on the web it
 * downloads. The app never sends it anywhere on its own.
 * Returns true once the file was handed over. (The share sheet does not say
 * whether the reader saved it, so this cannot.)
 */
export async function shareBackup(backup: Backup): Promise<boolean> {
  const text = JSON.stringify(backup);
  const name = backupFileName(new Date(backup.exportedAt));

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(text);
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Keep your Night Atlas backup',
    });
    return true;
  } finally {
    // The reader's copy lives wherever they put it; this one is only a hand-off.
    setTimeout(() => {
      try {
        if (file.exists) file.delete();
      } catch {
        // the system clears the cache anyway
      }
    }, 60_000);
  }
}

/** Lets the reader pick a backup file. Returns its text, or null if they cancel. */
export async function pickBackupText(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.file) return asset.file.text();
  const file = new File(asset.uri);
  try {
    return await file.text();
  } finally {
    try {
      if (file.exists) file.delete();
    } catch {
      // only the picker's cached copy; the reader's file is untouched
    }
  }
}
