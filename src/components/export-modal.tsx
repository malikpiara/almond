import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ResponsiveDialog } from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generatePassphrase } from '@/utils/utils';
import { toast } from 'sonner';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
}

export function ExportModal({ isOpen, onClose, onConfirm }: ExportModalProps) {
  const [passphrase] = useState(() => generatePassphrase());
  const [copied, setCopied] = useState(false);

  const handleCopyPassphrase = async () => {
    try {
      await navigator.clipboard.writeText(passphrase);
      setCopied(true);
      toast.success('Passphrase copied — keep it somewhere safe');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy passphrase');
    }
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title='Create a private backup'
      description="Your entries never leave your device — we can’t read them and neither can anyone else. Create an encrypted backup to move your journal or keep it safe."
    >
      <div className='space-y-4'>
        <Card className='p-3 bg-gray-50'>
          <div className='space-y-2'>
            <p className='text-sm text-gray-600 font-medium'>Your passphrase:</p>
            <div className='flex items-center justify-between gap-2'>
              <code className='text-lg font-mono font-semibold text-gray-800 select-all'>
                {passphrase}
              </code>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                onClick={handleCopyPassphrase}
                className='shrink-0 cursor-pointer'
              >
                {copied ? (
                  <Check className='h-4 w-4 text-green-600' />
                ) : (
                  <Copy className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>
        </Card>

        <div className='rounded-lg bg-amber-50 border border-amber-200 p-3'>
          <p className='text-sm text-amber-800'>
            🍃 No one can recover this passphrase — not even us. That’s what
            keeps your thoughts truly private.
          </p>
        </div>

        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='ghost'
            className='cursor-pointer'
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type='button'
            onClick={() => onConfirm(passphrase)}
            className='cursor-pointer bg-gray-700 hover:bg-gray-600'
          >
            Download backup
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
