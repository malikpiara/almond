import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { applyPairingKey, sync } from '@/lib/drive';

// TEMP (spike): paste the pairing link from another device to load your journal
// onto this native device. Replaces the QR-camera flow until native deep-link
// pairing is wired. Remove before ship.
export function PairLink() {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);

  const pair = async () => {
    const match = link.match(/[#&]k=([^&]+)/);
    if (!match) {
      toast.error('Paste the full link — it should contain “#k=…”.');
      return;
    }
    const key = decodeURIComponent(match[1]);
    setBusy(true);
    applyPairingKey(key);
    const result = await sync(true);
    setBusy(false);
    if (result.ok) {
      toast.success('Paired — loading your journal…');
      window.location.reload();
    } else {
      toast.error(`Pairing failed: ${result.reason ?? 'error'}`);
    }
  };

  return (
    <section className='rounded-xl border border-gray-200 bg-white p-4'>
      <p className='font-medium text-gray-800'>Load your journal</p>
      <p className='mb-3 text-sm text-muted-foreground'>
        On another device: Sync → Link a device → Copy link, then paste it here.
      </p>
      <div className='flex gap-2'>
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder='Paste pairing link'
          className='flex-1'
        />
        <Button onClick={pair} disabled={busy || !link} className='cursor-pointer'>
          {busy ? 'Pairing…' : 'Pair'}
        </Button>
      </div>
    </section>
  );
}
