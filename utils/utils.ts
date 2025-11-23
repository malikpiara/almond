import {
  uniqueNamesGenerator,
  adjectives,
  colors,
} from 'unique-names-generator';

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
  // 1. Get data from localStorage
  const data = localStorage.getItem('user-data');

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
  } catch (error) {
    return { success: false, message: 'Error encrypting data' };
  }
}

// Encryption helpers using Web Crypto API
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(data: string, password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(data)
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(
    salt.length + iv.length + encrypted.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(
  encryptedData: string,
  password: string
): Promise<string> {
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

  const salt = new Uint8Array(combined.slice(0, 16));
  const iv = new Uint8Array(combined.slice(16, 28));
  const data = new Uint8Array(combined.slice(28));

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
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
    const data = JSON.parse(decryptedData);

    // Validate structure
    if (!data.boards || !data.entries) {
      return {
        success: false,
        message: "This doesn't appear to be a valid backup file.",
      };
    }

    // Save to localStorage
    localStorage.setItem('user-data', JSON.stringify(data));

    return { success: true, message: 'Your journal has been restored!' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
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
