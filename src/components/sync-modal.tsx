import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  connect,
  sync,
  disconnect,
  isConfigured,
  isConnected,
  lastSync,
  getLinkUrl,
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
  'no-passphrase': 'No sync key on this device yet.',
  auth: 'Google sign-in was cancelled or failed.',
  'bad-passphrase':
    'This device’s key doesn’t match the journal in your Drive.',
  'needs-pairing':
    'This Google account already has an Almond journal — link this device instead (below).',
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
  const [busy, setBusy] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [needsPairing, setNeedsPairing] = useState(false);

  const configured = isConfigured();
  const connected = isConnected();
  const last = lastSync();

  useEffect(() => {
    if (!showLink) return;
    const url = getLinkUrl();
    if (!url) return;
    QRCode.toDataURL(url, { width: 220, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [showLink]);

  const run = async (action: () => Promise<SyncResult>, okMsg: string) => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) {
      toast.success(okMsg);
      await onAfterSync();
    } else {
      if (result.reason === 'needs-pairing') setNeedsPairing(true);
      toast.error(REASON[result.reason ?? 'error']);
    }
  };

  const copyLink = async () => {
    const url = getLinkUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied — open it on your other device');
    } catch {
      toast.error('Couldn’t copy the link');
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setShowLink(false);
          setNeedsPairing(false);
        }
        onClose();
      }}
    >
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
          showLink ? (
            <div className='space-y-3 text-center'>
              <p className='text-sm text-gray-600'>
                On your other device, scan this with the camera (or open the
                copied link). Show it only to your own device.
              </p>
              {qr ? (
                <img
                  src={qr}
                  alt='Device pairing QR code'
                  className='mx-auto rounded-lg'
                  width={220}
                  height={220}
                />
              ) : (
                <p className='text-sm text-gray-400'>Generating…</p>
              )}
              <div className='flex gap-2 justify-center'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='cursor-pointer'
                  onClick={copyLink}
                >
                  Copy link
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  className='cursor-pointer'
                  onClick={() => setShowLink(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <p className='text-sm text-gray-600'>
                Connected
                {last
                  ? ` · synced ${formatDistanceToNow(last, { addSuffix: true })}`
                  : ''}
                .
              </p>
              <div className='flex flex-wrap gap-2'>
                <Button
                  onClick={() => run(() => sync(true), 'Synced')}
                  disabled={busy}
                  className='cursor-pointer bg-gray-700 hover:bg-gray-600'
                >
                  {busy ? 'Syncing…' : 'Sync now'}
                </Button>
                <Button
                  variant='outline'
                  className='cursor-pointer'
                  onClick={() => setShowLink(true)}
                >
                  Link a device
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
          )
        ) : (
          <div className='space-y-3'>
            <Button
              onClick={() => run(() => connect(), 'Connected & synced')}
              disabled={busy}
              className='cursor-pointer bg-gray-700 hover:bg-gray-600 w-full'
            >
              {busy ? 'Connecting…' : 'Connect Google Drive'}
            </Button>
            <p
              className={`text-sm rounded-lg p-3 ${
                needsPairing
                  ? 'text-amber-800 bg-amber-50 border border-amber-200'
                  : 'text-gray-500'
              }`}
            >
              Already using Almond on another device? Open it there →{' '}
              <strong>Sync → Link a device</strong>, then scan that QR with this
              device’s camera.
            </p>
          </div>
        )}

        <div className='border-t border-gray-200 pt-3 mt-1'>
          <p className='text-xs text-gray-500 mb-2'>
            Backup &amp; restore (advanced)
          </p>
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
