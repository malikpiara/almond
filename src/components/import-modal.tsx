import { useState } from 'react';
import { FileText } from 'lucide-react';
import { ResponsiveDialog } from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onConfirm: (password: string) => void;
}

export function ImportModal({
  isOpen,
  onClose,
  file,
  onConfirm,
}: ImportModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    await onConfirm(passphrase);
    setIsImporting(false);
    // Don't clear passphrase — let them retry if wrong
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title='Restore from a backup'
      description='Enter the passphrase you saved when creating this backup. Your journal will be restored to this device.'
    >
      <div className='space-y-4'>
        {file && (
          <Card className='p-3 bg-gray-50'>
            <div className='flex items-center gap-2 text-sm text-gray-600'>
              <FileText className='h-4 w-4' />
              <span className='font-medium'>{file.name}</span>
            </div>
          </Card>
        )}

        <div className='space-y-2'>
          <label
            htmlFor='passphrase'
            className='text-sm font-medium text-gray-700'
          >
            Enter your passphrase:
          </label>
          <Input
            id='passphrase'
            type='text'
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder='calm-ocean'
            className='font-mono h-11'
            autoFocus
          />
        </div>

        <div className='rounded-lg bg-blue-50 border border-blue-200 p-3'>
          <p className='text-sm text-blue-800'>
            💭 This will replace any existing entries. Export your current
            journal first if you need to keep it.
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
            onClick={handleImport}
            disabled={!passphrase || isImporting}
            className='cursor-pointer bg-gray-700 hover:bg-gray-600'
          >
            {isImporting ? 'Restoring…' : 'Restore journal'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
