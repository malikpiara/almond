import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { generatePassphrase } from '@/utils/utils';
import {
  connect,
  sync,
  disconnect,
  isConfigured,
  isConnected,
  lastSync,
  type SyncResult,
} from '@/lib/drive';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAfterSync: () => void | Promise<void>;
  onExport: () => void;
  onImport: () => void;
}

const REASON: Record<NonNullable<SyncResult['reason']>, string> = {
  'not-configured': 'Sync isn’t set up in this build yet.',
  'no-passphrase': 'Enter a passphrase first.',
  auth: 'Google sign-in was cancelled or failed.',
  'bad-passphrase':
    'That passphrase doesn’t match the journal already in your Drive.',
  'forward-compat':
    'Your Drive copy was written by a newer Almond — please update Almond.',
  error: 'Sync failed. Check your connection and try again.',
};

export function SyncModal({
  isOpen,
  onClose,
  onAfterSync,
  onExport,
  onImport,
}: SyncModalProps) {
  const [passphrase, setPassphrase] = useState(() => generatePassphrase());
  const [busy, setBusy] = useState(false);

  const configured = isConfigured();
  const connected = isConnected();
  const last = lastSync();

  const run = async (action: () => Promise<SyncResult>, okMsg: string) => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      toast.success(okMsg);
      await onAfterSync();
    } else {
      toast.error(REASON[result.reason ?? 'error']);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Sync across devices</DialogTitle>
          <DialogDescription>
            Your journal syncs to your own Google Drive, end-to-end encrypted —
            neither we nor Google can read it.
          </DialogDescription>
        </DialogHeader>

        {!configured ? (
          <p className='text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3'>
            Drive sync isn’t configured in this build yet.
          </p>
        ) : connected ? (
          <div className='space-y-4'>
            <p className='text-sm text-gray-600'>
              Connected
              {last
                ? ` · last synced ${formatDistanceToNow(last, {
                    addSuffix: true,
                  })}`
                : ''}
              .
            </p>
            <div className='flex gap-2'>
              <Button
                onClick={() => run(() => sync(true), 'Synced')}
                disabled={busy}
                className='cursor-pointer bg-gray-700 hover:bg-gray-600'
              >
                {busy ? 'Syncing…' : 'Sync now'}
              </Button>
              <Button
                variant='ghost'
                className='cursor-pointer'
                onClick={() => {
                  disconnect();
                  toast('Disconnected from Google Drive');
                  onClose();
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className='space-y-3'>
            <p className='text-sm text-gray-600'>
              Pick a passphrase and use the <strong>same one</strong> on every
              device. No one can recover it — not even us.
            </p>
            <Input
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className='font-mono'
              placeholder='calm-ocean'
            />
            <Button
              onClick={() => run(() => connect(passphrase.trim()), 'Connected & synced')}
              disabled={busy || passphrase.trim().length < 5}
              className='cursor-pointer bg-gray-700 hover:bg-gray-600 w-full'
            >
              {busy ? 'Connecting…' : 'Connect Google Drive'}
            </Button>
          </div>
        )}

        <div className='border-t border-gray-200 pt-3 mt-1'>
          <p className='text-xs text-gray-500 mb-2'>Backup &amp; restore (advanced)</p>
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              size='sm'
              className='cursor-pointer'
              onClick={onExport}
            >
              Download backup
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='cursor-pointer'
              onClick={onImport}
            >
              Restore from file
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
