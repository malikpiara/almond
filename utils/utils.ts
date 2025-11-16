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

export function ExportData() {
  // 1. Get data from localStorage
  const data = localStorage.getItem('user-data');

  if (!data) {
    return {
      success: false,
      message:
        'It seems like there is no data to export yet. Did you mean to import data instead?',
    };
  }

  // 2. Create a Blob (a file-like object)
  const blob = new Blob([data], { type: 'application/json' });

  // 3. Create a download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `almond-backup-${Date.now()}.json`; // Filename with timestamp

  // 4. Click it programmatically
  document.body.appendChild(link);
  link.click();

  // 5. Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, message: 'Data exported successfully!' };
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
