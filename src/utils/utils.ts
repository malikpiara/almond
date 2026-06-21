import { isToday, isYesterday, isThisYear, format } from 'date-fns';
import { store } from '@/lib/store';
import { encryptData, decryptData } from '@/lib/crypto';
import { ForwardCompatError } from '@/lib/schema';

// Calendar-relative date for journal entries. People think about entries by
// the day they happened ("Yesterday", "3 March"), not elapsed time
// ("17 hours ago"), so we frame by calendar: Today / Yesterday / "3 March"
// (this year) / "3 March 2024" (older).
export function formatEntryDate(timestamp: number): string {
  const date = new Date(timestamp);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return isThisYear(date) ? format(date, 'd MMMM') : format(date, 'd MMMM yyyy');
}

export function generateShortId() {
  return Math.random().toString(36).substring(2, 15);
  // Result: something like "k3j5h2m9x4a"
}

export function generateEntryId() {
  return 'entry_' + generateShortId();
  // Result: something like "entry_k3j5h2m9x4a"
}

export function generateBoardId() {
  return 'board_' + generateShortId();
  // Result: something like "board_k3j5h2m9x4a"
}

export async function exportData(password: string) {
  // 1. Get data through the persistence seam
  const data = await store.exportRaw();

  if (!data) {
    return {
      success: false,
      message:
        'It seems like there is no data to export yet. Did you mean to import data instead?',
    };
  }

  if (!password) {
    return { success: false, message: 'Export cancelled - password required' };
  }

  if (password.length < 5) {
    return {
      success: false,
      message: 'Your Passphrase must be at least 5 characters',
    };
  }

  try {
    // Encrypt the data
    const encryptedData = await encryptData(data, password);

    // 2. Create a Blob (a file-like object)
    const blob = new Blob([encryptedData], {
      type: 'application/octet-stream',
    });

    // 3. Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const date = new Date();
    const month = date
      .toLocaleDateString('en-US', { month: 'short' })
      .toLowerCase();
    const day = date.getDate();
    const hour = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    const year = date.getFullYear();
    link.download = `backup-${month}-${day}-${year}-${hour}${min}.almond`;
    // Result: "backup-nov-17-2025-1520.almond"

    // 4. Click it programmatically
    document.body.appendChild(link);
    link.click();

    // 5. Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: 'Encrypted backup exported successfully!',
    };
  } catch {
    return { success: false, message: 'Error encrypting data' };
  }
}

// This one just returns the selected file
export function selectImportFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const fileWidget = document.createElement('input');
    fileWidget.type = 'file';
    fileWidget.accept = '.almond';

    fileWidget.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      resolve(file);
    };

    fileWidget.click();
  });
}

// This one handles the actual import with decryption
export async function importData(file: File, password: string) {
  try {
    const encryptedText = await file.text();
    const decryptedData = await decryptData(encryptedText, password);

    // store.importRaw migrates the versioned envelope (or legacy bare data) and
    // persists it; it throws ForwardCompatError if the backup is newer than us.
    await store.importRaw(decryptedData);

    return { success: true, message: 'Your journal has been restored!' };
  } catch (error: any) {
    if (error instanceof ForwardCompatError) {
      return { success: false, message: error.message };
    }
    if (error.name === 'OperationError') {
      return {
        success: false,
        message: "Hmm, that passphrase doesn't seem right. Please try again.",
      };
    }
    return {
      success: false,
      message:
        "We couldn't read this backup. Please check your file and passphrase.",
    };
  }
}

// Almond-style dictionary (soft, calm words)
const almondWords = [
  'calm',
  'quiet',
  'gentle',
  'soft',
  'still',
  'warm',
  'silver',
  'amber',
  'forest',
  'river',
  'ocean',
  'breeze',
  'dawn',
  'cloud',
  'stone',
  'moon',
  'willow',
];

export function generatePassphrase() {
  const word1 = almondWords[Math.floor(Math.random() * almondWords.length)];
  const word2 = almondWords[Math.floor(Math.random() * almondWords.length)];

  return `${word1}-${word2}`;
}
