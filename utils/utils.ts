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

export async function ExportData() {
  // 1. Get data from localStorage
  const data = localStorage.getItem('user-data');

  if (!data) {
    return {
      success: false,
      message:
        'It seems like there is no data to export yet. Did you mean to import data instead?',
    };
  }

  // Prompt for password
  const suggested = generatePassphrase();
  const password = prompt(
    `Pick a passphrase to keep your stories safe.\n\nSuggested: ${suggested}`
  );
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
    link.download = `backup-${Date.now()}.almond`; // Filename with timestamp

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

export function ImportData() {
  const fileWidget = document.createElement('input');
  fileWidget.type = 'file';
  fileWidget.accept = '.json'; // Only allow JSON files

  // Listen for when user selects a file
  fileWidget.onchange = async (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      return { success: false, message: 'No file selected' };
    }

    try {
      // Read the file content
      const text = await file.text();

      // Parse and validate the JSON
      const data = JSON.parse(text);

      // Basic validation - check if it has the right structure
      if (!data.boards || !data.entries) {
        return { success: false, message: 'Invalid file format' };
      }

      // Save to localStorage
      localStorage.setItem('user-data', JSON.stringify(data));

      // Refresh the page to load the new data
      window.location.reload();

      return { success: true, message: 'Data imported successfully!' };
    } catch (error) {
      return {
        success: false,
        message: "Error reading file. Make sure it's a valid JSON file.",
      };
    }
  };

  document.body.appendChild(fileWidget);
  fileWidget.click();
  document.body.removeChild(fileWidget);
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
      salt: salt,
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
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
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

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
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
