import { useState } from 'react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { SyncModal } from '@/components/sync-modal';
import { ExportModal } from '@/components/export-modal';
import { ImportModal } from '@/components/import-modal';
import { exportData, importData, selectImportFile } from '@/utils/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useDriveAutoSync } from '@/hooks/use-drive-auto-sync';
import { SyncUIContext } from '@/lib/sync-ui';

export function RootLayout() {
  // Pull remote changes on app open / focus / reconnect so other devices don't
  // show stale data (a no-op until Google Drive is connected).
  useDriveAutoSync();

  // Sync is app-global (not per-board), so it lives here in the layout.
  const [syncOpen, setSyncOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // On the mobile board the bottom is owned by the composer, so the floating
  // Sync button is hidden there and offered from the board's ⋯ menu instead.
  const isMobile = useIsMobile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showFloatingSync = !(isMobile && pathname.startsWith('/boards/'));

  const handleExport = async (password: string) => {
    const result = await exportData(password);
    toast(result.message);
    setExportOpen(false);
  };

  const handleImport = async (password: string) => {
    if (!file) return;
    const result = await importData(file, password);
    if (result.success) {
      toast.success(result.message);
      setImportOpen(false);
      window.location.reload(); // reflect restored data everywhere
    } else {
      toast.error(result.message);
    }
  };

  return (
    <>
      {/* Thin "notebook spine" accent — keeps personality without crowding text */}
      <div className='fixed inset-y-0 left-0 z-20 w-2 sm:w-3 bg-amber-200 pointer-events-none' />
      <SyncUIContext.Provider value={() => setSyncOpen(true)}>
        <Outlet />
      </SyncUIContext.Provider>

      {showFloatingSync && (
        <Button
          variant='ghost'
          className='fixed right-2 bottom-2 cursor-pointer text-gray-500'
          onClick={() => setSyncOpen(true)}
        >
          Sync
        </Button>
      )}

      <SyncModal
        isOpen={syncOpen}
        onClose={() => setSyncOpen(false)}
        onAfterSync={() => window.location.reload()}
        onExport={() => {
          setSyncOpen(false);
          setExportOpen(true);
        }}
        onImport={async () => {
          setSyncOpen(false);
          const f = await selectImportFile();
          if (f) {
            setFile(f);
            setImportOpen(true);
          }
        }}
      />
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={handleExport}
      />
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        file={file}
        onConfirm={handleImport}
      />

      <Toaster />
    </>
  );
}
