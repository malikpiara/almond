'use client';

import { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
      toast.success('Passphrase copied - keep it somewhere safe');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy passphrase');
    }
  };

  const handleExport = () => {
    onConfirm(passphrase);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create a Private Backup</DialogTitle>
          <DialogDescription>
            Your entries never leave your device - we can&apos;t read them and
            neither can anyone else. Create an encrypted backup to move your
            journal to another device or keep it safe.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <Card className='p-4 bg-gray-50'>
            <div className='space-y-2'>
              <p className='text-sm text-gray-600 font-medium'>
                Your Passphrase:
              </p>
              <div className='flex items-center justify-between gap-2'>
                <code className='text-lg font-mono font-semibold text-gray-800 select-all'>
                  {passphrase}
                </code>
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  onClick={handleCopyPassphrase}
                  className='shrink-0'
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
              🍃 No one can recover this passphrase - not even us. That&apos;s
              what keeps your thoughts truly private.
            </p>
          </div>
        </div>

        <DialogFooter className='gap-2'>
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
            onClick={handleExport}
            className='cursor-pointer bg-gray-500 hover:bg-gray-600'
          >
            Download Backup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
